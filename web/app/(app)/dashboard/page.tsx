"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AppHeader } from "@/components/shell/AppHeader"
import { Button } from "@/components/ui/button"
import { getDashboardService } from "@/lib/apiService"
import { getShopCurrentV1, sendWeeklyDigestV1 } from "@/lib/apiV1"
import { SetupChecklist } from "@/components/shell/SetupChecklist"
import { ReferralCard } from "@/components/shell/ReferralCard"
import { toast } from "sonner"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  KanbanSquare,
  Mail,
  Monitor,
  Package,
  Plus,
  Search,
  Tv,
  Users,
  Wallet,
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
  const [isOwner, setIsOwner] = useState(false)
  const [canFinance, setCanFinance] = useState(false)
  const [digestBusy, setDigestBusy] = useState(false)

  useEffect(() => {
    const role = String(localStorage.getItem("role") || "").toLowerCase()
    setIsOwner(role === "owner")
    setCanFinance(role === "owner" || role === "admin")
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

  const sendWeekly = async () => {
    setDigestBusy(true)
    try {
      const res = await sendWeeklyDigestV1()
      toast.success(
        res.sent > 0
          ? `Digest enviado (${res.deliveredCount ?? 0} finalizados · ${res.delaysTotal ?? 0} atrasos)`
          : "Nenhum e-mail enviado (sem owner com e-mail)"
      )
    } catch (err: any) {
      toast.error(err?.message || "Falha ao enviar digest")
    } finally {
      setDigestBusy(false)
    }
  }
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
      hint: "Em andamento",
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
      status: o.status,
    }))
    .slice(0, 8)

  const sectors = [...(data?.bySector || [])].sort(
    (a, b) => (b.count || 0) - (a.count || 0)
  )
  const maxSector = Math.max(1, ...sectors.map((s) => s.count || 0))
  const clients = stats.totalClients ?? 0
  const readyCount = hotQueue.filter((o) => o.status === "ready").length

  const shortcuts = [
    { href: "/pedidos/novo", label: "Novo pedido", icon: Plus, primary: true },
    { href: "/kanban", label: "Kanban", icon: KanbanSquare },
    { href: "/consultas", label: "Consultas", icon: Search },
    { href: "/clientes", label: "Clientes", icon: Users },
    canFinance
      ? { href: "/admin/financeiro", label: "Financeiro", icon: Wallet }
      : null,
    { href: "/tv", label: "TV Cliente", icon: Tv, external: true, desktopOnly: true },
    { href: "/tv-dashboard", label: "TV chão", icon: Monitor, external: true, desktopOnly: true },
  ].filter(Boolean) as Array<{
    href: string
    label: string
    icon: typeof Plus
    primary?: boolean
    external?: boolean
    desktopOnly?: boolean
  }>

  const nextActions = [
    overdue > 0
      ? { href: "/kanban", label: `${overdue} atrasado${overdue === 1 ? "" : "s"}`, tone: "warn" as const }
      : null,
    readyCount > 0
      ? {
          href: "/kanban",
          label: readyCount === 1 ? "1 pronto na fila" : `${readyCount} prontos na fila`,
          tone: "ok" as const,
        }
      : null,
    open === 0
      ? { href: "/pedidos/novo", label: "Criar primeiro pedido", tone: "brand" as const }
      : { href: "/pedidos/novo", label: "Novo pedido", tone: "brand" as const },
  ].filter(Boolean) as Array<{ href: string; label: string; tone: "warn" | "ok" | "brand" }>

  return (
    <div className="-mx-2.5 -mt-3 sm:-mx-5 sm:-mt-5 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-6">
      <AppHeader
        title="Visão geral"
        subtitle={
          shopName
            ? `${shopName}${firstName ? ` · Olá, ${firstName}` : ""}`
            : "O que fazer agora na operação"
        }
        actions={
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {isOwner ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 rounded-[10px]"
                disabled={digestBusy}
                onClick={sendWeekly}
                title="Envia o resumo semanal por e-mail para os owners da loja"
              >
                <Mail className="mr-1.5 h-4 w-4" />
                <span className="hidden sm:inline">
                  {digestBusy ? "Enviando…" : "Digest aos owners"}
                </span>
                <span className="sm:hidden">Digest</span>
              </Button>
            ) : null}
            <Button
              asChild
              size="sm"
              className="h-9 rounded-[11px] bg-[var(--wq-brand)] text-white hover:bg-[var(--wq-brand-deep)]"
            >
              <Link href="/pedidos/novo">
                <Plus className="mr-1.5 h-4 w-4" />
                <span className="sm:hidden">Novo</span>
                <span className="hidden sm:inline">Novo pedido</span>
              </Link>
            </Button>
          </div>
        }
      />

      <div className="mx-auto w-full max-w-[1600px] space-y-3 px-2.5 pb-6 sm:space-y-4 sm:px-5 md:px-6 lg:px-8">
        {loading && <p className="text-sm text-[var(--wq-text-muted)]">Carregando…</p>}
        {error && <p className="text-sm text-[var(--wq-danger)]">{error}</p>}

        {!loading && !error && (
          <>
            <SetupChecklist openOrders={open} totalClients={clients} />

            {nextActions.length > 0 ? (
              <section className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {nextActions.map((a) => (
                  <Link
                    key={a.label}
                    href={a.href}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                      a.tone === "warn"
                        ? "border-[var(--wq-warn)]/40 bg-[color-mix(in_srgb,var(--wq-warn)_12%,var(--wq-surface))] text-[var(--wq-text)]"
                        : a.tone === "ok"
                          ? "border-[var(--wq-success)]/40 bg-[color-mix(in_srgb,var(--wq-success)_10%,var(--wq-surface))] text-[var(--wq-text)]"
                          : "border-[var(--wq-brand)]/35 bg-[var(--wq-brand-soft)] text-[var(--wq-text)]"
                    }`}
                  >
                    {a.label}
                    <ArrowRight className="h-3.5 w-3.5 opacity-70" />
                  </Link>
                ))}
              </section>
            ) : null}

            {/* Hero strip */}
            <section className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
              <div className="flex flex-col gap-2.5 border-b border-[var(--wq-border)] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-3.5">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--wq-text-muted)]">
                    Hoje
                  </p>
                  <h2 className="truncate text-base font-semibold tracking-tight text-[var(--wq-text)] sm:text-xl">
                    {shopName || "Sua empresa"}
                  </h2>
                  <p className="mt-0.5 text-xs text-[var(--wq-text-muted)]">
                    {open} aberto{open === 1 ? "" : "s"}
                    {overdue > 0 ? ` · ${overdue} atrasado${overdue === 1 ? "" : "s"}` : " · fila em dia"}
                    {trialLabel ? ` · ${trialLabel}` : ""}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <Button asChild size="sm" className="h-10 rounded-[10px] bg-[var(--wq-brand)] text-white sm:h-9">
                    <Link href="/kanban">
                      Kanban
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="h-10 rounded-[10px] sm:h-9">
                    <Link href="/pedidos">Pedidos</Link>
                  </Button>
                </div>
              </div>

              {overdue > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--wq-border)] bg-[color-mix(in_srgb,var(--wq-warn)_10%,var(--wq-surface))] px-3 py-2.5 sm:px-5">
                  <p className="flex items-center gap-2 text-sm font-medium text-[var(--wq-text)]">
                    <AlertTriangle className="h-4 w-4 text-[var(--wq-warn)]" />
                    {overdue} atrasado(s)
                  </p>
                  <Link href="/kanban" className="text-sm font-semibold text-[var(--wq-brand)] hover:underline">
                    Priorizar →
                  </Link>
                </div>
              )}

              <div className="grid grid-cols-2 gap-px bg-[var(--wq-border)] md:grid-cols-4">
                {kpis.map((kpi) => {
                  const Icon = kpi.icon
                  return (
                    <div key={kpi.label} className="bg-[var(--wq-surface)] px-3 py-3 sm:px-4 sm:py-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--wq-text-muted)]">
                            {kpi.label}
                          </p>
                          <p className="mt-1 text-[24px] font-semibold leading-none tracking-tight text-[var(--wq-text)] sm:text-[32px]">
                            {kpi.value}
                          </p>
                          <p className="mt-1 hidden text-[11px] text-[var(--wq-text-muted)] sm:block">
                            {kpi.hint}
                          </p>
                        </div>
                        <span
                          className={`mt-0.5 hidden rounded-lg border border-[var(--wq-border)] bg-[var(--wq-paper)] p-1.5 sm:inline-flex ${kpi.tone}`}
                        >
                          <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            <nav aria-label="Atalhos" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {shortcuts.map((s) => {
                const Icon = s.icon
                return (
                  <Link
                    key={s.href}
                    href={s.href}
                    target={s.external ? "_blank" : undefined}
                    rel={s.external ? "noopener noreferrer" : undefined}
                    className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                      s.desktopOnly ? "hidden sm:flex" : ""
                    } ${
                      s.primary
                        ? "border-[var(--wq-brand)]/40 bg-[var(--wq-brand-soft)] text-[var(--wq-text)] hover:border-[var(--wq-brand)]"
                        : "border-[var(--wq-border)] bg-[var(--wq-surface)] text-[var(--wq-text)] hover:border-[var(--wq-brand)]/50"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 ${s.primary ? "text-[var(--wq-brand)]" : "text-[var(--wq-text-muted)]"}`}
                    />
                    <span className="truncate">{s.label}</span>
                  </Link>
                )
              })}
            </nav>

            <div className="grid gap-3 sm:gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
              <section className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
                <div className="flex items-center justify-between border-b border-[var(--wq-border)] px-3 py-3 sm:px-4">
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--wq-text)]">Fila recente</h2>
                    <p className="text-[11px] text-[var(--wq-text-muted)]">Até 8 pedidos</p>
                  </div>
                  <Link href="/kanban" className="text-xs font-semibold text-[var(--wq-brand)] hover:underline">
                    Kanban →
                  </Link>
                </div>
                <div className="divide-y divide-[var(--wq-border)]">
                  {hotQueue.length === 0 && (
                    <div className="px-4 py-8 text-center">
                      <p className="text-sm text-[var(--wq-text-muted)]">Nenhum pedido ainda.</p>
                      <Button asChild className="mt-3 rounded-[10px] bg-[var(--wq-brand)] text-white" size="sm">
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
                        className="flex min-h-12 items-center justify-between gap-3 px-3 py-2.5 transition hover:bg-[var(--wq-paper)] sm:px-4"
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
                          <p className="mt-0.5 truncate text-xs text-[var(--wq-text-muted)]">
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
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--wq-text-muted)]" />
                      </Link>
                    )
                  })}
                </div>
              </section>

              <div className="space-y-3 sm:space-y-4">
                <section className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
                  <div className="flex items-center justify-between border-b border-[var(--wq-border)] px-3 py-3 sm:px-4">
                    <div>
                      <h2 className="text-sm font-semibold text-[var(--wq-text)]">Carga por setor</h2>
                      <p className="text-[11px] text-[var(--wq-text-muted)]">Distribuição do kanban</p>
                    </div>
                    <Link href="/kanban" className="text-xs font-semibold text-[var(--wq-brand)] hover:underline">
                      Kanban →
                    </Link>
                  </div>
                  <ul className="max-h-[min(420px,50vh)] space-y-2.5 overflow-y-auto px-3 py-3 sm:px-4">
                    {sectors.length === 0 && (
                      <li className="text-sm text-[var(--wq-text-muted)]">Sem setores ativos.</li>
                    )}
                    {sectors.map((s) => (
                      <li key={String(s.sectorId)}>
                        <Link href="/kanban" className="block space-y-1">
                          <div className="flex items-baseline justify-between gap-2 text-sm">
                            <span className="truncate font-medium text-[var(--wq-text)]">{s.name}</span>
                            <span className="font-mono text-[var(--wq-brand)]">{s.count}</span>
                          </div>
                          <div className="h-1 overflow-hidden rounded-full bg-[var(--wq-paper)]">
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
                  <section className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] px-4 py-3">
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
                      className="mt-2 inline-flex text-sm font-semibold text-[var(--wq-brand)] hover:underline"
                    >
                      Gerenciar billing →
                    </Link>
                  </section>
                )}

                {isOwner ? <ReferralCard /> : null}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
