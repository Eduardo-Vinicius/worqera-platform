"use client"

import { useEffect, useState } from "react"
import { ArrowRight, BellRing, Cake, Crown, HandCoins, Loader2, RefreshCw, Sparkles, UserMinus } from "lucide-react"
import { getCrmInsightV1, type AiQuota, type CrmInsight } from "@/lib/apiV1"
import { AiQuotaNotice } from "@/components/ai/AiQuotaNotice"
import { cn } from "@/lib/utils"
import { brl, SEGMENT_TAB, type CrmTab } from "./crmUi"
import { CrmRetention } from "./CrmRetention"

function Panel({ title, hint, children, className }: { title: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-4 sm:p-5", className)}>
      <h3 className="text-sm font-semibold">{title}</h3>
      {hint ? <p className="text-xs text-[var(--wq-text-muted)]">{hint}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  )
}

/** CRM → Visão da base: one reading, one strip of numbers, the money to act on, who comes back and the profile. */
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
  const money = s.money

  const strip: Array<{ label: string; value: string; hint: string; tab?: CrmTab }> = [
    { label: "Clientes", value: c.clients.toLocaleString("pt-BR"), hint: `${c.never} sem pedido`, tab: "todos" },
    { label: "Ativos · 90 dias", value: c.active90.toLocaleString("pt-BR"), hint: `${s.rates.active}% da base` },
    { label: "Recorrentes", value: c.recurring.toLocaleString("pt-BR"), hint: `${s.rates.repeat}% voltaram`, tab: "recorrentes" },
    { label: "Novos · 30 dias", value: c.new30.toLocaleString("pt-BR"), hint: "primeiro pedido", tab: "novos" },
    ...(money
      ? [{ label: "Ticket médio", value: brl(money.avgTicket), hint: `${brl(money.perClient)} por cliente` }]
      : [{ label: "Sumidos", value: String(c.inactive), hint: `${s.inactiveDays}+ dias`, tab: "sumidos" as CrmTab }]),
  ]

  const actions: Array<{ icon: typeof HandCoins; label: string; value: string; hint: string; tab: CrmTab; tone: string; hot: boolean }> = [
    ...(money
      ? [
          {
            icon: HandCoins,
            label: "A receber",
            value: brl(money.owed),
            hint: c.owing ? `${c.owing} cliente${c.owing === 1 ? "" : "s"} com saldo` : "Ninguém devendo",
            tab: "devendo" as CrmTab,
            tone: "text-amber-600 dark:text-amber-400",
            hot: c.owing > 0,
          },
        ]
      : []),
    {
      icon: BellRing,
      label: "Hora de voltar",
      value: String(c.due),
      hint: "passaram do tempo de costume",
      tab: "voltar",
      tone: "text-[var(--wq-brand)]",
      hot: c.due > 0,
    },
    {
      icon: Cake,
      label: "Aniversariantes",
      value: String(s.birthdays.today),
      hint: `hoje · ${s.birthdays.week} na semana`,
      tab: "aniversariantes",
      tone: "text-rose-600 dark:text-rose-400",
      hot: s.birthdays.today > 0,
    },
    {
      icon: UserMinus,
      label: "Sumiram",
      value: money ? brl(money.inactiveSpent) : String(c.inactive),
      hint: `${c.inactive} cliente${c.inactive === 1 ? "" : "s"} · ${money ? "já gastaram" : `${s.inactiveDays}+ dias`}`,
      tab: "sumidos",
      tone: "text-[var(--wq-text)]",
      hot: false,
    },
    ...(money && money.topShare != null
      ? [
          {
            icon: Crown,
            label: "Melhores clientes",
            value: `${money.topShare}%`,
            hint: "da receita vem dos 20% que mais gastam",
            tab: "vip" as CrmTab,
            tone: "text-emerald-600 dark:text-emerald-400",
            hot: false,
          },
        ]
      : []),
  ]

  const buyers = s.buckets.one + s.buckets.two_three + s.buckets.four_plus
  const bar = [
    { label: "1 pedido", value: s.buckets.one, color: "bg-slate-300 dark:bg-slate-600" },
    { label: "2 a 3", value: s.buckets.two_three, color: "bg-[#AE50FD]" },
    { label: "4 ou mais", value: s.buckets.four_plus, color: "bg-[#7D26DE]" },
  ]
  const sourceMax = Math.max(1, ...s.sources.map((x) => x.clients))

  return (
    <div className="space-y-4">
      {/* Reading of the base: one line, moves as quick links */}
      <section className="rounded-2xl bg-[linear-gradient(120deg,color-mix(in_srgb,var(--wq-brand)_10%,var(--wq-surface)),var(--wq-surface)_70%)] px-4 py-4 ring-1 ring-[var(--wq-border)] sm:px-5">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--wq-brand)]" />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-medium leading-snug sm:text-base">{data.headline}</p>
            {data.tip ? <p className="mt-1 text-sm text-[var(--wq-text-muted)]">{data.tip}</p> : null}
            <AiQuotaNotice quota={quota} className="mt-2" />
            {data.moves.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {data.moves.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onTab(SEGMENT_TAB[m.segment] || "todos")}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[var(--wq-surface)] px-3 py-1.5 text-xs font-semibold ring-1 ring-[var(--wq-border)] transition hover:ring-[var(--wq-brand)]/50"
                  >
                    {m.title}
                    <ArrowRight className="h-3.5 w-3.5 text-[var(--wq-text-muted)]" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => load(true)}
            disabled={busy}
            className="rounded-lg p-1.5 text-[var(--wq-text-muted)] hover:bg-[var(--wq-paper)]"
            aria-label="Atualizar leitura"
            title={data.ai ? "Leitura feita pela IA · atualizar" : "Atualizar"}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </button>
        </div>
      </section>

      {/* One strip of numbers instead of a wall of cards */}
      <section className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-border)] sm:grid-cols-5">
        {strip.map((k, i) => {
          const body = (
            <>
              <p className="text-[11px] font-medium text-[var(--wq-text-muted)]">{k.label}</p>
              <p className="mt-0.5 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums tracking-tight">{k.value}</p>
              <p className="text-xs text-[var(--wq-text-muted)]">{k.hint}</p>
            </>
          )
          const cls = cn("bg-[var(--wq-surface)] px-4 py-3.5 text-left", i === strip.length - 1 && strip.length % 2 === 1 ? "col-span-2 sm:col-span-1" : "")
          return k.tab ? (
            <button key={k.label} type="button" onClick={() => onTab(k.tab!)} className={cn(cls, "transition hover:bg-[var(--wq-paper)]")}>
              {body}
            </button>
          ) : (
            <div key={k.label} className={cls}>
              {body}
            </div>
          )
        })}
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)]">
        <CrmRetention onTab={onTab} />

        {/* What to act on, as a list (value + why + where it goes) */}
        <Panel title="Oportunidades" hint="Dinheiro e contatos esperando por você">
          <ul className="-mx-2 divide-y divide-[var(--wq-border)]">
            {actions.map((a) => {
              const Icon = a.icon
              return (
                <li key={a.label}>
                  <button
                    type="button"
                    onClick={() => onTab(a.tab)}
                    className="group flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition hover:bg-[var(--wq-paper)]"
                  >
                    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--wq-paper)]", a.tone)}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-sm font-medium">
                        {a.label}
                        {a.hot ? <span className="h-1.5 w-1.5 rounded-full bg-[var(--wq-action)]" aria-hidden /> : null}
                      </span>
                      <span className="block truncate text-xs text-[var(--wq-text-muted)]">{a.hint}</span>
                    </span>
                    <span className={cn("shrink-0 font-[family-name:var(--font-display)] text-lg font-semibold tabular-nums", a.tone)}>{a.value}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-[var(--wq-text-muted)] transition group-hover:translate-x-0.5" />
                  </button>
                </li>
              )
            })}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Perfil da base" hint="Quantas vezes cada cliente comprou">
          {buyers ? (
            <>
              <div className="flex h-2.5 overflow-hidden rounded-full bg-[var(--wq-paper)]">
                {bar.map((b) => (
                  <span key={b.label} className={b.color} style={{ width: `${(b.value / buyers) * 100}%` }} />
                ))}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {bar.map((b) => (
                  <div key={b.label} className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", b.color)} />
                    <span className="text-xs text-[var(--wq-text-muted)]">{b.label}</span>
                    <span className="ml-auto text-sm font-semibold tabular-nums">{b.value}</span>
                  </div>
                ))}
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-[var(--wq-border)] pt-3 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--wq-text-muted)]">Com aniversário</dt>
                  <dd className="font-semibold tabular-nums">{s.rates.birthdayCoverage}%</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--wq-text-muted)]">Com origem</dt>
                  <dd className="font-semibold tabular-nums">{s.rates.sourceCoverage}%</dd>
                </div>
              </dl>
            </>
          ) : (
            <p className="text-sm text-[var(--wq-text-muted)]">Ainda sem pedidos ligados a clientes.</p>
          )}
        </Panel>

        <Panel title="De onde vêm os clientes" hint={`${s.rates.sourceCoverage}% com origem cadastrada`}>
          {s.sources.length ? (
            <ul className="space-y-2.5">
              {s.sources.map((src) => (
                <li key={src.source} className="grid grid-cols-[minmax(0,8rem)_1fr_auto] items-center gap-3 text-sm">
                  <span className="truncate">{src.source}</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-[var(--wq-paper)]">
                    <span className="block h-full rounded-full bg-[var(--wq-brand)]" style={{ width: `${Math.max(4, (src.clients / sourceMax) * 100)}%` }} />
                  </span>
                  <span className="text-right text-xs tabular-nums text-[var(--wq-text-muted)]">
                    <b className="font-semibold text-[var(--wq-text)]">{src.clients}</b>
                    {src.spent != null ? ` · ${brl(src.spent)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--wq-text-muted)]">Pergunte “como conheceu a loja?” no balcão para saber onde vale investir.</p>
          )}
        </Panel>
      </div>
    </div>
  )
}
