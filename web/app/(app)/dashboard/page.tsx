"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AppHeader } from "@/components/shell/AppHeader"
import { Button } from "@/components/ui/button"
import { getDashboardService } from "@/lib/apiService"
import { getShopCurrentV1 } from "@/lib/apiV1"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  KanbanSquare,
  Monitor,
  Package,
  Plus,
  Search,
  Tv,
  Users,
} from "lucide-react"

type DashboardPayload = {
  stats?: {
    totalClients?: number
    activeOrders?: number
    pendingOrders?: number
    completedToday?: number
    overdue?: number
    openOrders?: number
  }
  recentOrders?: any[]
  bySector?: Array<{ sectorId: string; name: string; count: number }>
  user?: { name?: string }
  subscription?: { status?: string; trialEndsAt?: string }
}

function formatDue(dueAt?: string) {
  if (!dueAt) return null
  const d = new Date(dueAt)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardPayload | null>(null)
  const [shopName, setShopName] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    ;(async () => {
      try {
        const [payload, shop] = await Promise.all([
          getDashboardService({ forceRefresh: true }),
          getShopCurrentV1().catch(() => null),
        ])
        setData(payload)
        const doc = shop?.shop || shop
        const label =
          doc?.branding?.displayName || doc?.name || localStorage.getItem("shopName") || ""
        setShopName(label)
        if (payload?.user?.name) localStorage.setItem("userName", payload.user.name)
        if (label) localStorage.setItem("shopName", label)
      } catch (err: any) {
        setError(err?.message || "Erro ao carregar dashboard")
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const stats = data?.stats || {}
  const overdue = stats.overdue ?? 0
  const open = stats.openOrders ?? stats.activeOrders ?? 0
  const firstName = data?.user?.name?.split(" ")[0]
  const trialLabel =
    data?.subscription?.status === "trialing" && data?.subscription?.trialEndsAt
      ? `Trial até ${new Date(data.subscription.trialEndsAt).toLocaleDateString("pt-BR")}`
      : data?.subscription?.status
        ? String(data.subscription.status)
        : null

  const kpis = [
    {
      label: "Pedidos abertos",
      value: open,
      icon: Package,
      hint: "Em andamento na oficina",
      tone: "text-[var(--wq-brand)]",
      ring: "border-[var(--wq-brand)]/25",
    },
    {
      label: "Atrasados",
      value: overdue,
      icon: AlertTriangle,
      hint: overdue > 0 ? "Priorize no kanban" : "Fila em dia",
      tone: overdue > 0 ? "text-[var(--wq-warn)]" : "text-[var(--wq-text-muted)]",
      ring: overdue > 0 ? "border-[var(--wq-warn)]/30" : "border-[var(--wq-border)]",
    },
    {
      label: "Prontos hoje",
      value: stats.completedToday ?? 0,
      icon: CheckCircle2,
      hint: "Finalizados no dia",
      tone: "text-[var(--wq-success)]",
      ring: "border-[var(--wq-success)]/25",
    },
    {
      label: "Pendentes",
      value: stats.pendingOrders ?? 0,
      icon: Clock3,
      hint: "Aguardando avanço",
      tone: "text-[var(--wq-action)]",
      ring: "border-[var(--wq-action)]/25",
    },
  ]

  const hotQueue = (data?.recentOrders || [])
    .map((o) => ({
      id: o.id || o._id,
      code: o.code || o.codigo,
      client: o.client?.name || o.clientName || "—",
      sector: o.currentSector?.name || o.setorAtual || "—",
      dueAt: o.dueAt || o.dataPrevistaEntrega,
    }))
    .slice(0, 8)

  const sectors = data?.bySector || []
  const maxSector = Math.max(1, ...sectors.map((s) => s.count || 0))
  const clients = stats.totalClients ?? 0

  const shortcuts = [
    { href: "/pedidos/novo", label: "Novo pedido", icon: Plus, primary: true },
    { href: "/kanban", label: "Kanban", icon: KanbanSquare },
    { href: "/consultas", label: "Consultas", icon: Search },
    { href: "/clientes", label: "Clientes", icon: Users },
    { href: "/tv", label: "TV Cliente", icon: Tv, external: true },
    { href: "/tv-dashboard", label: "TV Oficina", icon: Monitor, external: true },
  ]

  return (
    <div className="-mx-5 -mt-6 md:-mx-8 md:-mt-7">
      <AppHeader
        title="Visão geral"
        subtitle={shopName ? `${shopName}${firstName ? ` · Olá, ${firstName}` : ""}` : "Operação do dia"}
        actions={
          <Button
            asChild
            className="rounded-[11px] bg-[var(--wq-brand)] text-white hover:bg-[var(--wq-brand-deep)]"
          >
            <Link href="/pedidos/novo">
              <Plus className="mr-1.5 h-4 w-4" />
              Novo pedido
            </Link>
          </Button>
        }
      />

      <div className="mx-auto max-w-[1320px] space-y-5">
        {loading && <p className="text-sm text-[var(--wq-text-muted)]">Carregando…</p>}
        {error && <p className="text-sm text-[var(--wq-danger)]">{error}</p>}

        {!loading && !error && (
          <>
            {/* Hero strip */}
            <section className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
              <div className="flex flex-col gap-4 border-b border-[var(--wq-border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--wq-brand)_12%,var(--wq-surface)),var(--wq-surface)_55%)] px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--wq-text-muted)]">
                    Hoje na oficina
                  </p>
                  <h2 className="mt-1 truncate text-xl font-semibold tracking-tight text-[var(--wq-text)] md:text-2xl">
                    {shopName || "Sua empresa"}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--wq-text-muted)]">
                    {open} aberto{open === 1 ? "" : "s"}
                    {overdue > 0 ? ` · ${overdue} atrasado${overdue === 1 ? "" : "s"}` : " · fila em dia"}
                    {clients ? ` · ${clients} cliente${clients === 1 ? "" : "s"}` : ""}
                    {trialLabel ? ` · ${trialLabel}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" className="rounded-[10px] bg-[var(--wq-brand)] text-white">
                    <Link href="/kanban">
                      Abrir kanban
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="rounded-[10px]">
                    <Link href="/pedidos">Ver pedidos</Link>
                  </Button>
                </div>
              </div>

              {overdue > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--wq-border)] bg-[color-mix(in_srgb,var(--wq-warn)_10%,var(--wq-surface))] px-5 py-3 md:px-6">
                  <p className="flex items-center gap-2 text-sm font-medium text-[var(--wq-text)]">
                    <AlertTriangle className="h-4 w-4 text-[var(--wq-warn)]" />
                    {overdue} pedido(s) passaram do prazo — priorize a fila
                  </p>
                  <Link
                    href="/kanban"
                    className="text-sm font-semibold text-[var(--wq-brand)] hover:underline"
                  >
                    Ir ao kanban →
                  </Link>
                </div>
              )}

              <div className="grid gap-px bg-[var(--wq-border)] sm:grid-cols-2 xl:grid-cols-4">
                {kpis.map((kpi) => {
                  const Icon = kpi.icon
                  return (
                    <div
                      key={kpi.label}
                      className={`bg-[var(--wq-surface)] px-5 py-4 ${kpi.ring}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">
                            {kpi.label}
                          </p>
                          <p className="mt-2 text-[32px] font-semibold leading-none tracking-tight text-[var(--wq-text)]">
                            {kpi.value}
                          </p>
                          <p className="mt-2 text-xs text-[var(--wq-text-muted)]">{kpi.hint}</p>
                        </div>
                        <span
                          className={`mt-0.5 rounded-lg border border-[var(--wq-border)] bg-[var(--wq-paper)] p-2 ${kpi.tone}`}
                        >
                          <Icon className="h-4 w-4" strokeWidth={1.75} />
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Shortcuts */}
            <nav aria-label="Atalhos" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {shortcuts.map((s) => {
                const Icon = s.icon
                return (
                  <Link
                    key={s.href}
                    href={s.href}
                    target={s.external ? "_blank" : undefined}
                    rel={s.external ? "noopener noreferrer" : undefined}
                    className={`flex items-center gap-2.5 rounded-xl border px-3 py-3 text-sm font-medium transition ${
                      s.primary
                        ? "border-[var(--wq-brand)]/40 bg-[var(--wq-brand-soft)] text-[var(--wq-text)] hover:border-[var(--wq-brand)]"
                        : "border-[var(--wq-border)] bg-[var(--wq-surface)] text-[var(--wq-text)] hover:border-[var(--wq-brand)]/50"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 ${s.primary ? "text-[var(--wq-brand)]" : "text-[var(--wq-text-muted)]"}`}
                    />
                    {s.label}
                  </Link>
                )
              })}
            </nav>

            <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
              <section className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
                <div className="flex items-center justify-between border-b border-[var(--wq-border)] px-5 py-4">
                  <div>
                    <h2 className="text-base font-semibold text-[var(--wq-text)]">Fila recente</h2>
                    <p className="text-xs text-[var(--wq-text-muted)]">Últimos pedidos em movimento</p>
                  </div>
                  <Link
                    href="/kanban"
                    className="text-sm font-semibold text-[var(--wq-brand)] hover:underline"
                  >
                    Kanban →
                  </Link>
                </div>
                <div className="divide-y divide-[var(--wq-border)]">
                  {hotQueue.length === 0 && (
                    <div className="px-5 py-10 text-center">
                      <p className="text-sm text-[var(--wq-text-muted)]">
                        Nenhum pedido ainda. Crie o primeiro para popular o kanban.
                      </p>
                      <Button asChild className="mt-4 rounded-[10px] bg-[var(--wq-brand)] text-white">
                        <Link href="/pedidos/novo">Criar pedido</Link>
                      </Button>
                    </div>
                  )}
                  {hotQueue.map((order) => {
                    const due = formatDue(order.dueAt)
                    return (
                      <Link
                        key={order.id}
                        href="/consultas/pedidos"
                        className="flex items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-[var(--wq-paper)]"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold text-[var(--wq-text)]">
                              {order.code}
                            </span>
                            {due ? (
                              <span className="rounded-md bg-[var(--wq-paper)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--wq-text-muted)]">
                                {due}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 truncate text-sm text-[var(--wq-text-muted)]">
                            {order.client}
                            {order.sector &&
                            order.sector !== "—" &&
                            !/^[a-f0-9]{24}$/i.test(String(order.sector)) ? (
                              <>
                                <span className="text-[var(--wq-border)]"> · </span>
                                {order.sector}
                              </>
                            ) : null}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-[var(--wq-text-muted)]" />
                      </Link>
                    )
                  })}
                </div>
              </section>

              <div className="space-y-4">
                <section className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
                  <div className="border-b border-[var(--wq-border)] px-5 py-4">
                    <h2 className="text-base font-semibold text-[var(--wq-text)]">Carga por setor</h2>
                    <p className="text-xs text-[var(--wq-text-muted)]">Distribuição atual do kanban</p>
                  </div>
                  <ul className="space-y-3 px-5 py-4">
                    {sectors.length === 0 && (
                      <li className="text-sm text-[var(--wq-text-muted)]">Sem setores ativos.</li>
                    )}
                    {sectors.map((s) => (
                      <li key={String(s.sectorId)}>
                        <Link href="/kanban" className="block space-y-1.5">
                          <div className="flex items-baseline justify-between gap-2 text-sm">
                            <span className="truncate font-medium text-[var(--wq-text)]">{s.name}</span>
                            <span className="font-mono text-[var(--wq-brand)]">{s.count}</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--wq-paper)]">
                            <div
                              className="h-full rounded-full bg-[var(--wq-brand)]"
                              style={{
                                width: `${Math.round(((s.count || 0) / maxSector) * 100)}%`,
                              }}
                            />
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>

                {data?.subscription?.status && (
                  <section className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] px-5 py-4">
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">
                      Assinatura
                    </p>
                    <p className="mt-1 text-sm font-semibold capitalize text-[var(--wq-text)]">
                      {data.subscription.status}
                    </p>
                    {data.subscription.trialEndsAt ? (
                      <p className="mt-1 text-xs text-[var(--wq-text-muted)]">
                        Trial até{" "}
                        {new Date(data.subscription.trialEndsAt).toLocaleDateString("pt-BR")}
                      </p>
                    ) : null}
                    <Link
                      href="/billing"
                      className="mt-3 inline-flex text-sm font-semibold text-[var(--wq-brand)] hover:underline"
                    >
                      Gerenciar billing →
                    </Link>
                  </section>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
