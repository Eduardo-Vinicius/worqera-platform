"use client"

import { ArrowRight, Snowflake, Timer } from "lucide-react"
import type { Quote, QuoteStage, QuoteSummary } from "@/lib/apiV1"
import { cn } from "@/lib/utils"
import { STAGES, brl, stageBar } from "./quoteUi"

export type QuoteSection = "ligar-hoje" | "funil" | "recuperados"

/** What to do about the most common reason for losing a quote. */
const REASON_TIP: Record<string, string> = {
  price: "Ofereça parcelar ou uma opção mais simples do serviço.",
  deadline: "Mostre o prazo real no orçamento e ofereça uma opção mais rápida.",
  thinking: "Marque um retorno em 2 dias: quem está pensando decide com um lembrete.",
  other_shop: "Pergunte o que pesou na escolha e mostre o que entra no seu serviço.",
  no_need: "Deixe a porta aberta e chame de novo quando o item precisar.",
  other: "Anote o motivo real ao marcar como perdido para entender o que acontece.",
}

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
            {counts.map((s) => {
              const value = summary?.openValueByStage?.[s.id as keyof QuoteSummary["openValueByStage"]]
              return (
                <span key={s.id} className="inline-flex items-center gap-1.5">
                  <span className={cn("h-2 w-2 rounded-full", stageBar(s.id as QuoteStage))} />
                  {s.label}
                  <b className="font-semibold tabular-nums text-[var(--wq-text)]">{s.count}</b>
                  {value ? <span className="tabular-nums">· {brl(value)}</span> : null}
                </span>
              )
            })}
          </div>
        </button>
      ) : null}
      {summary ? <Insights summary={summary} onJump={onJump} /> : null}
    </section>
  )
}

function Insights({ summary, onJump }: { summary: QuoteSummary; onJump: (section: QuoteSection) => void }) {
  const reasons = summary.lostReasons90d || []
  const lost = reasons.reduce((sum, r) => sum + r.count, 0)
  const top = reasons[0]
  const max = Math.max(1, ...reasons.map((r) => r.count))
  return (
    <div className="grid gap-px border-t border-[var(--wq-border)] bg-[var(--wq-border)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]">
      <button type="button" onClick={() => onJump("funil")} className="group bg-[var(--wq-surface)] px-4 py-3.5 text-left transition hover:bg-[var(--wq-paper)]">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">
          <Snowflake className="h-3.5 w-3.5 text-sky-500" /> Esfriando
        </p>
        <p className="mt-1.5 font-[family-name:var(--font-display)] text-xl font-semibold tabular-nums">{brl(summary.cooling?.value || 0)}</p>
        <p className="mt-0.5 text-xs text-[var(--wq-text-muted)]">
          {summary.cooling?.count
            ? `${summary.cooling.count} orçamento${summary.cooling.count === 1 ? "" : "s"} sem contato há 7+ dias`
            : "Todo orçamento aberto teve contato na semana"}
        </p>
        {summary.cooling?.count ? (
          <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[var(--wq-brand-text)]">
            Ver no funil <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </span>
        ) : null}
      </button>
      <div className="bg-[var(--wq-surface)] px-4 py-3.5">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">
          <Timer className="h-3.5 w-3.5 text-emerald-500" /> Tempo até recuperar
        </p>
        <p className="mt-1.5 font-[family-name:var(--font-display)] text-xl font-semibold tabular-nums">
          {summary.medianDaysToWin90d == null ? "—" : `${summary.medianDaysToWin90d.toLocaleString("pt-BR")} dia${summary.medianDaysToWin90d === 1 ? "" : "s"}`}
        </p>
        <p className="mt-0.5 text-xs text-[var(--wq-text-muted)]">
          {summary.medianDaysToWin90d == null ? "Aparece com o primeiro recuperado" : "Mediana dos recuperados em 90 dias. Passou disso, ligue."}
        </p>
      </div>
      <div className="bg-[var(--wq-surface)] px-4 py-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">Por que perdemos · 90 dias</p>
        {lost ? (
          <>
            <ul className="mt-2 space-y-1.5">
              {reasons.slice(0, 4).map((r) => (
                <li key={r.reason} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-2 text-sm">
                  <span className="truncate">{r.label}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-[var(--wq-paper)]">
                    <span className="block h-full rounded-full bg-slate-400 dark:bg-slate-500" style={{ width: `${Math.max(6, (r.count / max) * 100)}%` }} />
                  </span>
                  <span className="text-right text-xs tabular-nums text-[var(--wq-text-muted)]">
                    <b className="font-semibold text-[var(--wq-text)]">{r.count}</b> · {brl(r.value)}
                  </span>
                </li>
              ))}
            </ul>
            {top ? (
              <p className="mt-2 text-xs text-[var(--wq-text-muted)]">
                <b className="font-semibold text-[var(--wq-text)]">{top.label}</b> é o motivo nº 1 ({Math.round((top.count / lost) * 100)}%). {REASON_TIP[top.reason] || REASON_TIP.other}
              </p>
            ) : null}
          </>
        ) : (
          <p className="mt-1.5 text-xs text-[var(--wq-text-muted)]">Nenhum orçamento perdido nos últimos 90 dias.</p>
        )}
      </div>
    </div>
  )
}
