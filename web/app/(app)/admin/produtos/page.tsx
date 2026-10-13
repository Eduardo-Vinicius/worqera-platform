"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { AppHeader } from "@/components/shell/AppHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  adjustProductV1,
  createProductV1,
  deleteProductV1,
  listProductsV1,
  meV1,
  productMovementsV1,
} from "@/lib/apiV1"

type Variant = { id: string; name: string; price: number | null; available: number; onHand: number }
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

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0)

const moveLabel: Record<string, string> = {
  adjust: "Ajuste",
  reserve: "Reserva",
  release: "Estorno",
  commit: "Baixa",
  reopen: "Reabertura",
}

export default function ProductsAdminPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [name, setName] = useState("")
  const [price, setPrice] = useState("0")
  const [sku, setSku] = useState("")
  const [description, setDescription] = useState("")
  const [trackStock, setTrackStock] = useState(true)
  const [onHand, setOnHand] = useState("0")
  const [minQty, setMinQty] = useState("0")
  const [variantsText, setVariantsText] = useState("")
  const [saving, setSaving] = useState(false)
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
        if (!me?.platformAdmin) {
          router.replace("/dashboard")
          return
        }
        await load()
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

  const create = async () => {
    if (!name.trim()) {
      toast.message("Dê um nome ao produto")
      return
    }
    setSaving(true)
    try {
      const variants = variantsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [variantName, variantQty, variantPrice] = line.split("|").map((part) => part.trim())
          return {
            name: variantName,
            onHand: Math.max(0, Number(variantQty) || 0),
            price: variantPrice ? Number(variantPrice.replace(",", ".")) : null,
          }
        })
      await createProductV1({
        name: name.trim(),
        sku: sku.trim(),
        description: description.trim(),
        price: Number(String(price).replace(",", ".")) || 0,
        trackStock,
        onHand: trackStock ? Math.max(0, Number(onHand) || 0) : 0,
        minQty: Math.max(0, Number(minQty) || 0),
        variants,
      })
      setName("")
      setSku("")
      setDescription("")
      setPrice("0")
      setOnHand("0")
      setVariantsText("")
      await load()
      toast.success("Produto cadastrado")
    } catch (err: any) {
      toast.error(err?.message || "Não gravou o produto")
    } finally {
      setSaving(false)
    }
  }

  const openMoves = async (id: string) => {
    setOpenId(id)
    setVariantId("")
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
      toast.message("Informe a quantidade, positiva ou negativa")
      return
    }
    if (!reason.trim()) {
      toast.message("Escreva o motivo")
      return
    }
    try {
      await adjustProductV1(id, { quantity, reason: reason.trim(), variantId: variantId || undefined })
      setReason("")
      await load()
      await openMoves(id)
      toast.success("Estoque ajustado")
    } catch (err: any) {
      toast.error(err?.message || "Não ajustou")
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-40 items-center justify-center text-sm text-[var(--wq-text-muted)]">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Abrindo catálogo
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <AppHeader
        title="Produtos"
        subtitle="Só o admin Worqera vê esta tela. A loja continua no pedido de sempre."
      />

      <section className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-4">
        <p className="text-sm font-semibold text-[var(--wq-text)]">Novo produto</p>
        <p className="mt-1 text-xs text-[var(--wq-text-muted)]">
          Com estoque, a venda reserva ao abrir o pedido e baixa na entrega. Sem estoque, entra no kanban sob encomenda.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Palmilha, camiseta, bolo…" />
          </div>
          <div className="space-y-1">
            <Label>Preço</Label>
            <Input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" />
          </div>
          <div className="space-y-1">
            <Label>SKU</Label>
            <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Opcional" />
          </div>
          <div className="space-y-1">
            <Label>Mínimo</Label>
            <Input value={minQty} onChange={(e) => setMinQty(e.target.value)} inputMode="numeric" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Descrição</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={trackStock} onChange={(e) => setTrackStock(e.target.checked)} />
            Controla estoque
          </label>
          {trackStock && !variantsText.trim() ? (
            <div className="space-y-1">
              <Label>Saldo inicial</Label>
              <Input value={onHand} onChange={(e) => setOnHand(e.target.value)} inputMode="numeric" />
            </div>
          ) : null}
          <div className="space-y-1 sm:col-span-2">
            <Label>Variações</Label>
            <textarea
              className="min-h-20 w-full rounded-[10px] border border-[var(--wq-border)] bg-white px-3 py-2 text-sm"
              value={variantsText}
              onChange={(e) => setVariantsText(e.target.value)}
              placeholder={"Uma por linha: nome | saldo | preço\nP | 4 | 80\nM | 2"}
            />
          </div>
        </div>
        <Button type="button" className="mt-3 rounded-[10px] bg-[var(--wq-action)] text-white" disabled={saving} onClick={() => void create()}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Cadastrar
        </Button>
      </section>

      <section className="space-y-3">
        {products.length === 0 ? (
          <p className="text-sm text-[var(--wq-text-muted)]">
            Nenhum produto. Pedido de algo que o cliente trouxe não precisa daqui.
          </p>
        ) : (
          products.map((product) => (
            <article key={product.id} className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-[var(--wq-text)]">{product.name}</p>
                  <p className="text-sm text-[var(--wq-text-muted)]">
                    {brl(product.price)}
                    {product.trackStock === false
                      ? " · sob encomenda"
                      : ` · ${product.available ?? 0} disponível · ${product.reserved ?? 0} reservado`}
                    {product.low ? " · abaixo do mínimo" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg p-2 text-[var(--wq-danger)]"
                  aria-label="Apagar produto"
                  onClick={async () => {
                    if (!window.confirm("Apagar este produto do catálogo?")) return
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
              </div>
              {product.trackStock !== false ? (
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  {(product.variants || []).length ? (
                    <select
                      className="h-10 rounded-[10px] border border-[var(--wq-border)] bg-white px-2 text-sm"
                      value={openId === product.id ? variantId : ""}
                      onChange={(e) => {
                        setOpenId(product.id)
                        setVariantId(e.target.value)
                      }}
                    >
                      <option value="">Variação</option>
                      {(product.variants || []).map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.name} · {row.available} disp.
                        </option>
                      ))}
                    </select>
                  ) : null}
                  <Input className="w-24" value={openId === product.id ? delta : "1"} onChange={(e) => { setOpenId(product.id); setDelta(e.target.value) }} inputMode="numeric" />
                  <Input className="min-w-40 flex-1" placeholder="Motivo" value={openId === product.id ? reason : ""} onChange={(e) => { setOpenId(product.id); setReason(e.target.value) }} />
                  <Button type="button" variant="outline" className="rounded-[10px]" onClick={() => void adjust(product.id)}>
                    Ajustar
                  </Button>
                  <Button type="button" variant="outline" className="rounded-[10px]" onClick={() => void openMoves(product.id)}>
                    Histórico
                  </Button>
                </div>
              ) : null}
              {openId === product.id && moves.length ? (
                <ul className="mt-3 space-y-1 text-xs text-[var(--wq-text-muted)]">
                  {moves.map((move) => (
                    <li key={move.id}>
                      {moveLabel[move.type] || move.type} {move.quantity > 0 ? `+${move.quantity}` : move.quantity}
                      {move.variantName ? ` · ${move.variantName}` : ""}
                      {move.reason ? ` · ${move.reason}` : ""}
                      {move.orderCode ? ` · #${move.orderCode}` : ""}
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))
        )}
      </section>
    </div>
  )
}
