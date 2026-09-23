"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Loader2, Download, Package, Plus, RotateCcw, Search, Trash2 } from "lucide-react"
import { AppHeader } from "@/components/shell/AppHeader"
import { PedidoConsultaDetalhe } from "@/components/PedidoConsultaDetalhe"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { getPedidosConsultaService } from "@/lib/apiService"
import { createDemoOrderV1, deleteOrderV1, exportOrdersCsvV1, listSectorsV1, purgeOrderV1, restoreOrderV1 } from "@/lib/apiV1"
import { toast } from "sonner"
import { pairCount } from "@/lib/utils"

type StatusTab = "ativos" | "finalizados" | "todos" | "lixeira"

const STATUS_FILTER: Record<StatusTab, string | undefined> = {
  ativos: "open,in_progress,ready",
  finalizados: "delivered",
  todos: undefined,
  lixeira: undefined,
}

function looksLikeCode(term: string) {
  const t = term.trim()
  return /^\d{3,5}-\d{2}$/.test(t) || /^\d{3,5}$/.test(t) || /^0\d{3}$/.test(t)
}

function formatDate(value?: string) {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString("pt-BR")
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
    default:
      return status || ""
  }
}

function formatMoney(v?: number) {
  if (v == null || Number.isNaN(Number(v))) return "—"
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export default function PedidosPage() {
  const [q, setQ] = useState("")
  const [dataInicio, setDataInicio] = useState("")
  const [dataFim, setDataFim] = useState("")
  const [tab, setTab] = useState<StatusTab>("ativos")
  const [orders, setOrders] = useState<any[]>([])
  const [nextToken, setNextToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [sectorMeta, setSectorMeta] = useState<Record<string, { name: string; color: string }>>({})
  const [detailId, setDetailId] = useState<string | null>(null)
  const [demoBusy, setDemoBusy] = useState(false)
  const [exportBusy, setExportBusy] = useState(false)
  const [restoreBusyId, setRestoreBusyId] = useState<string | null>(null)
  const [purgeBusyId, setPurgeBusyId] = useState<string | null>(null)
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [canPurge, setCanPurge] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const role = String(localStorage.getItem("role") || "").toLowerCase()
    setIsOwner(role === "owner")
    setCanPurge(role === "owner" || role === "admin")
    try {
      const fromUrl = new URLSearchParams(window.location.search).get("q")?.trim()
      if (fromUrl) {
        setQ(fromUrl)
        setTab("todos")
      }
    } catch {}
  }, [])

  const createDemo = async () => {
    setDemoBusy(true)
    try {
      await createDemoOrderV1()
      toast.success("Pedido de exemplo criado")
      await runSearch({ tab: "ativos" })
    } catch (err: any) {
      toast.error(err?.message || "Falha ao criar exemplo")
    } finally {
      setDemoBusy(false)
    }
  }

  const exportCsv = async () => {
    setExportBusy(true)
    try {
      const blob = await exportOrdersCsvV1()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `worqera-pedidos-finalizados-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("CSV baixado")
    } catch (err: any) {
      toast.error(err?.message || "Falha ao exportar")
    } finally {
      setExportBusy(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await listSectorsV1()
        if (cancelled) return
        const next: Record<string, { name: string; color: string }> = {}
        for (const s of res.sectors || []) {
          const id = String((s as any)._id || (s as any).id || "")
          if (!id) continue
          next[id] = {
            name: (s as any).name || "Setor",
            color: (s as any).color || "#7C6CF0",
          }
        }
        setSectorMeta(next)
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const runSearch = useCallback(
    async (overrides?: { q?: string; tab?: StatusTab; append?: boolean; cursor?: string | null }) => {
      const append = Boolean(overrides?.append)
      if (append) setLoadingMore(true)
      else setLoading(true)
      try {
        const term = (overrides?.q ?? q).trim()
        const statusTab = overrides?.tab ?? tab
        const query: Record<string, any> = {
          limit: 40,
          dataInicio: dataInicio || undefined,
          dataFim: dataFim || undefined,
          status: statusTab === "lixeira" ? undefined : STATUS_FILTER[statusTab],
          deleted: statusTab === "lixeira" ? "1" : undefined,
          lastKey: overrides?.cursor || undefined,
        }
        if (term) {
          if (looksLikeCode(term)) query.codigo = term
          else query.q = term
        }
        const result: any = await getPedidosConsultaService(query, { forceRefresh: true })
        const raw = Array.isArray(result?.data) ? result.data : []
        setOrders((prev) => (append ? [...prev, ...raw] : raw))
        setNextToken(result?.nextToken || null)
      } catch (err: any) {
        toast.error(err?.message || "Erro ao buscar pedidos")
        if (!append) setOrders([])
        setNextToken(null)
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [q, tab, dataInicio, dataFim]
  )

  useEffect(() => {
    runSearch({ tab: "ativos" })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch({ q }), 320)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const setTabAndSearch = (next: StatusTab) => {
    setTab(next)
    runSearch({ tab: next })
  }

  return (
    <div className="-mx-2.5 -mt-3 sm:-mx-5 sm:-mt-5 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-6">
      <AppHeader
        title="Pedidos"
        subtitle="Ativos, finalizados, lixeira · mais recentes primeiro"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {isOwner ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-[10px]"
                disabled={exportBusy}
                onClick={exportCsv}
              >
                <Download className="mr-1.5 h-4 w-4" />
                <span className="hidden sm:inline">{exportBusy ? "Exportando…" : "Exportar CSV"}</span>
                <span className="sm:hidden">CSV</span>
              </Button>
            ) : null}
            <Button asChild className="rounded-[11px] bg-[var(--wq-action)] hover:bg-[var(--wq-action)]/90">
              <Link href="/pedidos/novo">
                <Plus className="mr-1.5 h-4 w-4" />
                Novo pedido
              </Link>
            </Button>
          </div>
        }
      />

      <div className="mx-auto w-full max-w-[1600px] space-y-4 px-2.5 sm:px-5 md:px-6 lg:px-8">
        <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(
            [
              ["ativos", "Ativos"],
              ["finalizados", "Finalizados"],
              ["todos", "Todos"],
              ["lixeira", "Lixeira"],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              type="button"
              size="sm"
              variant={tab === id ? "default" : "outline"}
              className={`h-10 shrink-0 rounded-[10px] ${
                tab === id
                  ? id === "lixeira"
                    ? "bg-rose-600 hover:bg-rose-600/90"
                    : "bg-[var(--wq-action)] hover:bg-[var(--wq-action)]/90"
                  : ""
              }`}
              onClick={() => setTabAndSearch(id)}
            >
              {id === "lixeira" ? <Trash2 className="mr-1.5 h-3.5 w-3.5" /> : null}
              {label}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-0 w-full flex-1 sm:min-w-[220px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--wq-text-muted)]" />
            <Input
              className="h-10 w-full rounded-[10px] pl-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="Código ou nome do cliente…"
            />
          </div>
          <Button
            onClick={() => runSearch()}
            disabled={loading}
            className="rounded-[10px] bg-[var(--wq-action)] hover:bg-[var(--wq-action)]/90"
          >
            {loading ? "…" : "Buscar"}
          </Button>
        </div>

        <div className="grid gap-3 rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-paper)]/50 p-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">De</Label>
            <Input
              type="date"
              className="rounded-[10px] bg-[var(--wq-surface)]"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Até</Label>
            <Input
              type="date"
              className="rounded-[10px] bg-[var(--wq-surface)]"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>
        </div>

        {loading && orders.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-[var(--wq-text-muted)]">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Carregando…
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--wq-border)] px-4 py-12 text-center sm:py-14">
            <Package className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p className="font-medium text-[var(--wq-text)]">
              {tab === "lixeira" ? "Lixeira vazia" : "Nenhum pedido neste filtro"}
            </p>
            <p className="mt-1 text-sm text-[var(--wq-text-muted)]">
              {tab === "lixeira"
                ? "Pedidos excluídos aparecem aqui. Recuperar ou apagar de vez."
                : "Crie o primeiro pedido ou gere um exemplo para conhecer o kanban."}
            </p>
            {tab === "lixeira" ? null : (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <Button asChild className="rounded-[10px] bg-[var(--wq-action)]">
                  <Link href="/pedidos/novo">Criar pedido</Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-[10px]"
                  disabled={demoBusy}
                  onClick={createDemo}
                >
                  {demoBusy ? "Criando…" : "Pedido de exemplo"}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
            <div className="border-b border-[var(--wq-border)] bg-[var(--wq-paper)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--wq-text-muted)]">
              {orders.length}
              {nextToken ? "+" : ""} pedidos ·{" "}
              {tab === "lixeira" ? "recuperar · apagar de vez" : "abrir · excluir → lixeira"}
            </div>
            <ul className="divide-y divide-[var(--wq-border)]">
              {orders.map((order) => {
                const id = String(order.id || order._id)
                const code = order.code || order.codigo || id
                const setor = order.currentSectorId || order.setorAtual
                const valor = order.pricing?.total ?? order.precoTotal ?? 0
                const created = formatDate(order.createdAt || order.dataCriacao)
                const deleted = formatDate(order.deletedAt)
                return (
                  <li key={id} className="flex flex-wrap items-center gap-2 px-4 py-3 hover:bg-[var(--wq-paper)]">
                    <button
                      type="button"
                      onClick={() => setDetailId(id)}
                      className="flex min-w-0 flex-1 flex-wrap items-center gap-3 text-left"
                    >
                      {setor && sectorMeta[String(setor)] && (
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: sectorMeta[String(setor)]?.color || "#94a3b8" }}
                          title={sectorMeta[String(setor)]?.name}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-lg font-semibold tracking-tight">#{code}</span>
                          {pairCount(order) > 1 && (
                            <Badge variant="secondary" className="font-mono text-xs">
                              {pairCount(order)} pares
                            </Badge>
                          )}
                          {order.status && (
                            <Badge variant="outline">{statusLabel(order.status)}</Badge>
                          )}
                          {tab === "lixeira" && deleted ? (
                            <Badge variant="secondary" className="text-xs">
                              Excluído {deleted}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="truncate text-sm text-[var(--wq-text-muted)]">
                          {[
                            order.clientName || order.client?.name,
                            order.shoeModel || order.modeloTenis,
                            created,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <p className="text-sm font-semibold">{formatMoney(Number(valor))}</p>
                    </button>
                    {tab === "lixeira" ? (
                      <div className="flex flex-wrap gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-[10px]"
                          disabled={restoreBusyId === id || purgeBusyId === id}
                          onClick={async () => {
                            setRestoreBusyId(id)
                            try {
                              await restoreOrderV1(id)
                              toast.success(`Pedido #${code} recuperado`)
                              await runSearch({ tab: "lixeira" })
                            } catch (err: any) {
                              toast.error(err?.message || "Falha ao recuperar")
                            } finally {
                              setRestoreBusyId(null)
                            }
                          }}
                        >
                          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                          {restoreBusyId === id ? "…" : "Recuperar"}
                        </Button>
                        {canPurge ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-[10px] border-[var(--wq-danger)]/40 text-[var(--wq-danger)]"
                            disabled={purgeBusyId === id || restoreBusyId === id}
                            onClick={async () => {
                              const ok = window.confirm(
                                `Apagar permanentemente #${code}?\nIsso não tem volta.`
                              )
                              if (!ok) return
                              setPurgeBusyId(id)
                              try {
                                await purgeOrderV1(id)
                                toast.success(`Pedido #${code} apagado`)
                                await runSearch({ tab: "lixeira" })
                              } catch (err: any) {
                                toast.error(err?.message || "Falha ao apagar")
                              } finally {
                                setPurgeBusyId(null)
                              }
                            }}
                          >
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                            {purgeBusyId === id ? "…" : "Apagar"}
                          </Button>
                        ) : null}
                      </div>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-[10px] text-[var(--wq-text-muted)]"
                        disabled={deleteBusyId === id}
                        onClick={async () => {
                          const ok = window.confirm(
                            `Excluir #${code}?\nVai para a lixeira (dá para recuperar).`
                          )
                          if (!ok) return
                          setDeleteBusyId(id)
                          try {
                            await deleteOrderV1(id)
                            toast.success(`Pedido #${code} na lixeira`)
                            await runSearch()
                          } catch (err: any) {
                            toast.error(err?.message || "Falha ao excluir")
                          } finally {
                            setDeleteBusyId(null)
                          }
                        }}
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        {deleteBusyId === id ? "…" : "Excluir"}
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
            {nextToken && (
              <div className="border-t border-[var(--wq-border)] p-3 text-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-[10px]"
                  disabled={loadingMore}
                  onClick={() => runSearch({ append: true, cursor: nextToken })}
                >
                  {loadingMore ? "Carregando…" : "Carregar mais"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <PedidoConsultaDetalhe
        orderId={detailId}
        open={Boolean(detailId)}
        onClose={() => setDetailId(null)}
        onSaved={() => runSearch()}
        onDeleted={() => runSearch()}
        onReopened={() => {
          runSearch({ tab: "ativos" })
          setTab("ativos")
          toast.message("Reaberto — edite fotos e valores no painel, ou veja no kanban")
        }}
      />
    </div>
  )
}
