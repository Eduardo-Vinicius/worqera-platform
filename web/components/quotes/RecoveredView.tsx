"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Loader2, Trophy, Users, PhoneCall, Percent } from "lucide-react"
import { getRecoveredV1, type RecoveredReport } from "@/lib/apiV1"
import { cn } from "@/lib/utils"
import { brl, relativeTime } from "./quoteUi"

const SPANS = [30, 90, 365] as const

/** Orçamentos → Recuperados: what the problem was, how it was turned around and who did it. */
export function RecoveredView({ onOpen }: { onOpen: (quoteId: string) => void }) {
  const [days, setDays] = useState<(typeof SPANS)[number]>(30)
  const [report, setReport] = useState<RecoveredReport | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getRecoveredV1(days)
      .then((res) => !cancelled && setReport(res))
      .catch(() => !cancelled && setReport(null))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [days])

  const s = report?.summary
  const totals = report?.showsTotals !== false
  const cards = [
    { label: "Recuperados", value: s ? String(s.count) : "—", hint: totals && s ? brl(s.value) : `em ${days} dias`, icon: Trophy, tone: "text-emerald-600 dark:text-emerald-400" },
    { label: "Taxa", value: s ? `${s.rate}%` : "—", hint: s ? `${s.lost} desistiram` : "", icon: Percent, tone: "text-[var(--wq-action)]" },
    { label: "Contatos até fechar", value: s ? String(s.avgContacts).replace(".", ",") : "—", hint: "Média por cliente", icon: PhoneCall, tone: "text-[var(--wq-brand)]" },
    { label: "Pessoas por lead", value: s ? String(s.avgPeople).replace(".", ",") : "—", hint: "Quem atuou, em média", icon: Users, tone: "text-[var(--wq-text)]" },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <p className="text-sm text-[var(--wq-text-muted)]">Quem voltou, por que tinha recusado e o que fez fechar.</p>
        <div className="grid grid-cols-3 rounded-lg border border-[var(--wq-border)] bg-[var(--wq-surface)] p-0.5 sm:inline-flex">
          {SPANS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-xs font-semibold",
                days === d ? "bg-[var(--wq-brand)] text-white" : "text-[var(--wq-text-muted)]"
              )}
            >
              {d === 365 ? "1 ano" : `${d} dias`}
            </button>
          ))}
        </div>
      </div>

      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <div key={c.label} className="min-w-0 rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] px-3 py-3 sm:px-4 sm:py-3.5">
              <div className="flex items-start justify-between gap-1.5">
                <p className="min-w-0 text-[10px] font-semibold uppercase leading-tight tracking-[0.1em] text-[var(--wq-text-muted)] sm:text-[11px]">{c.label}</p>
                <Icon className={cn("h-4 w-4 shrink-0", c.tone)} />
              </div>
              <p className={cn("mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums sm:text-3xl", c.tone)}>{c.value}</p>
              <p className="mt-1 truncate text-xs text-[var(--wq-text-muted)]">{c.hint}</p>
            </div>
          )
        })}
      </section>

      {loading && !report ? (
        <div className="flex items-center justify-center py-16 text-sm text-[var(--wq-text-muted)]">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando recuperados
        </div>
      ) : !report || !report.items.length ? (
        <div className="rounded-2xl border border-dashed border-[var(--wq-border)] px-4 py-10 text-center">
          <p className="font-medium">Nenhum recuperado em {days === 365 ? "1 ano" : `${days} dias`}</p>
          <p className="mt-1 text-sm text-[var(--wq-text-muted)]">
            Ao marcar um orçamento como Recuperado, conte como foi: ele aparece aqui.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 lg:grid-cols-2">
            <section className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-4">
              <h3 className="text-sm font-semibold">Problema → como reverteu</h3>
              <ul className="mt-3 space-y-2.5">
                {report.byReason.map((r) => (
                  <li key={r.reason}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="font-medium">{r.label}</span>
                      <span className="tabular-nums text-[var(--wq-text-muted)]">
                        {r.count} recuperado{r.count === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {r.hows.map((h) => (
                        <span key={h.how} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                          {h.label} · {h.count}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-4">
              <h3 className="text-sm font-semibold">Quem recuperou</h3>
              {report.byPerson.length ? (
                <ol className="mt-3 space-y-2">
                  {report.byPerson.map((p, i) => {
                    const max = report.byPerson[0]?.count || 1
                    return (
                      <li key={p.name} className="text-sm">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate">
                            <span className="mr-1.5 text-[var(--wq-text-muted)]">{i + 1}.</span>
                            {p.name}
                          </span>
                          <span className="shrink-0 tabular-nums text-[var(--wq-text-muted)]">
                            {p.count}
                            {totals && p.value ? ` · ${brl(p.value)}` : ""}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--wq-paper)]">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(6, (p.count / max) * 100)}%` }} />
                        </div>
                      </li>
                    )
                  })}
                </ol>
              ) : (
                <p className="mt-3 text-sm text-[var(--wq-text-muted)]">Ninguém registrado ainda.</p>
              )}
            </section>
          </div>

          <section className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
            <h3 className="border-b border-[var(--wq-border)] px-4 py-3 text-sm font-semibold">Todos os recuperados</h3>
            <ul className="divide-y divide-[var(--wq-border)]">
              {report.items.map((it) => (
                <li key={it.id}>
                  <button type="button" onClick={() => onOpen(it.id)} className="flex w-full min-w-0 items-start gap-3 px-3 py-3 text-left hover:bg-[var(--wq-paper)] sm:px-4">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <Trophy className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-semibold">
                          {it.name}
                          {it.orderCode ? <span className="ml-1.5 font-mono text-xs font-normal text-[var(--wq-text-muted)]">#{it.orderCode}</span> : null}
                        </span>
                        <span className="shrink-0 text-sm font-semibold tabular-nums">{it.value ? brl(it.value) : ""}</span>
                      </span>
                      <span className="mt-0.5 flex flex-wrap gap-1">
                        {it.reasonLabel ? (
                          <span className="rounded-full bg-[var(--wq-paper)] px-2 py-0.5 text-[11px] text-[var(--wq-text-muted)]">{it.reasonLabel}</span>
                        ) : null}
                        {it.howLabel ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                            {it.howLabel}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-xs text-[var(--wq-text-muted)] [overflow-wrap:anywhere]">
                        {[`${it.contacts} contato${it.contacts === 1 ? "" : "s"}`, it.people.length ? it.people.join(", ") : "", relativeTime(it.at)]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                      {it.note ? <span className="block text-xs italic text-[var(--wq-text-muted)] [overflow-wrap:anywhere]">{it.note}</span> : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="border-t border-[var(--wq-border)] px-4 py-2 text-xs text-[var(--wq-text-muted)]">
              Os pedidos recuperados aparecem no kanban com o selo Recuperado.{" "}
              <Link href="/pedidos?recovered=1" className="font-semibold text-[var(--wq-brand-text)] underline-offset-2 hover:underline">
                Ver pedidos
              </Link>
            </p>
          </section>
        </>
      )}
    </div>
  )
}
