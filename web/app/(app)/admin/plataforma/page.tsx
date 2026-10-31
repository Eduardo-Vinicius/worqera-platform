"use client"

import { useState } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowRight, CheckCircle2, Info, TrendingUp } from "lucide-react"
import { AppHeader } from "@/components/shell/AppHeader"
import { getPlatformOverviewV1, type PlatformInsight, type PlatformOverview } from "@/lib/apiV1"
import { Chips, HealthDot, KpiCard, LONG_PERIODS, Skeleton, brl0, nf, useAutoRefresh } from "@/components/admin/charts"
import { cn } from "@/lib/utils"

const SEVERITY: Record<PlatformInsight["severity"], { icon: typeof Info; tone: string; label: string }> = {
  critical: { icon: AlertTriangle, tone: "border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100", label: "Crítico" },
  warn: { icon: AlertTriangle, tone: "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100", label: "Atenção" },
  info: { icon: Info, tone: "border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100", label: "Info" },
  positive: { icon: TrendingUp, tone: "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100", label: "Bom sinal" },
}

const SLA_TONE = { ok: "bg-emerald-500", warn: "bg-amber-500", late: "bg-rose-500" }

/** Worqera admin home: what matters this week, in one glance. */
export default function PlataformaOverviewPage() {
  const [days, setDays] = useState(7)
  const [data, setData] = useState<PlatformOverview | null>(null)
  const [error, setError] = useState("")
  const updated = useAutoRefresh(
    async () => {
      try {
        setData(await getPlatformOverviewV1(days))
        setError("")
      } catch (err: any) {
        setError(err?.message || "Não carregou a visão geral")
      }
    },
    [days]
  )

  return (
    <div className="-mx-2.5 -mt-3 sm:-mx-5 sm:-mt-5 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-6">
      <AppHeader
        title="Visão geral"
        subtitle={`Rede Worqera · ${updated}`}
        showInbox={false}
        showOrderJump={false}
        actions={
          <Link href="/admin/plataforma/portal" className="text-sm font-semibold text-[var(--wq-brand-text)] hover:underline">
            Portal técnico →
          </Link>
        }
      />
      <div className="mx-auto w-full max-w-[1600px] space-y-4 px-2.5 py-4 sm:px-5 md:px-6 lg:px-8">
        <div className="flex justify-end">
          <Chips value={days} onChange={setDays} options={LONG_PERIODS} />
        </div>
        {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</p> : null}
        {!data ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <KpiCard label="Usuários ativos 30d" value={nf(data.kpis.activeUsers30.value)} delta={data.kpis.activeUsers30} />
              <KpiCard label={`Pedidos criados · ${days}d`} value={nf(data.kpis.ordersCreated.value)} delta={data.kpis.ordersCreated} />
              <KpiCard label={`Pedidos entregues · ${days}d`} value={nf(data.kpis.ordersDelivered.value)} delta={data.kpis.ordersDelivered} hint="ação de valor" />
              <KpiCard label="Lojas ativas 30d" value={nf(data.kpis.activeShops30.value)} hint="com alguém usando" />
              <KpiCard label="MRR" value={brl0(data.kpis.mrr.value)} hint={`${nf(data.kpis.mrr.paying)} pagantes`} />
            </section>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
              <section className="space-y-2">
                <h2 className="text-sm font-semibold">O que está acontecendo</h2>
                {data.insights.length ? (
                  data.insights.map((ins) => {
                    const s = SEVERITY[ins.severity]
                    const Icon = s.icon
                    return (
                      <Link key={ins.id} href={ins.href} className={cn("flex items-start gap-3 rounded-2xl border px-4 py-3 transition hover:opacity-90", s.tone)}>
                        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">{ins.title}</span>
                          <span className="block text-sm opacity-90">{ins.detail}</span>
                        </span>
                        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide opacity-70">{s.label}</span>
                      </Link>
                    )
                  })
                ) : (
                  <p className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
                    <CheckCircle2 className="h-4 w-4" /> Nada fora do normal no período.
                  </p>
                )}
              </section>

              <div className="space-y-4">
                <section className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold">Saúde do sistema</h2>
                    <HealthDot status={data.health.status} label={data.health.label} />
                  </div>
                  <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-semibold tabular-nums">
                    {data.health.score}
                    <span className="text-base font-normal text-[var(--wq-text-muted)]">/100</span>
                  </p>
                  <p className="mt-1 text-xs text-[var(--wq-text-muted)]">
                    Erro {data.health.errorRate.toLocaleString("pt-BR")}% · p95 {nf(data.health.p95Ms)} ms · fila de coleta {nf(data.health.queue)}
                  </p>
                  <Link href="/admin/metricas" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--wq-brand-text)] hover:underline">
                    Ver métricas <ArrowRight className="h-3 w-3" />
                  </Link>
                </section>

                <section className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
                  <div className="flex items-center justify-between border-b border-[var(--wq-border)] px-4 py-3">
                    <h2 className="text-sm font-semibold">Pendências</h2>
                    <Link href="/admin/operacao" className="text-xs font-semibold text-[var(--wq-brand-text)] hover:underline">
                      Abrir filas →
                    </Link>
                  </div>
                  <ul className="divide-y divide-[var(--wq-border)]">
                    {data.queues.map((q) => (
                      <li key={q.key}>
                        <Link href={`/admin/operacao#${q.key}`} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--wq-paper)]">
                          <span className={cn("h-2 w-2 rounded-full", q.count ? SLA_TONE[q.sla] : "bg-[var(--wq-border)]")} />
                          <span className="min-w-0 flex-1 truncate">{q.label}</span>
                          <span className="tabular-nums font-semibold">{nf(q.count)}</span>
                          <span className="w-16 text-right text-xs tabular-nums text-[var(--wq-text-muted)]">{q.count ? `${nf(q.oldestHours)} h` : "—"}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
