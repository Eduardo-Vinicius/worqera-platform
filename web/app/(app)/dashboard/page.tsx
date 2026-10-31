"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AppHeader } from "@/components/shell/AppHeader"
import { Button } from "@/components/ui/button"
import { getDashboardService } from "@/lib/apiService"
import { getShopCurrentV1, sendWeeklyDigestV1 } from "@/lib/apiV1"
import { SetupChecklist } from "@/components/shell/SetupChecklist"
import { ReferralCard } from "@/components/shell/ReferralCard"
import { OperationPanel } from "@/components/dashboard/OperationPanel"
import { ShelfCard } from "@/components/orders/ShelfCard"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { ArrowRight, Mail, Plus } from "lucide-react"

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

function isLate(dueAt?: string, status?: string) {
  if (!dueAt || status === "ready" || status === "delivered") return false
  const d = new Date(dueAt)
  return !Number.isNaN(d.getTime()) && d.getTime() < Date.now()
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardPayload | null>(null)
  const [shopName, setShopName] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isOwner, setIsOwner] = useState(false)
  const [digestBusy, setDigestBusy] = useState(false)

  useEffect(() => {
    const role = String(localStorage.getItem("role") || "").toLowerCase()
    setIsOwner(role === "owner")
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
  const clients = stats.totalClients ?? 0
  const firstName = data?.user?.name?.split(" ")[0]
  const trialLabel =
    data?.subscription?.status === "trialing" && data?.subscription?.trialEndsAt
      ? `Trial até ${new Date(data.subscription.trialEndsAt).toLocaleDateString("pt-BR")}`
      : null

  const recent = (data?.recentOrders || [])
    .map((o) => ({
      id: o.id || o._id,
      code: o.code || o.codigo,
      client: o.client?.name || o.clientName || "—",
      sector: o.currentSector?.name || o.setorAtual || "",
      dueAt: o.dueAt || o.dataPrevistaEntrega,
      status: o.status,
    }))
    .slice(0, 8)

  const subtitle = [shopName || "O que fazer agora na operação", firstName ? `Olá, ${firstName}` : "", trialLabel || ""]
    .filter(Boolean)
    .join(" · ")

  return (
    <div className="-mx-2.5 -mt-3 sm:-mx-5 sm:-mt-5 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-6">
      <AppHeader
        showTvs
        title="Visão geral"
        subtitle={subtitle}
        actions={
          <div className="flex items-center gap-1.5 sm:gap-2">
            {isOwner ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 w-9 rounded-[10px] p-0"
                disabled={digestBusy}
                onClick={sendWeekly}
                title="Enviar o resumo semanal por e-mail aos donos"
                aria-label="Enviar resumo semanal por e-mail"
              >
                <Mail className="h-4 w-4" />
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

      <div className="mx-auto w-full max-w-[1400px] space-y-3 px-2.5 pb-6 sm:space-y-4 sm:px-5 md:px-6 lg:px-8">
        {loading && <p className="text-sm text-[var(--wq-text-muted)]">Carregando…</p>}
        {error && <p className="text-sm text-[var(--wq-danger)]">{error}</p>}

        {!loading && !error && (
          <>
            <OperationPanel open={open} overdue={overdue} sectors={data?.bySector || []} />
            <SetupChecklist openOrders={open} totalClients={clients} />

            <div className={cn("grid gap-3 sm:gap-4", isOwner && "xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]")}>
              <section className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
                <div className="flex items-center justify-between border-b border-[var(--wq-border)] px-4 py-3">
                  <h2 className="text-sm font-semibold text-[var(--wq-text)]">Pedidos recentes</h2>
                  <Link href="/pedidos" className="text-xs font-semibold text-[var(--wq-brand-text)] hover:underline">
                    Ver todos →
                  </Link>
                </div>
                {recent.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-[var(--wq-text-muted)]">Nenhum pedido ainda.</p>
                    <Button asChild className="mt-3 rounded-[10px] bg-[var(--wq-brand)] text-white" size="sm">
                      <Link href="/pedidos/novo">Criar primeiro pedido</Link>
                    </Button>
                  </div>
                ) : (
                  <ul className={cn("divide-y divide-[var(--wq-border)]", !isOwner && "md:grid md:grid-cols-2 md:divide-y-0")}>
                    {recent.map((order) => {
                      const due = formatDue(order.dueAt)
                      const late = isLate(order.dueAt, order.status)
                      const sector = order.sector && !/^[a-f0-9]{24}$/i.test(String(order.sector)) ? order.sector : ""
                      return (
                        <li key={order.id} className={cn(!isOwner && "md:border-b md:border-[var(--wq-border)]")}>
                          <Link
                            href="/consultas/pedidos"
                            className="flex min-h-12 items-center gap-3 px-4 py-2.5 transition hover:bg-[var(--wq-paper)]"
                          >
                            <span
                              className={cn(
                                "h-2 w-2 shrink-0 rounded-full",
                                order.status === "ready" ? "bg-emerald-500" : late ? "bg-rose-500" : "bg-[var(--wq-border)]"
                              )}
                              title={order.status === "ready" ? "Pronto" : late ? "Atrasado" : "Em andamento"}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm text-[var(--wq-text)]">
                                <span className="font-mono font-semibold">{order.code}</span>
                                <span className="text-[var(--wq-text-muted)]"> · {order.client}</span>
                              </span>
                              {sector ? <span className="block truncate text-xs text-[var(--wq-text-muted)]">{sector}</span> : null}
                            </span>
                            {due ? (
                              <span className={cn("shrink-0 text-xs tabular-nums", late ? "font-semibold text-rose-600 dark:text-rose-400" : "text-[var(--wq-text-muted)]")}>
                                {due}
                              </span>
                            ) : null}
                            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--wq-text-muted)]" />
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>

              {isOwner ? (
                <div className="space-y-3 sm:space-y-4">
                  <ShelfCard />
                  <ReferralCard />
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
