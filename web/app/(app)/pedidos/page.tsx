"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Loader2, Package, Plus, Search } from "lucide-react"
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
    <div className="-mx-5 -mt-6 md:-mx-8 md:-mt-7">
      <AppHeader
        title="Pedidos"
        subtitle="Ativos, finalizados e edição · mais recentes primeiro"
        actions={
          <Button asChild className="rounded-[11px] bg-[var(--wq-action)] hover:bg-[var(--wq-action)]/90">
            <Link href="/pedidos/novo">
              <Plus className="mr-1.5 h-4 w-4" />
              Novo pedido
            </Link>
          </Button>
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

        {loading && orders.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-[var(--wq-text-muted)]">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Carregando…
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--wq-border)] py-14 text-center">
            <Package className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p className="text-[var(--wq-text-muted)]">Nenhum pedido neste filtro.</p>
            <Button asChild className="mt-4 rounded-[10px] bg-[var(--wq-action)]">
              <Link href="/pedidos/novo">Criar pedido</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
            <div className="border-b border-[var(--wq-border)] bg-[var(--wq-paper)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--wq-text-muted)]">
              {orders.length}
              {nextToken ? "+" : ""} pedidos · clique para editar
            </div>
            <ul className="divide-y divide-[var(--wq-border)]">
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
        onReopened={() => {
          runSearch({ tab: "ativos" })
          setTab("ativos")
          toast.message("Reaberto — edite fotos e valores no painel, ou veja no kanban")
        }}
      />
    </div>
  )
}
