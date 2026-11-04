"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowRight, CheckCircle2, Info, TrendingUp, Zap } from "lucide-react"
import { AppHeader } from "@/components/shell/AppHeader"
import { getPlatformOverviewV1, type PlatformInsight, type PlatformOverview } from "@/lib/apiV1"
import { Chips, DeltaBadge, LONG_PERIODS, MiniSpark, Skeleton, ageLabel, brl0, nf, useAutoRefresh } from "@/components/admin/charts"
import { cn } from "@/lib/utils"

const SEVERITY: Record<PlatformInsight["severity"], { icon: typeof Info; rail: string; label: string }> = {
  critical: { icon: AlertTriangle, rail: "bg-rose-500", label: "Crítico" },
  warn: { icon: AlertTriangle, rail: "bg-amber-500", label: "Atenção" },
  positive: { icon: TrendingUp, rail: "bg-emerald-500", label: "Bom sinal" },
  info: { icon: Info, rail: "bg-sky-500", label: "Info" },
}

const GRADE_TONE: Record<PlatformOverview["health"]["grade"], string> = {
  excellent: "text-emerald-600 dark:text-emerald-400",
  good: "text-emerald-600 dark:text-emerald-400",
  attention: "text-amber-600 dark:text-amber-400",
  critical: "text-rose-600 dark:text-rose-400",
}

function Panel({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]", className)}>
      <header className="flex items-center justify-between gap-2 border-b border-[var(--wq-border)] px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  )
}

function HealthRing({ score, tone }: { score: number; tone: string }) {
  const r = 30
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 72 72" className={cn("h-20 w-20 shrink-0", tone)} aria-hidden>
      <circle cx="36" cy="36" r={r} fill="none" stroke="currentColor" strokeOpacity={0.15} strokeWidth="7" />
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${(score / 100) * c} ${c}`}
        transform="rotate(-90 36 36)"
      />
      <text x="36" y="41" textAnchor="middle" className="fill-[var(--wq-text)] text-[17px] font-semibold">
        {score}
      </text>
    </svg>
  )
}

/** Worqera admin home: what matters now, compared with the previous period of the same length. */
export default function PlataformaOverviewPage() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<PlatformOverview | null>(null)
  const [error, setError] = useState("")
  const [severity, setSeverity] = useState<"all" | PlatformInsight["severity"]>("all")
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
  const insights = useMemo(() => (data ? data.insights.filter((i) => severity === "all" || i.severity === severity) : []), [data, severity])

  return (
    <div className="-mx-2.5 -mt-3 sm:-mx-5 sm:-mt-5 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-6">
      <AppHeader
        title="Visão geral"
        subtitle={`O que importa agora · ${updated}`}
        showInbox={false}
        showOrderJump={false}
        actions={
          <Link href="/admin/acoes" className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--wq-brand-text)] hover:underline">
            <Zap className="h-4 w-4" /> Ações rápidas
          </Link>
        }
      />
      <div className="mx-auto w-full max-w-[1600px] space-y-4 px-2.5 py-4 sm:px-5 md:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-[var(--wq-text-muted)]">Indicadores dos últimos {days} dias · horário de Brasília</p>
          <Chips value={days} onChange={setDays} options={LONG_PERIODS} />
        </div>
        {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</p> : null}
        {!data ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
              <section className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-4">
                <div className="flex items-center gap-4">
                  <HealthRing score={data.health.score} tone={GRADE_TONE[data.health.grade]} />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">Saúde do sistema</p>
                    <p className={cn("font-[family-name:var(--font-display)] text-2xl font-semibold", GRADE_TONE[data.health.grade])}>{data.health.label}</p>
                    <p className="text-xs text-[var(--wq-text-muted)]">
                      Hoje: {nf(data.health.requests)} chamadas · erro {data.health.errorRate.toLocaleString("pt-BR")}% · p95 {nf(data.health.p95Ms)} ms
                    </p>
                  </div>
                </div>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {data.health.components.map((c) => (
                    <li key={c.key} className="flex items-center justify-between gap-2">
                      <span className="text-[var(--wq-text-muted)]">{c.label}</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums", c.penalty ? "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300")}>
                        {c.penalty ? `−${c.penalty}` : "ok"}
                      </span>
                    </li>
                  ))}
                </ul>
                {data.health.reasons.length ? (
                  <ul className="mt-2 space-y-0.5 text-xs text-amber-700 dark:text-amber-300">
                    {data.health.reasons.map((r) => (
                      <li key={r}>• {r}</li>
                    ))}
                  </ul>
                ) : null}
                <Link href="/admin/metricas" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--wq-brand-text)] hover:underline">
                  Detalhes <ArrowRight className="h-3 w-3" />
                </Link>
              </section>

              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {data.tiles.map((t) => (
                  <Link
                    key={t.key}
                    href={t.href}
                    className="group min-w-0 rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] px-4 py-3.5 transition hover:border-[var(--wq-brand)]/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">{t.label}</p>
                      <DeltaBadge delta={t.unit === "brl" ? null : t} />
                    </div>
                    <p className="mt-1.5 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums tracking-tight sm:text-[28px]">
                      {t.unit === "brl" ? brl0(t.value) : nf(t.value)}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[var(--wq-text-muted)]">{t.hint || (t.prev ? `antes: ${nf(t.prev)}` : " ")}</p>
                    {t.daily ? <MiniSpark points={t.daily} /> : null}
                  </Link>
                ))}
              </section>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
              <Panel
                title="Insights automáticos"
                action={<span className="text-xs text-[var(--wq-text-muted)]">{data.rulesEvaluated} regras sobre os últimos {days} dias</span>}
              >
                <div className="flex flex-wrap gap-1.5 border-b border-[var(--wq-border)] px-4 py-2.5">
                  {(
                    [
                      ["all", "Todos", data.insights.length],
                      ["critical", "Crítico", data.insightCounts.critical],
                      ["warn", "Atenção", data.insightCounts.warn],
                      ["positive", "Positivo", data.insightCounts.positive],
                      ["info", "Info", data.insightCounts.info],
                    ] as const
                  ).map(([key, label, count]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSeverity(key)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-semibold",
                        severity === key ? "border-[var(--wq-brand)] bg-[var(--wq-brand)] text-white" : "border-[var(--wq-border)] hover:bg-[var(--wq-paper)]"
                      )}
                    >
                      {label} <span className="opacity-75">{count}</span>
                    </button>
                  ))}
                </div>
                {insights.length ? (
                  <ul className="divide-y divide-[var(--wq-border)]">
                    {insights.map((ins) => {
                      const s = SEVERITY[ins.severity]
                      return (
                        <li key={ins.id} className="flex gap-3 px-4 py-3">
                          <span className={cn("w-1 shrink-0 rounded-full", s.rail)} />
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">
                              {ins.category} · {s.label}
                            </p>
                            <p className="mt-0.5 text-sm font-semibold">{ins.title}</p>
                            <p className="text-sm text-[var(--wq-text-muted)]">{ins.detail}</p>
                            <Link href={ins.href} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[var(--wq-brand-text)] hover:underline">
                              Investigar <ArrowRight className="h-3 w-3" />
                            </Link>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="flex items-center gap-2 px-4 py-4 text-sm text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" /> Nada fora do normal{severity === "all" ? "" : " nessa categoria"}.
                  </p>
                )}
              </Panel>

              <div className="space-y-4">
                <Panel
                  title="Pendências"
                  action={
                    <Link href="/admin/operacao" className="text-xs font-semibold text-[var(--wq-brand-text)] hover:underline">
                      Abrir filas →
                    </Link>
                  }
                >
                  <ul className="divide-y divide-[var(--wq-border)]">
                    {data.queues.map((q) => (
                      <li key={q.key}>
                        <Link href={`/admin/operacao#${q.key}`} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--wq-paper)]">
                          <span className={cn("h-2 w-2 shrink-0 rounded-full", !q.count ? "bg-[var(--wq-border)]" : q.overdueCount ? "bg-rose-500" : "bg-amber-500")} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate">{q.label}</span>
                            <span className="block text-xs text-[var(--wq-text-muted)]">
                              {q.count ? `mais antigo há ${ageLabel(q.oldestHours)} · prazo ${q.slaHours} h` : "nada na fila"}
                              {q.overdueCount ? <b className="ml-1 font-semibold text-rose-600 dark:text-rose-400">· {q.overdueCount} atrasado{q.overdueCount === 1 ? "" : "s"}</b> : null}
                            </span>
                          </span>
                          <span className="font-semibold tabular-nums">{nf(q.count)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Panel>

                <Panel
                  title="Assinaturas"
                  action={
                    <Link href="/admin/assinaturas" className="text-xs font-semibold text-[var(--wq-brand-text)] hover:underline">
                      Gerenciar →
                    </Link>
                  }
                >
                  <div className="grid grid-cols-2 gap-px bg-[var(--wq-border)]">
                    <div className="bg-[var(--wq-surface)] px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">MRR</p>
                      <p className="font-[family-name:var(--font-display)] text-xl font-semibold tabular-nums">{brl0(data.billing.mrr)}</p>
                      <p className="text-[11px] text-[var(--wq-text-muted)]">ativas e em atraso; anual ÷ 12</p>
                    </div>
                    <div className="bg-[var(--wq-surface)] px-4 py-3">
                      <p className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">
                        Recebido · {days}d <DeltaBadge delta={data.billing.received} />
                      </p>
                      <p className="font-[family-name:var(--font-display)] text-xl font-semibold tabular-nums">{brl0(data.billing.received.value)}</p>
                      <p className="text-[11px] text-[var(--wq-text-muted)]">{nf(data.billing.received.payments)} pagamentos no Asaas</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 border-t border-[var(--wq-border)] text-center text-xs">
                    {(
                      [
                        ["Pagas", data.billing.counts.active, ""],
                        ["Fundador", data.billing.counts.founder, ""],
                        ["Em teste", data.billing.counts.trialing, ""],
                        ["Em atraso", data.billing.counts.past_due, data.billing.counts.past_due ? "text-rose-600 dark:text-rose-400" : ""],
                      ] as const
                    ).map(([label, value, tone]) => (
                      <div key={label} className="px-2 py-2.5">
                        <p className={cn("text-base font-semibold tabular-nums", tone)}>{nf(value)}</p>
                        <p className="text-[var(--wq-text-muted)]">{label}</p>
                      </div>
                    ))}
                  </div>
                  {data.billing.byPlan.length ? (
                    <ul className="space-y-1.5 border-t border-[var(--wq-border)] px-4 py-3 text-sm">
                      {data.billing.byPlan.map((p) => (
                        <li key={p.code} className="grid grid-cols-[5rem_1fr_auto] items-center gap-2">
                          <span>{p.label}</span>
                          <span className="h-2 overflow-hidden rounded-full bg-[var(--wq-paper)]">
                            <span
                              className="block h-full rounded-full bg-[var(--wq-brand)]"
                              style={{ width: `${Math.max(4, (p.mrr / Math.max(1, data.billing.mrr)) * 100)}%` }}
                            />
                          </span>
                          <span className="text-xs tabular-nums text-[var(--wq-text-muted)]">
                            <b className="font-semibold text-[var(--wq-text)]">{brl0(p.mrr)}</b> · {p.count}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </Panel>

                <Panel title="Análises">
                  <ul className="grid grid-cols-2 gap-px bg-[var(--wq-border)] text-sm">
                    {[
                      ["/admin/analises", "Produto", "ativação, retenção, uso"],
                      ["/admin/analises?tab=transacoes", "Transações", "pedidos e orçamentos"],
                      ["/admin/analises?tab=lojas", "Lojas", "estágio e risco"],
                      ["/admin/ritual", "Ritual semanal", "cada passo do negócio"],
                    ].map(([href, label, hint]) => (
                      <li key={href}>
                        <Link href={href} className="block bg-[var(--wq-surface)] px-4 py-3 hover:bg-[var(--wq-paper)]">
                          <span className="block font-semibold">{label}</span>
                          <span className="block text-xs text-[var(--wq-text-muted)]">{hint}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Panel>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
