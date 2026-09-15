"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Package, Search } from "lucide-react"
import { AppHeader } from "@/components/shell/AppHeader"
import { PedidoConsultaDetalhe } from "@/components/PedidoConsultaDetalhe"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { getPedidosConsultaService } from "@/lib/apiService"
import { listSectorsV1 } from "@/lib/apiV1"
import { toast } from "sonner"
import { pairCount } from "@/lib/utils"

type StatusTab = "ativos" | "finalizados" | "todos"

const STATUS_FILTER: Record<StatusTab, string | undefined> = {
  ativos: "open,in_progress,ready",
  finalizados: "delivered",
  todos: undefined,
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

function ConsultasPedidosInner() {
  const searchParams = useSearchParams()
  const [q, setQ] = useState("")
  const [dataInicio, setDataInicio] = useState("")
  const [dataFim, setDataFim] = useState("")
  const [tab, setTab] = useState<StatusTab>(() => {
    const t = searchParams.get("tab")
    if (t === "finalizados" || t === "ativos" || t === "todos") return t
    return "ativos"
  })
  const [orders, setOrders] = useState<any[]>([])
  const [nextToken, setNextToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [sectorMeta, setSectorMeta] = useState<Record<string, { name: string; color: string }>>({})
  const [detailId, setDetailId] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
      setHasSearched(true)
      try {
        const term = (overrides?.q ?? q).trim()
        const statusTab = overrides?.tab ?? tab
        const query: Record<string, any> = {
          limit: 40,
          dataInicio: dataInicio || undefined,
          dataFim: dataFim || undefined,
          status: STATUS_FILTER[statusTab],
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
    const initial = searchParams.get("q") || searchParams.get("codigo") || ""
    const tabParam = searchParams.get("tab") as StatusTab | null
    if (tabParam === "finalizados" || tabParam === "ativos" || tabParam === "todos") {
      setTab(tabParam)
    }
    if (initial) {
      setQ(initial)
      runSearch({ q: initial, tab: tabParam || undefined })
    } else {
      runSearch({ q: "", tab: tabParam || "ativos" })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!hasSearched) return
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
    <div className="-mx-5 -mt-6 md:-mx-8 md:-mt-7">
      <AppHeader
        title="Consultar pedidos"
        subtitle="Mais recentes primeiro · finalizados fora do kanban"
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="rounded-[10px]">
              <Link href="/consultas">Voltar</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-[10px]">
              <Link href="/consultas/clientes">Clientes</Link>
            </Button>
          </div>
        }
      />

      <div className="mx-auto max-w-[1100px] space-y-4 px-5 py-6 md:px-8">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["ativos", "Ativos"],
              ["finalizados", "Finalizados"],
              ["todos", "Todos"],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              type="button"
              size="sm"
              variant={tab === id ? "default" : "outline"}
              className={`rounded-[10px] ${tab === id ? "bg-[var(--wq-action)] hover:bg-[var(--wq-action)]/90" : ""}`}
              onClick={() => setTabAndSearch(id)}
            >
              {label}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--wq-text-muted)]" />
            <Input
              className="h-10 rounded-[10px] pl-9"
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

        {hasSearched && (
          <div className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
            <div className="border-b border-[var(--wq-border)] bg-[var(--wq-paper)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--wq-text-muted)]">
              Resultados ({orders.length}
              {nextToken ? "+" : ""}) · data mais recente
            </div>
            <ul className="divide-y divide-[var(--wq-border)]">
              {orders.length === 0 && !loading && (
                <li className="px-4 py-10 text-center text-sm text-[var(--wq-text-muted)]">
                  Nenhum pedido encontrado.
                </li>
              )}
              {orders.map((order) => {
                const id = String(order.id || order._id)
                const code = order.code || order.codigo || id
                const setor = order.currentSectorId || order.setorAtual
                const valor = order.pricing?.total ?? order.precoTotal ?? 0
                const created = formatDate(order.createdAt || order.dataCriacao)
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => setDetailId(id)}
                      className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left transition hover:bg-[var(--wq-paper)]"
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
                        </div>
                        <p className="truncate text-sm text-[var(--wq-text-muted)]">
                          {[order.clientName || order.client?.name, created].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <p className="text-sm font-semibold">
                        {Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </p>
                    </button>
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

        {!hasSearched && (
          <div className="rounded-2xl border border-dashed border-[var(--wq-border)] py-16 text-center">
            <Package className="mx-auto mb-3 h-8 w-8 text-[var(--wq-text-muted)]" />
            <p className="text-sm text-[var(--wq-text-muted)]">Busque um pedido para ver detalhes.</p>
          </div>
        )}
      </div>

      <PedidoConsultaDetalhe
        orderId={detailId}
        open={Boolean(detailId)}
        onClose={() => setDetailId(null)}
        onReopened={() => {
          runSearch()
          setDetailId(null)
          toast.message("Pedido no kanban — abra /kanban para ver a coluna")
        }}
      />
    </div>
  )
}

export default function ConsultasPedidosPage() {
  return (
    <Suspense fallback={<p className="p-8 text-[var(--wq-text-muted)]">Carregando…</p>}>
      <ConsultasPedidosInner />
    </Suspense>
  )
}
