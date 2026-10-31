"use client"

import { useEffect, useMemo, useState } from "react"
import { AppHeader } from "@/components/shell/AppHeader"
import {
  getPlatformAdoptionV1,
  getPlatformCohortsV1,
  getPlatformEngagementV1,
  getPlatformFunnelV1,
  getPlatformShopsHealthV1,
  getPlatformTransactionsV1,
  type FunnelStep,
} from "@/lib/apiV1"
import { Bars, Chips, KpiCard, LONG_PERIODS, Skeleton, Spark, brl0, nf, useAutoRefresh } from "@/components/admin/charts"
import { cn } from "@/lib/utils"

type Tab = "produto" | "transacoes" | "lojas"
const TABS: Array<{ id: Tab; label: string }> = [
  { id: "produto", label: "Produto" },
  { id: "transacoes", label: "Transações" },
  { id: "lojas", label: "Lojas" },
]

type Loaded<T> = T extends (...args: any[]) => Promise<infer R> ? R : never

const hours = (h: number | null | undefined) => (h == null ? "—" : h < 48 ? `${nf(Math.round(h))} h` : `${nf(Math.round(h / 24))} dias`)
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "—")
const CLIENT: Record<string, string> = { web: "Site", android: "App Android", ios: "App iOS", api: "API", admin: "Admin" }
const PLAN: Record<string, string> = { WORQERA_BASIC: "Basic", WORQERA_PRO: "Pro", WORQERA_BUSINESS: "Business" }

function Funnel({ title, hint, steps, timeLabel }: { title: string; hint?: string; steps: FunnelStep[]; timeLabel?: string }) {
  return (
    <Bars
      title={title}
      hint={hint}
      rows={steps.map((s, i) => ({
        label: s.label,
        value: s.count,
        note: i ? `${s.pctOfPrev}% da etapa anterior${timeLabel && s.medianHours != null ? ` · ${timeLabel} ${hours(s.medianHours)}` : ""}` : undefined,
      }))}
    />
  )
}

function Panel({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <section className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {hint ? <p className="mt-0.5 text-xs text-[var(--wq-text-muted)]">{hint}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  )
}

function ProdutoTab({ days }: { days: number }) {
  const [d, setD] = useState<{
    funnel: Loaded<typeof getPlatformFunnelV1>
    cohorts: Loaded<typeof getPlatformCohortsV1>
    engagement: Loaded<typeof getPlatformEngagementV1>
    adoption: Loaded<typeof getPlatformAdoptionV1>
  } | null>(null)
  useAutoRefresh(async () => {
    const [funnel, cohorts, engagement, adoption] = await Promise.all([
      getPlatformFunnelV1(days),
      getPlatformCohortsV1(8),
      getPlatformEngagementV1(days),
      getPlatformAdoptionV1(days),
    ])
    setD({ funnel, cohorts, engagement, adoption })
  }, [days], 300000)

  if (!d) return <Skeleton className="h-96" />
  const e = d.engagement
  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Ativos por dia (média)" value={nf(e.dau)} />
        <KpiCard label="Ativos 7 dias" value={nf(e.wau)} />
        <KpiCard label="Ativos 30 dias" value={nf(e.mau)} />
        <KpiCard label="Uso recorrente" value={`${e.stickiness}%`} hint="ativos por dia ÷ ativos 30 dias" />
        <KpiCard label="Novos · recorrentes" value={`${nf(e.newUsers)} · ${nf(e.returningUsers)}`} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Funnel title="Ativação de lojas" hint={`${nf(d.funnel.shops)} lojas cadastradas no período · tempo mediano entre etapas`} steps={d.funnel.steps} timeLabel="mediana" />
        <div className="space-y-4">
          <Spark points={e.series} label="Usuários ativos por dia" />
          <Bars title="Usuários por canal" rows={e.byClient.map((c) => ({ label: CLIENT[c.client] || c.client, value: c.users }))} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Retenção por semana de cadastro" hint="% da turma que voltou em cada semana seguinte">
          {d.cohorts.lowHistory ? (
            <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
              Coleta começou há {nf(d.cohorts.historyDays)} dias — as semanas mais antigas aparecem vazias até ter histórico.
            </p>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full text-xs tabular-nums">
              <thead>
                <tr className="text-[var(--wq-text-muted)]">
                  <th className="py-1 pr-2 text-left font-medium">Semana</th>
                  <th className="px-1 text-right font-medium">Contas</th>
                  {Array.from({ length: d.cohorts.weeks }, (_, k) => (
                    <th key={k} className="px-1 text-center font-medium">
                      S{k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.cohorts.rows.map((r) => (
                  <tr key={r.week}>
                    <td className="py-0.5 pr-2">{new Date(`${r.week}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</td>
                    <td className="px-1 text-right">{nf(r.size)}</td>
                    {Array.from({ length: d.cohorts.weeks }, (_, k) => {
                      const v = r.cells[k]
                      return (
                        <td key={k} className="p-0.5">
                          {v == null || !r.size ? (
                            <span className="block h-6" />
                          ) : (
                            <span
                              className="flex h-6 items-center justify-center rounded"
                              style={{ background: `color-mix(in srgb, var(--wq-brand) ${Math.max(6, v)}%, transparent)`, color: v > 55 ? "white" : undefined }}
                            >
                              {v}
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Bars
          title="Uso de recursos"
          hint={`entre ${nf(d.adoption.activeShops)} lojas ativas no período`}
          rows={d.adoption.adoption.map((a) => ({ label: a.label, value: a.pct, note: `${nf(a.shops)} lojas` }))}
          format={(v) => `${v}%`}
        />
      </div>
    </div>
  )
}

function TransacoesTab({ days }: { days: number }) {
  const [d, setD] = useState<Loaded<typeof getPlatformTransactionsV1> | null>(null)
  useAutoRefresh(async () => setD(await getPlatformTransactionsV1(days)), [days], 300000)
  if (!d) return <Skeleton className="h-96" />
  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Tempo até entregar (mediana)" value={hours(d.orders.medianHoursToDeliver)} />
        <KpiCard label="Pedidos cancelados" value={nf(d.orders.cancelled)} tone={d.orders.cancelled ? "warn" : undefined} />
        <KpiCard label="Orçamentos · valor recuperado" value={brl0(d.quotes.wonValue)} hint={`de ${brl0(d.quotes.value)} em orçamentos`} />
        <KpiCard label="Primeiro contato (mediana)" value={hours(d.quotes.medianHoursToFirstContact)} hint={`${nf(d.quotes.lost)} perdidos`} />
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <Funnel title="Pedidos: do cadastro ao pagamento" hint="pedidos criados no período, pela etapa em que estão hoje" steps={d.orders.steps} />
        <Funnel title="Orçamentos: recuperação" steps={d.quotes.steps} />
        <Bars title="Pedidos por faixa de valor" rows={d.orders.valueBands.map((b) => ({ label: b.label, value: b.count }))} />
        <Bars title="Serviços mais pedidos" rows={d.orders.topServices.map((s) => ({ label: s.name, value: s.count }))} />
      </div>
    </div>
  )
}

function LojasTab({ days }: { days: number }) {
  const [d, setD] = useState<Loaded<typeof getPlatformShopsHealthV1> | null>(null)
  const [onlyRisk, setOnlyRisk] = useState(false)
  useAutoRefresh(async () => setD(await getPlatformShopsHealthV1(days)), [days], 300000)
  const rows = useMemo(() => (d ? (onlyRisk ? d.shops.filter((s) => s.atRisk) : d.shops) : []), [d, onlyRisk])
  if (!d) return <Skeleton className="h-96" />
  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {d.pipeline.map((p) => (
          <KpiCard key={p.stage} label={p.label} value={nf(p.count)} />
        ))}
        <KpiCard label="Em risco" value={nf(d.atRisk)} tone={d.atRisk ? "danger" : "ok"} hint="sem uso há 30 dias ou pedidos caindo" />
      </section>
      <section className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
        <div className="flex items-center justify-between border-b border-[var(--wq-border)] px-4 py-3">
          <h2 className="text-sm font-semibold">Saúde das lojas</h2>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={onlyRisk} onChange={(ev) => setOnlyRisk(ev.target.checked)} />
            Só em risco
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-[var(--wq-text-muted)]">
              <tr>
                <th className="px-4 py-2 font-medium">Loja</th>
                <th className="px-4 py-2 font-medium">Plano</th>
                <th className="px-4 py-2 text-right font-medium">MRR</th>
                <th className="hidden px-4 py-2 text-right font-medium md:table-cell">Equipe</th>
                <th className="px-4 py-2 text-right font-medium">Pedidos · {days}d</th>
                <th className="hidden px-4 py-2 font-medium md:table-cell">Último uso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--wq-border)]">
              {rows.slice(0, 200).map((s) => (
                <tr key={s.id} className={cn(s.atRisk && "bg-rose-50/60 dark:bg-rose-950/20")}>
                  <td className="px-4 py-2">
                    <span className="font-medium">{s.name}</span>
                    {s.riskReason ? <span className="block text-xs text-rose-700 dark:text-rose-300">{s.riskReason}</span> : null}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {s.plan ? PLAN[s.plan] || s.plan : "—"}
                    {s.subscription ? <span className="block text-[var(--wq-text-muted)]">{s.subscription}</span> : null}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{s.mrr ? brl0(s.mrr) : "—"}</td>
                  <td className="hidden px-4 py-2 text-right tabular-nums md:table-cell">{nf(s.members)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {nf(s.orders)}
                    {s.change != null ? (
                      <span className={cn("ml-1 text-xs", s.change < 0 ? "text-rose-600" : "text-emerald-600")}>
                        {s.change > 0 ? "+" : ""}
                        {s.change}%
                      </span>
                    ) : null}
                  </td>
                  <td className="hidden px-4 py-2 text-xs text-[var(--wq-text-muted)] md:table-cell">
                    {s.idleDays == null ? "nunca" : s.idleDays === 0 ? "hoje" : `há ${nf(s.idleDays)} dias`}
                    <span className="block">desde {when(s.createdAt)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default function AnalisesPage() {
  const [tab, setTab] = useState<Tab>("produto")
  const [days, setDays] = useState(30)
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("tab")
    if (TABS.some((t) => t.id === wanted)) setTab(wanted as Tab)
  }, [])
  return (
    <div className="-mx-2.5 -mt-3 sm:-mx-5 sm:-mt-5 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-6">
      <AppHeader title="Análises" subtitle="Ativação, retenção, transações e saúde das lojas" showInbox={false} showOrderJump={false} />
      <div className="mx-auto w-full max-w-[1600px] space-y-4 px-2.5 py-4 sm:px-5 md:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Chips value={tab} onChange={setTab} options={TABS} />
          <Chips value={days} onChange={setDays} options={LONG_PERIODS} />
        </div>
        {tab === "produto" ? <ProdutoTab days={days} /> : tab === "transacoes" ? <TransacoesTab days={days} /> : <LojasTab days={days} />}
      </div>
    </div>
  )
}
