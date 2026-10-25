"use client"

import { Fragment, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Download, Loader2, Plus, Search, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { AppHeader } from "@/components/shell/AppHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  adjustProductV1,
  createProductV1,
  deleteProductV1,
  productReportCsvV1,
  enterPlatformShop,
  listPlatformShopsV1,
  listProductsV1,
  meV1,
  productMovementsV1,
} from "@/lib/apiV1"

type Variant = { id?: string; name: string; price: number | null; available?: number; onHand: number }
type Product = {
  id: string
  name: string
  sku?: string
  description?: string
  price: number
  trackStock?: boolean
  minQty?: number
  available?: number
  onHand?: number
  reserved?: number
  low?: boolean
  variants?: Variant[]
}
type DraftVariant = { name: string; onHand: string; price: string }

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0)

const moveLabel: Record<string, string> = {
  adjust: "Ajuste",
  reserve: "Reserva",
  release: "Devolução",
  commit: "Saída",
  reopen: "Reabertura",
}

const emptyDraft = () => ({
  name: "",
  price: "",
  sku: "",
  description: "",
  trackStock: true,
  onHand: "0",
  minQty: "0",
  variants: [] as DraftVariant[],
})

export default function ProductsAdminPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [shopLabel, setShopLabel] = useState("")
  const [shops, setShops] = useState<Array<{ id: string; name: string; slug: string }>>([])
  const [products, setProducts] = useState<Product[]>([])
  const [query, setQuery] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [draft, setDraft] = useState(emptyDraft)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [delta, setDelta] = useState("1")
  const [reason, setReason] = useState("")
  const [variantId, setVariantId] = useState("")
  const [moves, setMoves] = useState<Array<{ id: string; type: string; quantity: number; reason: string; orderCode?: string; createdAt?: string; variantName?: string }>>([])

  const load = async () => {
    const res = await listProductsV1()
    setProducts(res.products || [])
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const me = await meV1()
        const current = localStorage.getItem("shopId") || ""
        const currentName =
          localStorage.getItem("shopDisplayName") || localStorage.getItem("shopName") || ""
        const isPlatform = me?.platformAdmin === true
        if (current) {
          if (isPlatform) {
            enterPlatformShop({
              id: current,
              name: currentName || "Oficina",
              slug: localStorage.getItem("shopSlug") || "",
            })
          }
          if (!cancelled) setShopLabel(currentName || "Oficina")
          await load()
        } else if (isPlatform) {
          const res = await listPlatformShopsV1()
          if (!cancelled) setShops(res.shops || [])
        } else {
          router.replace("/dashboard")
          return
        }
        if (!cancelled) setReady(true)
      } catch (err: any) {
        toast.error(err?.message || "Não abriu o catálogo")
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  const openShop = async (shop: { id: string; name: string; slug?: string }) => {
    enterPlatformShop({ id: shop.id, name: shop.name, slug: shop.slug })
    setShopLabel(shop.name)
    setShops([])
    try {
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Não abriu o catálogo")
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter((product) =>
      [product.name, product.sku, product.description].some((part) => String(part || "").toLowerCase().includes(q))
    )
  }, [products, query])

  const stats = useMemo(() => {
    const tracked = products.filter((p) => p.trackStock !== false)
    return {
      count: products.length,
      available: tracked.reduce((sum, p) => sum + (p.available || 0), 0),
      reserved: tracked.reduce((sum, p) => sum + (p.reserved || 0), 0),
      value: tracked.reduce((sum, p) => sum + (p.price || 0) * (p.onHand || 0), 0),
      low: tracked.filter((p) => p.low).length,
    }
  }, [products])

  const create = async () => {
    if (!draft.name.trim()) {
      toast.message("Informe o nome do produto")
      return
    }
    setSaving(true)
    try {
      const variants = draft.variants
        .map((row) => ({
          name: row.name.trim(),
          onHand: Math.max(0, Number(row.onHand) || 0),
          price: row.price.trim() ? Number(String(row.price).replace(",", ".")) : null,
        }))
        .filter((row) => row.name)
      await createProductV1({
        name: draft.name.trim(),
        sku: draft.sku.trim(),
        description: draft.description.trim(),
        price: Number(String(draft.price).replace(",", ".")) || 0,
        trackStock: draft.trackStock,
        onHand: draft.trackStock && !variants.length ? Math.max(0, Number(draft.onHand) || 0) : 0,
        minQty: Math.max(0, Number(draft.minQty) || 0),
        variants,
      })
      setDraft(emptyDraft())
      setFormOpen(false)
      await load()
      toast.success("Produto no catálogo")
    } catch (err: any) {
      toast.error(err?.message || "Não gravou o produto")
    } finally {
      setSaving(false)
    }
  }

  const openMoves = async (id: string) => {
    setOpenId(id)
    try {
      const res = await productMovementsV1(id)
      setMoves(res.movements || [])
    } catch (err: any) {
      toast.error(err?.message || "Sem histórico")
    }
  }

  const adjust = async (id: string) => {
    const quantity = Math.trunc(Number(delta))
    if (!quantity) {
      toast.message("Informe quanto entra ou sai, com sinal")
      return
    }
    if (!reason.trim()) {
      toast.message("Informe o motivo do ajuste")
      return
    }
    const product = products.find((row) => row.id === id)
    if ((product?.variants || []).length && !variantId) {
      toast.message("Escolha a variação")
      return
    }
    try {
      await adjustProductV1(id, { quantity, reason: reason.trim(), variantId: variantId || undefined })
      setReason("")
      await load()
      await openMoves(id)
      toast.success("Estoque atualizado")
    } catch (err: any) {
      toast.error(err?.message || "Não ajustou")
    }
  }

  const downloadReport = async () => {
    setExporting(true)
    try {
      const blob = await productReportCsvV1()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "catalogo-estoque.csv"
      link.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      toast.error(err?.message || "Não gerou o relatório")
    } finally {
      setExporting(false)
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-40 items-center justify-center text-sm text-[var(--wq-text-muted)]">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Abrindo catálogo
      </div>
    )
  }

  if (!shopLabel) {
    return (
      <div className="space-y-6">
        <AppHeader title="Produtos" subtitle="Escolha a oficina" />
        <ul className="divide-y divide-[var(--wq-border)] overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
          {shops.length === 0 ? (
            <li className="px-4 py-8 text-sm text-[var(--wq-text-muted)]">Nenhuma oficina.</li>
          ) : (
            shops.map((shop) => (
              <li key={shop.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[var(--wq-paper)]"
                  onClick={() => void openShop(shop)}
                >
                  <span>
                    <span className="block font-medium">{shop.name}</span>
                    <span className="block text-xs text-[var(--wq-text-muted)]">{shop.slug}</span>
                  </span>
                  <span className="text-sm font-semibold text-[var(--wq-brand-text)]">Abrir</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    )
  }

  return (
    <div className="-mx-3 -mt-4 sm:-mx-5 sm:-mt-6 md:-mx-8 md:-mt-7">
      <AppHeader
        title="Produtos"
        subtitle="O que a loja vende. No pedido, em Produtos da loja: reserva ao salvar, baixa na entrega."
        actions={
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" className="rounded-[10px]" disabled={exporting} onClick={() => void downloadReport()}>
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              <span className="ml-2 hidden sm:inline">Exportar</span>
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-[10px] bg-[var(--wq-action)] text-white hover:bg-[var(--wq-action)]/90"
              onClick={() => {
                setDraft(emptyDraft())
                setFormOpen(true)
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              Novo produto
            </Button>
          </div>
        }
      />

      <div className="mx-auto max-w-[1100px] space-y-5 px-3 py-4 sm:px-5 sm:py-6 md:px-8">
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Produtos", value: String(stats.count) },
            { label: "Disponível", value: String(stats.available) },
            { label: "Reservado", value: String(stats.reserved) },
            { label: "Valor em estoque", value: brl(stats.value) },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--wq-text-muted)]">{card.label}</p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-xl tabular-nums">{card.value}</p>
            </div>
          ))}
        </section>
        {stats.low ? (
          <p className="text-sm text-[var(--wq-danger)]">{stats.low} produto{stats.low === 1 ? "" : "s"} abaixo do mínimo.</p>
        ) : null}

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--wq-text-muted)]" />
          <Input
            className="h-11 rounded-[10px] pl-9"
            placeholder="Buscar por nome ou código"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--wq-border)] bg-[var(--wq-surface)] px-6 py-16 text-center">
            <p className="font-semibold">Nenhum produto cadastrado</p>
            <p className="mt-1 text-sm text-[var(--wq-text-muted)]">
              Cadastre o que a loja vende: palmilha, cadarço, produto de limpeza, peça. Depois, no pedido, adicione em Produtos da loja. O item do cliente continua igual.
            </p>
            <Button
              type="button"
              className="mt-4 rounded-[10px] bg-[var(--wq-action)] text-white"
              onClick={() => {
                setDraft(emptyDraft())
                setFormOpen(true)
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              Novo produto
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--wq-border)] bg-[var(--wq-paper)] text-[11px] font-semibold uppercase tracking-wide text-[var(--wq-text-muted)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Produto</th>
                  <th className="hidden px-4 py-3 font-semibold sm:table-cell">Código</th>
                  <th className="px-4 py-3 font-semibold">Preço</th>
                  <th className="px-4 py-3 font-semibold">Disponível</th>
                  <th className="hidden px-4 py-3 font-semibold md:table-cell">Reservado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--wq-border)]">
                {filtered.map((product) => {
                  const open = openId === product.id
                  return (
                    <Fragment key={product.id}>
                      <tr
                        className="cursor-pointer hover:bg-[var(--wq-paper)]/80"
                        onClick={() => {
                          setOpenId(open ? null : product.id)
                          setVariantId(product.variants?.[0]?.id || "")
                          setDelta("1")
                          setReason("")
                          if (!open) void openMoves(product.id)
                        }}
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium">{product.name}</p>
                          {product.low ? <p className="text-xs text-[var(--wq-danger)]">Abaixo do mínimo</p> : null}
                          {product.trackStock === false ? (
                            <p className="text-xs text-[var(--wq-text-muted)]">Sem controle de estoque</p>
                          ) : null}
                        </td>
                        <td className="hidden px-4 py-3 text-[var(--wq-text-muted)] sm:table-cell">{product.sku || "—"}</td>
                        <td className="px-4 py-3 tabular-nums">{brl(product.price)}</td>
                        <td className="px-4 py-3 tabular-nums font-semibold">
                          {product.trackStock === false ? "—" : product.available ?? 0}
                        </td>
                        <td className="hidden px-4 py-3 tabular-nums text-[var(--wq-text-muted)] md:table-cell">
                          {product.trackStock === false ? "—" : product.reserved ?? 0}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            className="rounded-lg p-2 text-[var(--wq-danger)] hover:bg-[var(--wq-paper)]"
                            aria-label="Apagar produto"
                            onClick={async (event) => {
                              event.stopPropagation()
                              if (!window.confirm(`Apagar ${product.name} do catálogo?`)) return
                              try {
                                await deleteProductV1(product.id)
                                await load()
                              } catch (err: any) {
                                toast.error(err?.message || "Não apagou")
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                      {open ? (
                        <tr>
                          <td colSpan={6} className="bg-[var(--wq-paper)] px-4 py-4">
                            {(product.variants || []).length ? (
                              <div className="mb-4 overflow-hidden rounded-xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
                                <table className="w-full text-sm">
                                  <thead className="text-[11px] uppercase tracking-wide text-[var(--wq-text-muted)]">
                                    <tr>
                                      <th className="px-3 py-2 font-semibold">Variação</th>
                                      <th className="px-3 py-2 font-semibold">Disponível</th>
                                      <th className="px-3 py-2 font-semibold">Preço</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(product.variants || []).map((row) => (
                                      <tr key={row.id}>
                                        <td className="px-3 py-2">{row.name}</td>
                                        <td className="px-3 py-2 tabular-nums">{row.available ?? row.onHand}</td>
                                        <td className="px-3 py-2 tabular-nums">{row.price == null ? "—" : brl(row.price)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : null}
                            {product.trackStock !== false ? (
                              <div className="flex flex-wrap items-end gap-2">
                                {(product.variants || []).length ? (
                                  <div className="space-y-1">
                                    <Label>Variação</Label>
                                    <select
                                      className="h-10 rounded-[10px] border border-[var(--wq-border)] bg-white px-2 text-sm"
                                      value={variantId}
                                      onChange={(e) => setVariantId(e.target.value)}
                                    >
                                      {(product.variants || []).map((row) => (
                                        <option key={row.id} value={row.id}>
                                          {row.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                ) : null}
                                <div className="space-y-1">
                                  <Label>Quantidade</Label>
                                  <Input className="w-28" value={delta} onChange={(e) => setDelta(e.target.value)} inputMode="numeric" placeholder="+1 ou -1" />
                                </div>
                                <div className="min-w-48 flex-1 space-y-1">
                                  <Label>Motivo</Label>
                                  <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Entrada, perda, contagem…" />
                                </div>
                                <Button type="button" className="rounded-[10px]" variant="outline" onClick={() => void adjust(product.id)}>
                                  Atualizar estoque
                                </Button>
                              </div>
                            ) : null}
                            {moves.length ? (
                              <ul className="mt-4 space-y-1 text-xs text-[var(--wq-text-muted)]">
                                {moves.slice(0, 8).map((move) => (
                                  <li key={move.id}>
                                    {moveLabel[move.type] || move.type} {move.quantity > 0 ? `+${move.quantity}` : move.quantity}
                                    {move.variantName ? ` · ${move.variantName}` : ""}
                                    {move.reason ? ` · ${move.reason}` : ""}
                                    {move.orderCode ? ` · #${move.orderCode}` : ""}
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo produto</DialogTitle>
            <DialogDescription>Nome, preço e quantidade. Variação é opcional, uma linha por tamanho ou cor.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Palmilha gel, camiseta, kit…" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Preço</Label>
                <Input value={draft.price} onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))} inputMode="decimal" placeholder="0,00" />
              </div>
              <div className="space-y-1">
                <Label>Quantidade</Label>
                <Input
                  value={draft.onHand}
                  onChange={(e) => setDraft((d) => ({ ...d, onHand: e.target.value }))}
                  inputMode="numeric"
                  disabled={!draft.trackStock || draft.variants.length > 0}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Código</Label>
                <Input value={draft.sku} onChange={(e) => setDraft((d) => ({ ...d, sku: e.target.value }))} placeholder="Opcional" />
              </div>
              <div className="space-y-1">
                <Label>Avisar no mínimo</Label>
                <Input value={draft.minQty} onChange={(e) => setDraft((d) => ({ ...d, minQty: e.target.value }))} inputMode="numeric" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Input value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} placeholder="Opcional" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={draft.trackStock} onChange={(e) => setDraft((d) => ({ ...d, trackStock: e.target.checked }))} />
              Controlar estoque
            </label>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Variações</Label>
                <button
                  type="button"
                  className="text-sm font-medium text-[var(--wq-brand-text)]"
                  onClick={() => setDraft((d) => ({ ...d, variants: [...d.variants, { name: "", onHand: "0", price: "" }] }))}
                >
                  Adicionar
                </button>
              </div>
              {draft.variants.length ? (
                <div className="space-y-2">
                  {draft.variants.map((row, index) => (
                    <div key={index} className="grid grid-cols-[1fr_4.5rem_5.5rem_auto] gap-2">
                      <Input
                        placeholder="P, M, Preto…"
                        value={row.name}
                        onChange={(e) =>
                          setDraft((d) => {
                            const variants = [...d.variants]
                            variants[index] = { ...row, name: e.target.value }
                            return { ...d, variants }
                          })
                        }
                      />
                      <Input
                        inputMode="numeric"
                        placeholder="Qtd"
                        value={row.onHand}
                        onChange={(e) =>
                          setDraft((d) => {
                            const variants = [...d.variants]
                            variants[index] = { ...row, onHand: e.target.value }
                            return { ...d, variants }
                          })
                        }
                      />
                      <Input
                        inputMode="decimal"
                        placeholder="Preço"
                        value={row.price}
                        onChange={(e) =>
                          setDraft((d) => {
                            const variants = [...d.variants]
                            variants[index] = { ...row, price: e.target.value }
                            return { ...d, variants }
                          })
                        }
                      />
                      <button
                        type="button"
                        className="text-[var(--wq-danger)]"
                        aria-label="Remover variação"
                        onClick={() => setDraft((d) => ({ ...d, variants: d.variants.filter((_, i) => i !== index) }))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <p className="text-xs text-[var(--wq-text-muted)]">Com variação, o saldo fica em cada linha. O preço vazio usa o do produto.</p>
                </div>
              ) : (
                <p className="text-xs text-[var(--wq-text-muted)]">Opcional. Tamanho, cor ou outro recorte.</p>
              )}
            </div>
            <Button type="button" className="rounded-[10px] bg-[var(--wq-action)] text-white" disabled={saving} onClick={() => void create()}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar no catálogo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
