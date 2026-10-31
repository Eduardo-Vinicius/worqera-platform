"use client"

import { useState } from "react"
import { Copy } from "lucide-react"
import { toast } from "sonner"
import { AppHeader } from "@/components/shell/AppHeader"
import {
  getPlatformBusinessV1,
  getPlatformProductV1,
  getPlatformTechV1,
  type PlatformBusiness,
  type PlatformProduct,
  type PlatformTech,
} from "@/lib/apiV1"
import { Bars, Chips, Columns, HealthDot, KpiCard, PERIODS, Skeleton, Spark, brl0, nf, useAutoRefresh } from "@/components/admin/charts"
import { cn } from "@/lib/utils"

type Tab = "tech" | "business" | "product"

const CLIENTS = [
  { id: "all", label: "Todos" },
  { id: "api", label: "API" },
  { id: "mobile", label: "App" },
  { id: "web", label: "Web" },
  { id: "admin", label: "Admin" },
]

const CLIENT_LABEL: Record<string, string> = { web: "Web", ios: "iOS", android: "Android", admin: "Admin", api: "API" }
const VERTICAL_LABEL: Record<string, string> = {
  footwear: "Calçados",
  laundry: "Lavanderia",
  repair: "Assistência",
  auto: "Automotivo",
  carpentry: "Marcenaria",
  printing: "Gráfica",
  production: "Produção",
  general: "Geral",
  custom: "Personalizado",
}

/** Worqera admin → Métricas: technology, business and product, for the team to glance at. */
export default function MetricasPage() {
  const [tab, setTab] = useState<Tab>("tech")
  const [days, setDays] = useState(7)
  const [client, setClient] = useState("all")
  const [tech, setTech] = useState<PlatformTech | null>(null)
  const [business, setBusiness] = useState<PlatformBusiness | null>(null)
  const [product, setProduct] = useState<PlatformProduct | null>(null)
  const [error, setError] = useState("")

  const updated = useAutoRefresh(
    async () => {
      try {
        if (tab === "tech") setTech(await getPlatformTechV1(days, client))
        if (tab === "business") setBusiness(await getPlatformBusinessV1(days))
        if (tab === "product") setProduct(await getPlatformProductV1(days))
        setError("")
      } catch (err: any) {
        setError(err?.message || "Não carregou as métricas")
      }
    },
    [tab, days, client]
  )

  return (
    <div className="-mx-2.5 -mt-3 sm:-mx-5 sm:-mt-5 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-6">
      <AppHeader title="Métricas" subtitle={`Uso, saúde técnica, negócio e produto · ${updated}`} showInbox={false} showOrderJump={false} />
      <div className="mx-auto w-full max-w-[1600px] space-y-4 px-2.5 py-4 sm:px-5 md:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Chips
            value={tab}
            onChange={setTab}
            options={[
              { id: "tech", label: "Tecnologia" },
              { id: "business", label: "Negócio" },
              { id: "product", label: "Produto" },
            ]}
          />
          <div className="flex flex-wrap gap-2">
            {tab === "tech" ? <Chips value={client} onChange={setClient} options={CLIENTS} /> : null}
            <Chips value={days} onChange={setDays} options={PERIODS} />
          </div>
        </div>
        {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</p> : null}
        {tab === "tech" ? <TechTab data={tech} /> : tab === "business" ? <BusinessTab data={business} /> : <ProductTab data={product} />}
      </div>
    </div>
  )
}

function Loading() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
  )
}

function TechTab({ data }: { data: PlatformTech | null }) {
  if (!data) return <Loading />
  const k = data.kpis
  const empty = !k.requests.value && !k.requests.prev
  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] px-4 py-3 text-sm">
        <HealthDot status={data.health.status} label={`Serviço ${data.health.label.toLowerCase()}`} />
        <span className="text-[var(--wq-text-muted)]">
          Banco {data.health.db} · fila {nf(data.health.queue)}
          {data.health.dropped ? ` · ${nf(data.health.dropped)} descartadas` : ""} · 5xx na última hora {data.health.errorRateLastHour.toLocaleString("pt-BR")}% de{" "}
          {nf(data.health.requestsLastHour)}
          {data.health.lastFlushAt ? ` · gravado ${new Date(data.health.lastFlushAt).toLocaleTimeString("pt-BR")}` : ""}
          {!data.health.collecting ? " · coleta desligada" : ""}
        </span>
      </section>

      {empty ? (
        <p className="rounded-2xl border border-dashed border-[var(--wq-border)] px-4 py-8 text-center text-sm text-[var(--wq-text-muted)]">
          Ainda sem dados neste período. A coleta começa depois do deploy desta versão e grava a cada 5 segundos.
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Requisições" value={nf(k.requests.value)} delta={k.requests} />
        <KpiCard label="Usuários ativos" value={nf(k.activeUsers.value)} delta={k.activeUsers} />
        <KpiCard label="Erros 5xx" value={nf(k.errors5xx.value)} delta={k.errors5xx} invert tone={k.errors5xx.value ? "danger" : undefined} />
        <KpiCard label="Taxa de erro" value={`${k.errorRate.value.toLocaleString("pt-BR")}%`} delta={k.errorRate} invert tone={k.errorRate.value > 2 ? "danger" : undefined} />
        <KpiCard label="Latência média" value={`${nf(k.avgMs.value)} ms`} delta={k.avgMs} invert />
        <KpiCard label="p95 (aprox.)" value={`${nf(k.p95Ms.value)} ms`} delta={k.p95Ms} invert hint="faixas de latência" />
        <KpiCard label="Latência máxima" value={`${nf(k.maxMs.value)} ms`} delta={k.maxMs} invert />
        <KpiCard
          label="Rollout do app"
          value={data.appVersions.latest ? `${data.appVersions.onLatestPct}%` : "—"}
          hint={data.appVersions.latest ? `na ${data.appVersions.latest} · ${nf(data.appVersions.mobileUsers)} no app` : "sem dados do app ainda"}
        />
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <Spark points={data.series.requests} label="Requisições por dia" />
        <Spark points={data.series.errors} label="Erros 5xx por dia" color="#e11d48" />
        <Spark points={data.series.activeUsers} label="Usuários ativos por dia" color="#16a34a" />
      </section>

      <Columns points={data.series.halfHours} label="Acessos a cada 30 min" />

      <section className="grid gap-3 lg:grid-cols-3">
        <Bars title="Usuários por região (UF da loja)" rows={data.byRegion.map((r) => ({ label: r.region, value: r.users, note: `${r.pct}%` }))} />
        <Bars title="Usuários por sistema" rows={data.byClient.map((r) => ({ label: CLIENT_LABEL[r.client] || r.client, value: r.users }))} />
        <Bars
          title="Versões do app"
          empty="Aparece quando o app com os novos cabeçalhos for publicado."
          rows={data.appVersions.rows.map((r) => ({
            label: `${r.platform === "ios" ? "iOS" : r.platform === "android" ? "Android" : "Outro"} ${r.version}`,
            value: r.users,
            note: `${r.pct}%`,
            tone: r.version === data.appVersions.latest ? "bg-emerald-500" : "bg-amber-500",
          }))}
        />
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <EndpointTable title="Endpoints mais chamados" rows={data.topEndpoints} />
        <EndpointTable title="Mais lentos (p95)" rows={data.slowest} />
      </section>

      <section className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
        <h2 className="border-b border-[var(--wq-border)] px-4 py-3 text-sm font-semibold">Erros recentes</h2>
        {data.recentErrors.length ? (
          <ul className="divide-y divide-[var(--wq-border)]">
            {data.recentErrors.map((e, i) => (
              <li key={`${e.correlationId}-${i}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
                <span className="rounded-md bg-rose-50 px-1.5 py-0.5 font-mono text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{e.status}</span>
                <span className="min-w-0 flex-1 truncate font-mono text-xs">
                  {e.method} {e.route}
                </span>
                <span className="min-w-0 flex-[2] truncate text-xs text-[var(--wq-text-muted)]" title={e.message}>
                  {e.code ? `${e.code} · ` : ""}
                  {e.message}
                </span>
                <span className="text-xs tabular-nums text-[var(--wq-text-muted)]">{new Date(e.at).toLocaleString("pt-BR")}</span>
                {e.correlationId ? (
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(e.correlationId)
                      toast.success("Correlation id copiado")
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--wq-brand-text)] hover:underline"
                  >
                    <Copy className="h-3 w-3" /> id
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-4 text-sm text-[var(--wq-text-muted)]">Nenhum erro 5xx no período.</p>
        )}
      </section>
    </div>
  )
}

function EndpointTable({ title, rows }: { title: string; rows: PlatformTech["topEndpoints"] }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
      <h2 className="border-b border-[var(--wq-border)] px-4 py-3 text-sm font-semibold">{title}</h2>
      {rows.length ? (
        <ul className="divide-y divide-[var(--wq-border)]">
          {rows.map((r) => (
            <li key={`${r.method}${r.route}`} className="px-4 py-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate font-mono" title={`${r.method} ${r.route}`}>
                  <b>{r.method}</b> {r.route}
                </span>
                <span className="shrink-0 tabular-nums text-[var(--wq-text-muted)]">
                  {nf(r.count)} · {nf(r.avgMs)} ms · p95 {nf(r.p95Ms)}
                  {r.errors5xx ? <b className="ml-1 text-rose-600"> · {r.errors5xx} 5xx</b> : null}
                </span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-[var(--wq-paper)]">
                <div className="h-full rounded-full bg-[var(--wq-brand)]/60" style={{ width: `${(r.count / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-4 text-sm text-[var(--wq-text-muted)]">Sem chamadas no período.</p>
      )}
    </div>
  )
}

function BusinessTab({ data }: { data: PlatformBusiness | null }) {
  if (!data) return <Loading />
  const by = (key: string) => data.metrics.find((m) => m.key === key)
  const headline = ["shops", "ordersCreated", "ordersDelivered", "payments"]
  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="MRR" value={brl0(data.mrr.mrr)} hint={`${nf(data.mrr.paying)} lojas pagantes`} />
        {headline.map((key) => {
          const m = by(key)
          if (!m) return null
          return <KpiCard key={key} label={m.label} value={nf(m.new.value)} delta={m.new} hint={m.total != null ? `${nf(m.total)} no total` : undefined} />
        })}
      </section>
      <section className="flex flex-wrap gap-2 text-xs">
        {Object.entries(data.subscriptions).map(([status, count]) => (
          <span key={status} className="rounded-full border border-[var(--wq-border)] bg-[var(--wq-surface)] px-2.5 py-1">
            {({ trialing: "Em teste", active: "Ativas", past_due: "Atrasadas", canceled: "Canceladas", expired: "Teste encerrado" } as Record<string, string>)[status] || status}:{" "}
            <b>{nf(count)}</b>
          </span>
        ))}
      </section>
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {data.metrics.map((m) => (
          <div key={m.key} className="space-y-1">
            <div className="flex items-center justify-between px-1 text-xs text-[var(--wq-text-muted)]">
              <span>
                {m.money ? brl0(m.new.value) : nf(m.new.value)} no período
                {m.total != null ? ` · ${nf(m.total)} no total` : ""}
              </span>
              <span className={cn(m.new.pct != null && m.new.pct < 0 ? "text-rose-600" : "text-emerald-600")}>
                {m.new.pct == null ? "" : `${m.new.pct > 0 ? "+" : ""}${m.new.pct.toLocaleString("pt-BR")}%`}
              </span>
            </div>
            <Spark points={m.series} label={m.label} format={m.money ? brl0 : nf} />
          </div>
        ))}
      </section>
    </div>
  )
}

function ProductTab({ data }: { data: PlatformProduct | null }) {
  if (!data) return <Loading />
  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-3">
        <KpiCard label="Lojas ativas no período" value={nf(data.activeShops)} hint="com alguém usando" />
        <KpiCard label="Ramos" value={nf(data.verticals.length)} hint={data.verticals[0] ? `mais comum: ${VERTICAL_LABEL[data.verticals[0].key] || data.verticals[0].key}` : ""} />
        <KpiCard label="UFs" value={nf(data.regions.filter((r) => r.key !== "—").length)} hint="pelo endereço da loja" />
      </section>
      <Bars
        title="Cobertura de funcionalidades (% das lojas ativas)"
        format={(v) => `${v}%`}
        rows={data.coverage.map((c) => ({ label: c.label, value: c.pct, note: `${nf(c.shops)} lojas` }))}
      />
      <section className="grid gap-3 lg:grid-cols-3">
        <Bars title="Lojas por ramo" rows={data.verticals.map((v) => ({ label: VERTICAL_LABEL[v.key] || v.key, value: v.count }))} />
        <Bars title="Lojas por UF" rows={data.regions.map((r) => ({ label: r.key, value: r.count }))} />
        <Bars title="Serviços mais pedidos" rows={data.topServices.map((s) => ({ label: s.name, value: s.count }))} />
      </section>
    </div>
  )
}
