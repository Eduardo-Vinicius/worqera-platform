"use client"

import { Fragment, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AppHeader } from "@/components/shell/AppHeader"
import {
  getPlatformAdoptionV1,
  getPlatformCohortsV1,
  getPlatformEngagementV1,
  getPlatformFunnelV1,
  getPlatformShopsHealthV1,
  getPlatformTransactionsV1,
  enterPlatformShop,
  type FunnelStep,
  type PlatformShopHealth,
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

const FLAG_LABEL: Record<PlatformShopHealth["flags"][number], string> = {
  at_risk: "Em risco",
  no_onboarding: "Sem onboarding",
  trial_ending: "Teste acabando",
  past_due: "Em atraso",
  no_orders_30d: "Sem pedido 30d",
}
type ShopSort = "orders" | "mrr" | "idleDays" | "members" | "createdAt"

function LojasTab({ days }: { days: number }) {
  const [d, setD] = useState<Loaded<typeof getPlatformShopsHealthV1> | null>(null)
  const [flag, setFlag] = useState<"all" | PlatformShopHealth["flags"][number]>("all")
  const [q, setQ] = useState("")
  const [sort, setSort] = useState<ShopSort>("orders")
  const [open, setOpen] = useState<string | null>(null)
  useAutoRefresh(async () => setD(await getPlatformShopsHealthV1(days)), [days], 300000)
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("flag")
    if (wanted && wanted in FLAG_LABEL) setFlag(wanted as PlatformShopHealth["flags"][number])
  }, [])
  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const s of d?.shops || []) for (const f of s.flags) c[f] = (c[f] || 0) + 1
    return c
  }, [d])
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    const list = (d?.shops || []).filter((s) => (flag === "all" || s.flags.includes(flag)) && (!term || `${s.name} ${s.owner?.email || ""}`.toLowerCase().includes(term)))
    const value = (s: PlatformShopHealth) => (sort === "createdAt" ? -new Date(s.createdAt).getTime() : sort === "idleDays" ? (s.idleDays ?? 9999) : Number(s[sort]) || 0)
    return list.slice().sort((a, b) => value(b) - value(a))
  }, [d, flag, q, sort])
  if (!d) return <Skeleton className="h-96" />
  const th = (key: ShopSort, label: string, className = "") => (
    <th className={cn("px-4 py-2 font-medium", className)}>
      <button type="button" onClick={() => setSort(key)} className={cn("hover:underline", sort === key && "text-[var(--wq-text)]")}>
        {label}
        {sort === key ? " ↓" : ""}
      </button>
    </th>
  )
  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {d.pipeline.map((p) => (
          <KpiCard key={p.stage} label={p.label} value={nf(p.count)} />
        ))}
        <KpiCard label="Em risco" value={nf(d.atRisk)} tone={d.atRisk ? "danger" : "ok"} hint="sem uso há 30 dias ou pedidos caindo" />
      </section>
      <section className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--wq-border)] px-4 py-3">
          <h2 className="mr-2 text-sm font-semibold">Saúde das lojas</h2>
          {(["all", ...Object.keys(FLAG_LABEL)] as Array<"all" | PlatformShopHealth["flags"][number]>).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFlag(key)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-semibold",
                flag === key ? "border-[var(--wq-brand)] bg-[var(--wq-brand)] text-white" : "border-[var(--wq-border)] hover:bg-[var(--wq-paper)]"
              )}
            >
              {key === "all" ? "Todas" : FLAG_LABEL[key]} <span className="opacity-75">{key === "all" ? d.shops.length : counts[key] || 0}</span>
            </button>
          ))}
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar loja ou dono"
            className="ml-auto h-8 w-52 rounded-[10px] border border-[var(--wq-border)] bg-[var(--wq-surface)] px-3 text-sm"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-[var(--wq-text-muted)]">
              <tr>
                <th className="px-4 py-2 font-medium">Loja</th>
                <th className="px-4 py-2 font-medium">Plano</th>
                {th("mrr", "MRR", "text-right")}
                {th("members", "Equipe", "hidden text-right md:table-cell")}
                {th("orders", `Pedidos · ${days}d`, "text-right")}
                {th("idleDays", "Sem uso", "hidden md:table-cell")}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--wq-border)]">
              {rows.slice(0, 300).map((s) => (
                <Fragment key={s.id}>
                  <tr onClick={() => setOpen(open === s.id ? null : s.id)} className={cn("cursor-pointer hover:bg-[var(--wq-paper)]", s.atRisk && "bg-rose-50/60 dark:bg-rose-950/20")}>
                    <td className="px-4 py-2">
                      <span className="font-medium">{s.name}</span>
                      {s.flags.length ? (
                        <span className="mt-0.5 flex flex-wrap gap-1">
                          {s.flags.map((f) => (
                            <span key={f} className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                              {FLAG_LABEL[f]}
                            </span>
                          ))}
                        </span>
                      ) : null}
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
                      {s.idleDays == null ? "nunca usou" : s.idleDays === 0 ? "usou hoje" : `${nf(s.idleDays)} dias`}
                    </td>
                  </tr>
                  {open === s.id ? (
                    <tr className="bg-[var(--wq-paper)]/60">
                      <td colSpan={6} className="px-4 py-3 text-sm">
                        <div className="grid gap-3 sm:grid-cols-4">
                          <p>
                            <span className="block text-xs text-[var(--wq-text-muted)]">Criada em</span>
                            {when(s.createdAt)}
                          </p>
                          <p>
                            <span className="block text-xs text-[var(--wq-text-muted)]">Último uso</span>
                            {s.lastActivity ? when(s.lastActivity) : "nunca"}
                          </p>
                          <p>
                            <span className="block text-xs text-[var(--wq-text-muted)]">Teste até</span>
                            {s.trialEndsAt ? when(s.trialEndsAt) : "—"}
                          </p>
                          <p>
                            <span className="block text-xs text-[var(--wq-text-muted)]">Pedidos no período anterior</span>
                            {nf(s.ordersPrev)}
                          </p>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {s.owner ? (
                            <Link href={`/admin/contas/${s.owner.id}`} className="inline-flex h-8 items-center rounded-[10px] border border-[var(--wq-border)] bg-[var(--wq-surface)] px-3 text-xs font-semibold hover:bg-[var(--wq-paper)]">
                              Dono: {s.owner.email} →
                            </Link>
                          ) : null}
                          <Link href={`/admin/assinaturas?q=${encodeURIComponent(s.name)}`} className="inline-flex h-8 items-center rounded-[10px] border border-[var(--wq-border)] bg-[var(--wq-surface)] px-3 text-xs font-semibold hover:bg-[var(--wq-paper)]">
                            Ver assinatura →
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              enterPlatformShop({ id: s.id, name: s.name })
                              window.location.href = "/dashboard"
                            }}
                            className="inline-flex h-8 items-center rounded-[10px] bg-[var(--wq-action)] px-3 text-xs font-semibold text-white"
                          >
                            Entrar na loja
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
          {!rows.length ? <p className="px-4 py-6 text-sm text-[var(--wq-text-muted)]">Nenhuma loja com esse filtro.</p> : null}
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
