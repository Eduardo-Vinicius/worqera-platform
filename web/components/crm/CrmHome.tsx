"use client"

import { useEffect, useState } from "react"
import { ArrowRight, Cake, Loader2, RefreshCw, Repeat, Sparkles, UserMinus, UserPlus, Users } from "lucide-react"
import { getCrmInsightV1, type AiQuota, type CrmInsight } from "@/lib/apiV1"
import { AiQuotaNotice } from "@/components/ai/AiQuotaNotice"
import { cn } from "@/lib/utils"
import { brl, SEGMENT_TAB, type CrmTab } from "./crmUi"

/** CRM → Visão da base: who the clients are, how they behave and what to do this week. */
export function CrmHome({ onTab }: { onTab: (tab: CrmTab) => void }) {
  const [data, setData] = useState<CrmInsight | null>(null)
  const [quota, setQuota] = useState<AiQuota | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const load = (refresh = false) => {
    setBusy(true)
    getCrmInsightV1(refresh)
      .then((res) => {
        setData(res.insight)
        setQuota(res.aiQuota)
        setError("")
      })
      .catch((err) => setError(err?.message || "Não carregou a base"))
      .finally(() => setBusy(false))
  }

  useEffect(() => {
    load()
  }, [])

  if (!data) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-[var(--wq-text-muted)]">
        {error ? error : <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Lendo a base de clientes</>}
      </div>
    )
  }

  const s = data.summary
  const c = s.counts
  const cards: Array<{ label: string; value: string; hint: string; icon: typeof Users; tab?: CrmTab; tone?: string }> = [
    { label: "Clientes", value: String(c.clients), hint: `${c.active90} ativos nos últimos 90 dias`, icon: Users, tab: "todos" },
    { label: "Recorrentes", value: String(c.recurring), hint: `${s.rates.repeat}% voltaram mais de uma vez`, icon: Repeat, tab: "recorrentes", tone: "text-emerald-600 dark:text-emerald-400" },
    { label: "Sumidos", value: String(c.inactive), hint: `Sem pedido há ${s.inactiveDays}+ dias`, icon: UserMinus, tab: "sumidos", tone: c.inactive ? "text-amber-600 dark:text-amber-400" : undefined },
    { label: "Novos", value: String(c.new30), hint: "Primeiro pedido nos últimos 30 dias", icon: UserPlus, tab: "novos", tone: "text-[var(--wq-brand)]" },
    { label: "Aniversariantes", value: String(s.birthdays.today), hint: `${s.birthdays.week} na semana · ${s.rates.birthdayCoverage}% com aniversário`, icon: Cake, tab: "aniversariantes", tone: s.birthdays.today ? "text-rose-600 dark:text-rose-400" : undefined },
  ]
  const buyers = s.buckets.one + s.buckets.two_three + s.buckets.four_plus
  const bar = [
    { label: "1 pedido", value: s.buckets.one, color: "bg-slate-300 dark:bg-slate-600" },
    { label: "2 a 3", value: s.buckets.two_three, color: "bg-[var(--wq-brand)]/60" },
    { label: "4 ou mais", value: s.buckets.four_plus, color: "bg-[var(--wq-brand)]" },
  ]

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--wq-brand)] text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--wq-text-muted)]">
              Leitura da base
              {data.ai ? <span className="rounded-full bg-[var(--wq-brand)] px-1.5 py-0.5 text-[9px] font-bold text-white">IA</span> : null}
            </p>
            <p className="mt-1 text-[15px] font-medium leading-snug sm:text-base">{data.headline}</p>
            {data.tip ? <p className="mt-1.5 text-sm text-[var(--wq-text-muted)]">{data.tip}</p> : null}
            <AiQuotaNotice quota={quota} className="mt-2" />
          </div>
          <button
            type="button"
            onClick={() => load(true)}
            disabled={busy}
            className="rounded-lg p-1.5 text-[var(--wq-text-muted)] hover:bg-[var(--wq-paper)]"
            aria-label="Atualizar"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </button>
        </div>
        {data.moves.length ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {data.moves.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onTab(SEGMENT_TAB[m.segment] || "todos")}
                className="flex items-center justify-between gap-2 rounded-xl border border-[var(--wq-border)] bg-[var(--wq-paper)] px-3 py-2.5 text-left text-sm font-semibold hover:border-[var(--wq-brand)]/50"
              >
                <span className="min-w-0">{m.title}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-[var(--wq-text-muted)]" />
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <section className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <button
              key={card.label}
              type="button"
              onClick={() => card.tab && onTab(card.tab)}
              className="min-w-0 rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] px-3 py-3 text-left transition hover:border-[var(--wq-brand)]/40 sm:px-4"
            >
              <div className="flex items-start justify-between gap-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--wq-text-muted)] sm:text-[11px]">{card.label}</p>
                <Icon className={cn("h-4 w-4 shrink-0", card.tone || "text-[var(--wq-text-muted)]")} />
              </div>
              <p className={cn("mt-1.5 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums sm:text-3xl", card.tone)}>{card.value}</p>
              <p className="mt-0.5 text-xs leading-snug text-[var(--wq-text-muted)]">{card.hint}</p>
            </button>
          )
        })}
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-4">
          <h3 className="text-sm font-semibold">Quantas vezes cada cliente voltou</h3>
          {buyers ? (
            <>
              <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-[var(--wq-paper)]">
                {bar.map((b) => (
                  <span key={b.label} className={b.color} style={{ width: `${(b.value / buyers) * 100}%` }} />
                ))}
              </div>
              <ul className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                {bar.map((b) => (
                  <li key={b.label}>
                    <p className="text-lg font-semibold tabular-nums">{b.value}</p>
                    <p className="text-[var(--wq-text-muted)]">{b.label}</p>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-2 text-sm text-[var(--wq-text-muted)]">Ainda sem pedidos ligados a clientes.</p>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-4">
          <h3 className="text-sm font-semibold">Saúde da base</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex justify-between gap-2">
              <span className="text-[var(--wq-text-muted)]">Ativos (90 dias)</span>
              <span className="font-semibold tabular-nums">{s.rates.active}%</span>
            </li>
            <li className="flex justify-between gap-2">
              <span className="text-[var(--wq-text-muted)]">Voltaram mais de uma vez</span>
              <span className="font-semibold tabular-nums">{s.rates.repeat}%</span>
            </li>
            <li className="flex justify-between gap-2">
              <span className="text-[var(--wq-text-muted)]">Cadastrados sem pedido</span>
              <span className="font-semibold tabular-nums">{c.never}</span>
            </li>
            <li className="flex justify-between gap-2">
              <span className="text-[var(--wq-text-muted)]">Com aniversário cadastrado</span>
              <span className="font-semibold tabular-nums">{s.rates.birthdayCoverage}%</span>
            </li>
            {s.money ? (
              <>
                <li className="flex justify-between gap-2 border-t border-[var(--wq-border)] pt-2">
                  <span className="text-[var(--wq-text-muted)]">Ticket médio</span>
                  <span className="font-semibold tabular-nums">{brl(s.money.avgTicket)}</span>
                </li>
                <li className="flex justify-between gap-2">
                  <span className="text-[var(--wq-text-muted)]">Gasto médio por cliente</span>
                  <span className="font-semibold tabular-nums">{brl(s.money.perClient)}</span>
                </li>
              </>
            ) : null}
          </ul>
        </section>
      </div>
    </div>
  )
}
