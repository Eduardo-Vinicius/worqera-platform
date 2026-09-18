"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import QRCode from "qrcode"
import { AppHeader } from "@/components/shell/AppHeader"
import { Button } from "@/components/ui/button"
import { getPedidoService } from "@/lib/apiService"
import { getShopCurrentV1 } from "@/lib/apiV1"
import { deepenHex, normalizeHex, readBrandFromStorage, resolveBrandColors } from "@/lib/shopBrand"
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
  const autoPrint = search.get("print") === "1"

  const [order, setOrder] = useState<OrderLabel | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState("")
  const [pairQrs, setPairQrs] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [brandName, setBrandName] = useState("Worqera")
  const [logoUrl, setLogoUrl] = useState("")
  const [ink, setInk] = useState("#0F172A")

  const code = order?.code || "—"
  const clientName =
    order?.clientName || order?.client?.nomeCompleto || order?.client?.name || "—"
  const items = useMemo(() => {
    if (Array.isArray(order?.items) && order.items.length) return order.items
    if (order?.shoeModel) return [{ shoeModel: order.shoeModel }]
    return []
  }, [order])

  useEffect(() => {
    const stored = readBrandFromStorage()
    if (stored.displayName) setBrandName(stored.displayName)
    if (stored.logoUrl) setLogoUrl(stored.logoUrl)
    const colors = resolveBrandColors(stored)
    setInk(deepenHex(colors.primary))
    ;(async () => {
      try {
        const shop = await getShopCurrentV1()
        const doc = shop?.shop || shop
        setBrandName(doc?.branding?.displayName || doc?.name || "Worqera")
        setLogoUrl(doc?.branding?.logoUrl || "")
        const c = resolveBrandColors(doc?.branding)
        setInk(deepenHex(c.primary))
      } catch {
        // keep localStorage
      }
    })()
  }, [])

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
      if (slug)
        return `${window.location.origin}/p/${encodeURIComponent(slug)}/${encodeURIComponent(order.code)}`
      return `${window.location.origin}/p/${encodeURIComponent(order.code)}`
    })()
    const dark = normalizeHex(ink) || "#0F172A"
    let cancelled = false
    ;(async () => {
      try {
        const main = await QRCode.toDataURL(publicUrl, {
          margin: 1,
          width: 280,
          color: { dark, light: "#FFFFFF" },
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
              color: { dark, light: "#FFFFFF" },
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
  }, [order, ink])

  useEffect(() => {
    if (!autoPrint || loading || !order || !qrDataUrl) return
    const t = setTimeout(() => window.print(), 400)
    return () => clearTimeout(t)
  }, [autoPrint, loading, order, qrDataUrl])

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

  const BrandHeader = ({ compact = false }: { compact?: boolean }) => (
    <div className={`flex items-center justify-center gap-2 ${compact ? "mb-2" : "mb-3"}`}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          className={compact ? "h-8 w-auto object-contain" : "h-10 w-auto object-contain"}
        />
      ) : null}
      <p
        className="text-xs uppercase tracking-[0.2em]"
        style={{ color: ink }}
      >
        {brandName}
      </p>
    </div>
  )

  return (
    <div className="-mx-3 -mt-4 sm:-mx-5 sm:-mt-6 md:-mx-8 md:-mt-7">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .wq-print-label, .wq-print-label * { visibility: visible; }
          .wq-print-label {
            position: absolute; left: 0; top: 0; width: 100%;
            margin: 0 !important; padding: 12mm !important;
            box-shadow: none !important; border: none !important;
          }
        }
      `}</style>
      <div className="print:hidden">
        <AppHeader
          title="Etiqueta do pedido"
          subtitle="Imprima e cole no produto · QR abre a consulta pública"
          showHealth={false}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="rounded-[10px] bg-[var(--wq-action)] text-white hover:bg-[var(--wq-action)]/90"
                onClick={() => window.print()}
              >
                <Printer className="mr-1.5 h-4 w-4" />
                Imprimir agora
              </Button>
              <Button asChild variant="outline" size="sm" className="rounded-[10px]">
                <Link href={`/pedidos/${id}/etiqueta?pares=1`}>Imprimir pares</Link>
              </Button>
              {pairsMode && (
                <Button asChild variant="outline" size="sm" className="rounded-[10px]">
                  <Link href={`/pedidos/${id}/etiqueta`}>Só pedido</Link>
                </Button>
              )}
              <Button asChild variant="outline" size="sm" className="rounded-[10px]">
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

      <div className="wq-print-label mx-auto max-w-[900px] space-y-8 px-5 py-8 md:px-8">
        {!pairsMode ? (
          <div
            className="rounded-2xl border bg-white p-8 text-center print:border-0 print:p-4"
            style={{ borderColor: `${ink}33` }}
          >
            <BrandHeader />
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--wq-text-muted)]">
              Pedido
            </p>
            <p
              className="mt-3 font-mono text-6xl font-semibold tracking-tight md:text-7xl"
              style={{ color: ink }}
            >
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
            <p className="mt-3 font-mono text-xs text-[var(--wq-text-muted)]">
              Escaneie para acompanhar
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 print:grid-cols-2">
            {items.map((item, index) => {
              const pairCode = `${code}-${index + 1}`
              return (
                <div
                  key={pairCode}
                  className="rounded-2xl border bg-white p-6 text-center print:break-inside-avoid"
                  style={{ borderColor: `${ink}33` }}
                >
                  <BrandHeader compact />
                  <p className="text-xs uppercase tracking-[0.15em] text-[var(--wq-text-muted)]">
                    Par {index + 1}
                  </p>
                  <p
                    className="mt-2 font-mono text-4xl font-semibold"
                    style={{ color: ink }}
                  >
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
