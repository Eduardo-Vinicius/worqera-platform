"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Camera, Loader2, MessageCircle, Trash2, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  getPedidoService,
  updateOrderService,
  uploadPedidoFotosService,
} from "@/lib/apiService"
import { listSectorsV1, reopenOrderV1, getShopCurrentV1, deleteOrderV1, purgeOrderV1 } from "@/lib/apiV1"
import { toast } from "sonner"
import { pairCount } from "@/lib/utils"
import { buildOrderWaFromShop, type ShopWaDoc } from "@/lib/orderWhatsApp"
import { ENABLE_WA_ME } from "@/lib/featureFlags"
import { resolveItemNoun } from "@/lib/itemNoun"

const TAG_LABEL: Record<string, string> = {
  qualidade: "Qualidade",
  acabamento: "Acabamento",
  prazo: "Prazo",
  atendimento: "Atendimento",
}

type SectorOpt = { id: string; name: string; slug?: string; isTerminal?: boolean }

function formatDate(value?: string | null) {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function statusLabel(status?: string) {
  switch (status) {
    case "delivered":
      return "Finalizado"
    case "ready":
      return "Pronto"
    case "in_progress":
      return "Em andamento"
    case "open":
      return "Aberto"
    case "cancelled":
      return "Cancelado"
    default:
      return status || "—"
  }
}

function photoUrls(order: any): string[] {
  const fromItems = Array.isArray(order?.items)
    ? order.items.flatMap((it: any) =>
        Array.isArray(it.photos)
          ? it.photos.map((p: any) => (typeof p === "string" ? p : p?.url)).filter(Boolean)
          : []
      )
    : []
  const top = Array.isArray(order?.photos || order?.fotos)
    ? (order.photos || order.fotos).map((p: any) => (typeof p === "string" ? p : p?.url)).filter(Boolean)
    : []
  return [...top, ...fromItems].filter(Boolean)
}

export function PedidoConsultaDetalhe({
  orderId,
  open,
  onClose,
  onReopened,
  onSaved,
  onDeleted,
  allowDelete = true,
}: {
  orderId: string | null
  open: boolean
  onClose: () => void
  onReopened?: (order: any) => void
  onSaved?: (order: any) => void
  onDeleted?: () => void
  /** Soft-delete / purge controls (hide on consultas se quiser só leitura) */
  allowDelete?: boolean
}) {
  const [order, setOrder] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [sectors, setSectors] = useState<SectorOpt[]>([])
  const [sectorId, setSectorId] = useState("")
  const [reopening, setReopening] = useState(false)
  const [delivering, setDelivering] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [canPurge, setCanPurge] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [clientName, setClientName] = useState("")
  const [clientPhone, setClientPhone] = useState("")
  const [shoeModel, setShoeModel] = useState("")
  const [notes, setNotes] = useState("")
  const [total, setTotal] = useState("")
  const [deposit, setDeposit] = useState("")
  const [shopDoc, setShopDoc] = useState<ShopWaDoc | null>(null)
  const [itemSingular, setItemSingular] = useState("peça")

  const syncForm = (fresh: any) => {
    setOrder(fresh)
    setClientName(fresh?.clientName || fresh?.client?.name || "")
    setClientPhone(fresh?.clientPhone || fresh?.client?.phone || "")
    setShoeModel(fresh?.shoeModel || fresh?.modeloTenis || "")
    setNotes(fresh?.notes || fresh?.observacoes || "")
    setTotal(String(fresh?.pricing?.total ?? fresh?.precoTotal ?? ""))
    setDeposit(String(fresh?.pricing?.deposit ?? ""))
  }

  useEffect(() => {
    if (!open) return
    const role = String(localStorage.getItem("role") || "").toLowerCase()
    setCanPurge(role === "owner" || role === "admin")
    ;(async () => {
      try {
        const shop = await getShopCurrentV1()
        const doc = (shop?.shop || shop) as ShopWaDoc & {
          vertical?: string
          branding?: { itemLabel?: string; itemLabelPlural?: string }
        }
        setShopDoc(doc)
        setItemSingular(resolveItemNoun(doc).singular)
      } catch {
        setShopDoc(null)
      }
    })()
  }, [open])

  useEffect(() => {
    if (!open || !orderId) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const [fresh, sec] = await Promise.all([getPedidoService(orderId), listSectorsV1()])
        if (cancelled) return
        syncForm(fresh)
        const list = (sec.sectors || []).map((s: any) => ({
          id: String(s._id || s.id),
          name: s.name || "Setor",
          slug: s.slug,
          isTerminal: Boolean(s.isTerminal),
        }))
        setSectors(list)
        const current = String(fresh?.currentSectorId || "")
        const firstActive = list.find((s) => s.id === current) || list.find((s) => !s.isTerminal) || list[0]
        setSectorId(firstActive?.id || "")
      } catch (err: any) {
        toast.error(err?.message || "Erro ao carregar pedido")
        setOrder(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, orderId])

  if (!open) return null

  const delivered = order?.status === "delivered"
  const ready = order?.status === "ready"
  const canReopen = delivered || ready
  const code = order?.code || order?.codigo || "…"
  const history = Array.isArray(order?.setoresHistorico)
    ? order.setoresHistorico
    : Array.isArray(order?.sectorHistory)
      ? order.sectorHistory
      : []
  const photos = photoUrls(order)

  const reopen = async () => {
    if (!orderId || !sectorId) {
      toast.error("Escolha o setor atual do pedido")
      return
    }
    setReopening(true)
    try {
      const updated = await reopenOrderV1(orderId, {
        sectorId,
        status: "in_progress",
        note: "reaberto — retorno / retrabalho",
      })
      toast.success("Pedido reaberto no kanban — mesmo código")
      syncForm(updated)
      onReopened?.(updated)
    } catch (err: any) {
      toast.error(err?.message || "Falha ao reabrir")
    } finally {
      setReopening(false)
    }
  }

  const markDelivered = async () => {
    if (!orderId) return
    setDelivering(true)
    try {
      const updated = await updateOrderService(orderId, {
        status: "delivered",
        deliveredAt: new Date().toISOString(),
      })
      toast.success("Pedido marcado como entregue")
      syncForm(updated)
      onSaved?.(updated)
    } catch (err: any) {
      toast.error(err?.message || "Falha ao marcar entregue")
    } finally {
      setDelivering(false)
    }
  }

  const save = async () => {
    if (!orderId) return
    setSaving(true)
    try {
      const totalN = Number(String(total).replace(",", ".")) || 0
      const depositN = Number(String(deposit).replace(",", ".")) || 0
      const updated = await updateOrderService(orderId, {
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim() || undefined,
        shoeModel: shoeModel.trim(),
        notes: notes.trim(),
        total: totalN,
        deposit: depositN,
        remaining: Math.max(0, totalN - depositN),
      })
      toast.success("Pedido atualizado")
      syncForm(updated)
      onSaved?.(updated)
    } catch (err: any) {
      toast.error(err?.message || "Falha ao salvar")
    } finally {
      setSaving(false)
    }
  }

  const onPickPhotos = async (files: FileList | null) => {
    if (!orderId || !files?.length) return
    setUploading(true)
    try {
      await uploadPedidoFotosService(orderId, Array.from(files))
      const fresh = await getPedidoService(orderId)
      syncForm(fresh)
      toast.success("Fotos enviadas")
      onSaved?.(fresh)
    } catch (err: any) {
      toast.error(err?.message || "Falha no upload")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-md flex-col bg-[var(--wq-surface)] text-[var(--wq-text)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--wq-border)] px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--wq-text-muted)]">Pedido</p>
            <p className="font-mono text-2xl font-semibold">#{code}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-[var(--wq-paper)]"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {loading || !order ? (
            <p className="text-sm text-[var(--wq-text-muted)]">Carregando…</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{statusLabel(order.status)}</Badge>
                {pairCount(order) > 1 && (
                  <Badge variant="secondary" className="font-mono text-xs">
                    {pairCount(order)} pares
                  </Badge>
                )}
                {order.feedback?.score ? (
                  <Badge className="rounded-full border-0 bg-[var(--wq-brand-soft)] text-[var(--wq-text)]">
                    Feedback {order.feedback.score}/5
                  </Badge>
                ) : null}
                <span className="text-xs text-[var(--wq-text-muted)]">
                  {formatDate(order.createdAt || order.dataCriacao)}
                </span>
              </div>

              {order.feedback?.score ? (
                <div className="rounded-xl border border-[var(--wq-border)] bg-[var(--wq-paper)] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--wq-text-muted)]">
                    Avaliação do cliente
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {order.feedback.score}/5
                    {Array.isArray(order.feedback.tags) && order.feedback.tags.length
                      ? ` · ${order.feedback.tags.map((t: string) => TAG_LABEL[t] || t).join(", ")}`
                      : ""}
                  </p>
                  {order.feedback.comment ? (
                    <p className="mt-1 text-sm text-[var(--wq-text-muted)]">
                      “{order.feedback.comment}”
                    </p>
                  ) : null}
                </div>
              ) : null}

              {ready && !delivered && (
                <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
                  <p className="text-sm font-semibold text-emerald-900">Pronto para retirada</p>
                  <p className="text-xs text-emerald-800/80">
                    Quando o cliente levar, marque como entregue.
                  </p>
                  {ENABLE_WA_ME ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-[10px] border-emerald-600 text-emerald-800 hover:bg-emerald-100"
                    onClick={() => {
                      const built = buildOrderWaFromShop({
                        shop: shopDoc,
                        phone: clientPhone || order?.clientPhone,
                        code: String(code),
                        clientName: clientName || order?.clientName || "",
                        templateKey: "ready",
                      })
                      if (!built?.url) {
                        toast.error(
                          shopDoc?.notifications?.whatsapp?.enabled
                            ? "Cliente sem telefone"
                            : "Ative WhatsApp em Empresa"
                        )
                        return
                      }
                      window.open(built.url, "_blank", "noopener,noreferrer")
                    }}
                  >
                    <MessageCircle className="mr-1.5 h-4 w-4" />
                    Avisar cliente (pronto)
                  </Button>
                  ) : null}
                  <Button
                    className="w-full rounded-[10px] bg-emerald-700 text-white hover:bg-emerald-800"
                    disabled={delivering}
                    onClick={markDelivered}
                  >
                    {delivering ? "Salvando…" : "Marcar como entregue"}
                  </Button>
                </div>
              )}

              {canReopen && (
                <div className="space-y-3 rounded-xl border border-[var(--wq-brand)]/30 bg-[var(--wq-brand-soft)]/40 p-4">
                  <div>
                    <p className="text-sm font-semibold">
                      {ready ? "Cliente voltou / retrabalho" : "Voltar ao kanban"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--wq-text-muted)]">
                      Reabre o <strong>mesmo pedido</strong> (mesmo código e histórico). Use quando o
                      serviço não ficou ok — não crie outro pedido.
                    </p>
                  </div>
                  <Select value={sectorId} onValueChange={setSectorId}>
                    <SelectTrigger className="rounded-[10px] bg-[var(--wq-surface)]">
                      <SelectValue placeholder="Setor atual" />
                    </SelectTrigger>
                    <SelectContent>
                      {sectors.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    className="w-full rounded-[10px] bg-[var(--wq-action)] hover:bg-[var(--wq-action)]/90"
                    disabled={reopening || !sectorId}
                    onClick={reopen}
                  >
                    {reopening ? "Reabrindo…" : "Reabrir no kanban"}
                  </Button>
                </div>
              )}

              <div className="space-y-3 rounded-xl border border-[var(--wq-border)] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--wq-text-muted)]">
                  Editar
                </p>
                <div className="space-y-1.5">
                  <Label className="text-xs">Cliente</Label>
                  <Input
                    className="rounded-[10px]"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Telefone</Label>
                  <Input
                    className="rounded-[10px]"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="(11) 9…"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Modelo / {itemSingular}</Label>
                  <Input
                    className="rounded-[10px]"
                    value={shoeModel}
                    onChange={(e) => setShoeModel(e.target.value)}
                    placeholder="Ex.: Nike Dunk Low"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Total (R$)</Label>
                    <Input
                      className="rounded-[10px]"
                      inputMode="decimal"
                      value={total}
                      onChange={(e) => setTotal(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Sinal (R$)</Label>
                    <Input
                      className="rounded-[10px]"
                      inputMode="decimal"
                      value={deposit}
                      onChange={(e) => setDeposit(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Observações</Label>
                  <Textarea
                    className="min-h-[72px] rounded-[10px]"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full rounded-[10px] bg-[var(--wq-brand)] text-white hover:bg-[var(--wq-brand-deep)]"
                  disabled={saving}
                  onClick={save}
                >
                  {saving ? "Salvando…" : "Salvar alterações"}
                </Button>
              </div>

              <div className="space-y-3 rounded-xl border border-[var(--wq-border)] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--wq-text-muted)]">
                    Fotos
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-[10px]"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                  >
                    {uploading ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Camera className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Adicionar
                  </Button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => onPickPhotos(e.target.files)}
                  />
                </div>
                {photos.length === 0 ? (
                  <p className="text-xs text-[var(--wq-text-muted)]">Nenhuma foto ainda.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((url, i) => (
                      <img
                        key={`${url}-${i}`}
                        src={url}
                        alt={`Foto ${i + 1}`}
                        className="h-20 w-full rounded-lg border border-[var(--wq-border)] object-cover"
                      />
                    ))}
                  </div>
                )}
              </div>

              {!delivered && (
                <Button asChild variant="outline" className="w-full rounded-[10px]">
                  <Link href="/kanban">Ver no kanban</Link>
                </Button>
              )}

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--wq-text-muted)]">
                  Histórico
                </p>
                <ul className="space-y-2 text-sm">
                  {history.length === 0 && (
                    <li className="text-[var(--wq-text-muted)]">Sem movimentos registrados.</li>
                  )}
                  {history
                    .slice()
                    .reverse()
                    .map((h: any, i: number) => {
                      const when = h.entradaEm || h.enteredAt
                      const label =
                        [h.action, h.note, h.movedByName].filter(Boolean).join(" · ") || "movimento"
                      return (
                        <li
                          key={i}
                          className="rounded-lg border border-[var(--wq-border)] px-3 py-2 text-xs"
                        >
                          <p className="font-medium text-[var(--wq-text)]">{label}</p>
                          <p className="text-[var(--wq-text-muted)]">{formatDate(when)}</p>
                        </li>
                      )
                    })}
                </ul>
              </div>

              {order.clientId && (
                <Button asChild variant="outline" size="sm" className="rounded-[10px]">
                  <Link href={`/clientes/${order.clientId}`}>Ficha do cliente</Link>
                </Button>
              )}

              {allowDelete ? (
                <div className="space-y-2 rounded-xl border border-[var(--wq-danger)]/25 bg-red-50/50 p-3">
                  {order.deletedAt ? (
                    canPurge ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full rounded-[10px] border-[var(--wq-danger)]/40 text-[var(--wq-danger)] hover:bg-red-100"
                        disabled={deleting}
                        onClick={async () => {
                          const ok = window.confirm(
                            `Apagar permanentemente o pedido #${code}?\nIsso não tem volta.`
                          )
                          if (!ok) return
                          setDeleting(true)
                          try {
                            await purgeOrderV1(String(order.id || orderId))
                            toast.success("Pedido apagado definitivamente")
                            onDeleted?.()
                            onClose()
                          } catch (err: any) {
                            toast.error(err?.message || "Falha ao apagar")
                          } finally {
                            setDeleting(false)
                          }
                        }}
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        {deleting ? "Apagando…" : "Excluir permanente"}
                      </Button>
                    ) : (
                      <p className="text-xs text-[var(--wq-text-muted)]">
                        Pedido na lixeira. Só owner/admin pode apagar de vez.
                      </p>
                    )
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full rounded-[10px] border-[var(--wq-danger)]/40 text-[var(--wq-danger)] hover:bg-red-100"
                      disabled={deleting}
                      onClick={async () => {
                        const ok = window.confirm(
                          `Excluir pedido #${code}?\nEle vai para a lixeira em Pedidos (dá para recuperar).`
                        )
                        if (!ok) return
                        setDeleting(true)
                        try {
                          await deleteOrderV1(String(order.id || orderId))
                          toast.success("Pedido movido para a lixeira")
                          onDeleted?.()
                          onClose()
                        } catch (err: any) {
                          toast.error(err?.message || "Falha ao excluir")
                        } finally {
                          setDeleting(false)
                        }
                      }}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      {deleting ? "Excluindo…" : "Excluir → lixeira"}
                    </Button>
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="border-t border-[var(--wq-border)] p-4">
          <Button variant="outline" className="w-full rounded-[10px]" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </aside>
    </div>
  )
}

export default PedidoConsultaDetalhe
