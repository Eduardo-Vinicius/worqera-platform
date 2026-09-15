"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import QRCode from "qrcode"
import { AppHeader } from "@/components/shell/AppHeader"
import { Button } from "@/components/ui/button"
import { getPedidoService } from "@/lib/apiService"
import { Printer, KanbanSquare, Plus } from "lucide-react"
import { toast } from "sonner"

type OrderLabel = {
  id?: string
  code?: string
  clientName?: string
  client?: { name?: string; nomeCompleto?: string }
  items?: Array<{ shoeModel?: string }>
  itemCount?: number
  shoeModel?: string
}

function PedidoEtiquetaInner() {
  const params = useParams()
  const search = useSearchParams()
  const id = String(params?.id || "")
  const pairsMode = search.get("pares") === "1"

  const [order, setOrder] = useState<OrderLabel | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState("")
  const [pairQrs, setPairQrs] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const code = order?.code || "—"
  const clientName =
    order?.clientName || order?.client?.nomeCompleto || order?.client?.name || "—"
  const items = useMemo(() => {
    if (Array.isArray(order?.items) && order.items.length) return order.items
    if (order?.shoeModel) return [{ shoeModel: order.shoeModel }]
    return []
  }, [order])

  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        const data = await getPedidoService(id)
        setOrder(data)
      } catch (err: any) {
        toast.error(err?.message || "Erro ao carregar pedido")
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  useEffect(() => {
    if (!order?.code || typeof window === "undefined") return
    const publicUrl = (() => {
      const slug = localStorage.getItem("shopSlug")
      if (slug) return `${window.location.origin}/p/${encodeURIComponent(slug)}/${encodeURIComponent(order.code)}`
      return `${window.location.origin}/p/${encodeURIComponent(order.code)}`
    })()
    let cancelled = false
    ;(async () => {
      try {
        const main = await QRCode.toDataURL(publicUrl, {
          margin: 1,
          width: 280,
          color: { dark: "#0F172A", light: "#FFFFFF" },
        })
        if (!cancelled) setQrDataUrl(main)

        const list =
          Array.isArray(order.items) && order.items.length
            ? order.items
            : [{ shoeModel: order.shoeModel || "" }]
        const pairUrls = await Promise.all(
          list.map((_, index) =>
            QRCode.toDataURL(`${publicUrl}?item=${index + 1}`, {
              margin: 1,
              width: 180,
              color: { dark: "#0F172A", light: "#FFFFFF" },
            })
          )
        )
        if (!cancelled) setPairQrs(pairUrls)
      } catch {
        toast.error("Não foi possível gerar o QR Code")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [order])

  if (loading) {
    return <p className="p-8 text-[var(--wq-text-muted)]">Carregando etiqueta…</p>
  }

  if (!order) {
    return (
      <div className="p-8">
        <p className="text-[var(--wq-danger)]">Pedido não encontrado.</p>
        <Button asChild className="mt-4">
          <Link href="/pedidos/novo">Novo pedido</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="-mx-5 -mt-6 md:-mx-8 md:-mt-7">
      <div className="print:hidden">
        <AppHeader
          title="Etiqueta do pedido"
          subtitle="Imprima e cole no produto"
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-[10px]"
                onClick={() => window.print()}
              >
                <Printer className="mr-1.5 h-4 w-4" />
                Imprimir
              </Button>
              <Button asChild variant="outline" size="sm" className="rounded-[10px]">
                <Link href={`/pedidos/${id}/etiqueta?pares=1`}>Imprimir pares</Link>
              </Button>
              {pairsMode && (
                <Button asChild variant="outline" size="sm" className="rounded-[10px]">
                  <Link href={`/pedidos/${id}/etiqueta`}>Só pedido</Link>
                </Button>
              )}
              <Button
                asChild
                size="sm"
                className="rounded-[10px] bg-[var(--wq-action)] text-white hover:bg-[var(--wq-action)]/90"
              >
                <Link href="/kanban">
                  <KanbanSquare className="mr-1.5 h-4 w-4" />
                  Kanban
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="rounded-[10px]">
                <Link href="/pedidos/novo">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Novo pedido
                </Link>
              </Button>
            </div>
          }
        />
      </div>

      <div className="mx-auto max-w-[900px] space-y-8 px-5 py-8 md:px-8">
        {!pairsMode ? (
          <div className="rounded-2xl border border-[var(--wq-border)] bg-white p-8 text-center print:border-0 print:p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--wq-text-muted)]">
              {typeof window !== "undefined"
                ? localStorage.getItem("shopDisplayName") ||
                  localStorage.getItem("shopName") ||
                  "Worqera"
                : "Worqera"}{" "}
              · Pedido
            </p>
            <p className="mt-4 font-mono text-6xl font-semibold tracking-tight text-[var(--wq-ink)] md:text-7xl">
              {code}
            </p>
            <p className="mt-3 text-lg text-[var(--wq-text)]">{clientName}</p>
            <p className="text-sm text-[var(--wq-text-muted)]">
              {items.length} {items.length === 1 ? "par" : "pares"}
              {items[0]?.shoeModel
                ? ` · ${items
                    .map((i) => i.shoeModel)
                    .filter(Boolean)
                    .join(", ")}`
                : ""}
            </p>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt={`QR ${code}`} className="mx-auto mt-8 h-48 w-48" />
            ) : (
              <div className="mx-auto mt-8 h-48 w-48 animate-pulse rounded-lg bg-[var(--wq-paper)]" />
            )}
            <p className="mt-3 font-mono text-xs text-[var(--wq-text-muted)]">/p/{code}</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 print:grid-cols-2">
            {items.map((item, index) => {
              const pairCode = `${code}-${index + 1}`
              return (
                <div
                  key={pairCode}
                  className="rounded-2xl border border-[var(--wq-border)] bg-white p-6 text-center print:break-inside-avoid"
                >
                  <p className="text-xs uppercase tracking-[0.15em] text-[var(--wq-text-muted)]">
                    Par {index + 1}
                  </p>
                  <p className="mt-2 font-mono text-4xl font-semibold text-[var(--wq-ink)]">
                    {pairCode}
                  </p>
                  <p className="mt-2 text-sm text-[var(--wq-text)]">{item.shoeModel || "Tênis"}</p>
                  <p className="text-xs text-[var(--wq-text-muted)]">
                    Pedido {code} · {clientName}
                  </p>
                  {pairQrs[index] ? (
                    <img
                      src={pairQrs[index]}
                      alt={`QR ${pairCode}`}
                      className="mx-auto mt-4 h-32 w-32"
                    />
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function PedidoEtiquetaPage() {
  return (
    <Suspense fallback={<p className="p-8 text-[var(--wq-text-muted)]">Carregando etiqueta…</p>}>
      <PedidoEtiquetaInner />
    </Suspense>
  )
}
