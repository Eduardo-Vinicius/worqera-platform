"use client"

import type { Quote, QuoteStage, QuoteSummary } from "@/lib/apiV1"
import { cn } from "@/lib/utils"
import { STAGES, brl, stageBar } from "./quoteUi"

export type QuoteSection = "ligar-hoje" | "funil" | "recuperados"

/** Top of Orçamentos: the four numbers (each jumps to its section) and the funnel as one bar. */
export function QuoteSummaryPanel({
  summary,
  board,
  onJump,
}: {
  summary: QuoteSummary | null
  board: Quote[]
  onJump: (section: QuoteSection) => void
}) {
  const kpis: Array<{ label: string; value: string; hint: string; tone: string; to: QuoteSection }> = [
    {
      label: "Ligar hoje",
      value: summary ? String(summary.todayCount) : "—",
      hint: summary?.overdueCount ? `${summary.overdueCount} com retorno atrasado` : "Nada atrasado",
      tone: summary?.overdueCount ? "text-rose-600 dark:text-rose-400" : "text-[var(--wq-brand)]",
      to: "ligar-hoje",
    },
    {
      label: "Na mesa",
      value: summary ? brl(summary.openValue) : "—",
      hint: summary ? `${summary.openCount} em aberto` : "",
      tone: "text-[var(--wq-text)]",
      to: "funil",
    },
    {
      label: "Recuperado · 30 dias",
      value: summary ? brl(summary.wonValue30d) : "—",
      hint: summary ? `${summary.wonCount30d} cliente${summary.wonCount30d === 1 ? "" : "s"} voltou` : "",
      tone: "text-emerald-600 dark:text-emerald-400",
      to: "recuperados",
    },
    {
      label: "Taxa de recuperação",
      value: summary ? `${summary.recoveryRate}%` : "—",
      hint: "Fechou ÷ (fechou + desistiu)",
      tone: "text-[var(--wq-action)]",
      to: "recuperados",
    },
  ]

  const counts = STAGES.map((s) => ({ ...s, count: board.filter((q) => q.stage === s.id).length }))
  const total = counts.reduce((sum, s) => sum + s.count, 0)

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
      <div className="grid grid-cols-2 gap-px bg-[var(--wq-border)] lg:grid-cols-4">
        {kpis.map((k) => (
          <button key={k.label} type="button" onClick={() => onJump(k.to)} className="bg-[var(--wq-surface)] px-4 py-3.5 text-left transition hover:bg-[var(--wq-paper)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">{k.label}</p>
            <p className={cn("mt-1.5 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums tracking-tight sm:text-[28px]", k.tone)}>{k.value}</p>
            <p className="mt-0.5 truncate text-xs text-[var(--wq-text-muted)]">{k.hint}</p>
          </button>
        ))}
      </div>
      {total ? (
        <button type="button" onClick={() => onJump("funil")} className="block w-full border-t border-[var(--wq-border)] px-4 py-3 text-left transition hover:bg-[var(--wq-paper)]">
          <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
            {counts
              .filter((s) => s.count)
              .map((s) => (
                <span key={s.id} className={cn("h-full", stageBar(s.id as QuoteStage))} style={{ width: `${(s.count / total) * 100}%` }} />
              ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--wq-text-muted)]">
            {counts.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-full", stageBar(s.id as QuoteStage))} />
                {s.label}
                <b className="font-semibold tabular-nums text-[var(--wq-text)]">{s.count}</b>
              </span>
            ))}
          </div>
        </button>
      ) : null}
    </section>
  )
}
