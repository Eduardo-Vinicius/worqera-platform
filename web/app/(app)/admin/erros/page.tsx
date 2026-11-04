"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { AdminPage, AdminPanel, CLIENT_LABEL, when } from "@/components/admin/AdminPage"
import { Chips, KpiCard, PERIODS, Skeleton, nf, useAutoRefresh } from "@/components/admin/charts"
import { getPlatformTechV1, listPlatformErrorsV1, type PlatformErrorRow, type PlatformTech } from "@/lib/apiV1"
import { cn } from "@/lib/utils"

const CLIENTS = [
  { id: "all", label: "Todos" },
  { id: "web", label: "Site" },
  { id: "mobile", label: "App" },
  { id: "admin", label: "Admin" },
  { id: "api", label: "API" },
]

type SortKey = "count" | "p95Ms" | "avgMs" | "errors5xx"

/** Erros e rotas: every route with its timing and every recent 5xx, filtered by system. */
export default function ErrosPage() {
  const [days, setDays] = useState(7)
  const [client, setClient] = useState("all")
  const [tech, setTech] = useState<PlatformTech | null>(null)
  const [errors, setErrors] = useState<PlatformErrorRow[] | null>(null)
  const [q, setQ] = useState("")
  const [term, setTerm] = useState("")
  const [routeQuery, setRouteQuery] = useState("")
  const [sort, setSort] = useState<SortKey>("count")

  useEffect(() => {
    const t = window.setTimeout(() => setTerm(q.trim()), 300)
    return () => window.clearTimeout(t)
  }, [q])

  const updated = useAutoRefresh(
    async () => {
      try {
        const [t, e] = await Promise.all([getPlatformTechV1(days, client), listPlatformErrorsV1({ days, client, q: term || undefined })])
        setTech(t)
        setErrors(e.errors)
      } catch (err: any) {
        toast.error(err?.message || "Não carregou")
      }
    },
    [days, client, term],
    30000
  )

  const routes = useMemo(() => {
    const list = tech?.allEndpoints || tech?.topEndpoints || []
    const rq = routeQuery.trim().toLowerCase()
    return (rq ? list.filter((r) => `${r.method} ${r.route}`.toLowerCase().includes(rq)) : list).slice().sort((a, b) => b[sort] - a[sort])
  }, [tech, routeQuery, sort])

  const copy = (value: string) => {
    if (!value) return
    void navigator.clipboard.writeText(value).then(() => toast.success("Correlation copiado"))
  }

  const th = (key: SortKey, label: string) => (
    <th className="px-4 py-2 text-right font-medium">
      <button type="button" onClick={() => setSort(key)} className={cn("hover:underline", sort === key && "text-[var(--wq-text)]")}>
        {label}
        {sort === key ? " ↓" : ""}
      </button>
    </th>
  )

  return (
    <AdminPage title="Erros e rotas" subtitle={`Tempo medido dentro da API; erros 5xx guardados por 30 dias · ${updated}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Chips value={client} onChange={setClient} options={CLIENTS} />
        <Chips value={days} onChange={setDays} options={PERIODS} />
      </div>

      {!tech ? (
        <Skeleton className="h-24" />
      ) : (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard label="Chamadas" value={nf(tech.kpis.requests.value)} delta={tech.kpis.requests} />
          <KpiCard label="Erros 5xx" value={nf(tech.kpis.errors5xx.value)} delta={tech.kpis.errors5xx} invert tone={tech.kpis.errors5xx.value ? "danger" : "ok"} />
          <KpiCard label="Taxa de erro" value={`${tech.kpis.errorRate.value.toLocaleString("pt-BR")}%`} delta={tech.kpis.errorRate} invert />
          <KpiCard label="p95 (aprox.)" value={`${nf(tech.kpis.p95Ms.value)} ms`} delta={tech.kpis.p95Ms} invert />
          <KpiCard label="Rotas" value={nf(routes.length)} hint="com tráfego no período" />
        </section>
      )}

      <AdminPanel
        title="Todas as rotas"
        hint="Clique no cabeçalho para ordenar."
        action={<Input value={routeQuery} onChange={(e) => setRouteQuery(e.target.value)} placeholder="Filtrar rota" className="h-8 w-56" />}
      >
        {!tech ? (
          <Skeleton className="m-4 h-60" />
        ) : routes.length ? (
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[var(--wq-surface)] text-left text-xs text-[var(--wq-text-muted)]">
                <tr>
                  <th className="px-4 py-2 font-medium">Rota</th>
                  {th("count", "Chamadas")}
                  {th("avgMs", "Média")}
                  {th("p95Ms", "p95")}
                  <th className="px-4 py-2 text-right font-medium">4xx</th>
                  {th("errors5xx", "5xx")}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--wq-border)]">
                {routes.map((r) => (
                  <tr key={`${r.method} ${r.route}`}>
                    <td className="max-w-[28rem] truncate px-4 py-2 font-mono text-xs">
                      <span className="mr-1.5 rounded bg-[var(--wq-paper)] px-1.5 py-0.5 text-[10px] font-bold">{r.method}</span>
                      {r.route}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{nf(r.count)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{nf(r.avgMs)} ms</td>
                    <td className={cn("px-4 py-2 text-right tabular-nums", r.p95Ms > 1000 ? "font-semibold text-rose-600" : r.p95Ms > 500 ? "text-amber-600" : "")}>{nf(r.p95Ms)} ms</td>
                    <td className="px-4 py-2 text-right tabular-nums text-[var(--wq-text-muted)]">{nf(r.errors4xx)}</td>
                    <td className={cn("px-4 py-2 text-right tabular-nums", r.errors5xx ? "font-semibold text-rose-600" : "text-[var(--wq-text-muted)]")}>{nf(r.errors5xx)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-4 py-4 text-sm text-[var(--wq-text-muted)]">Sem tráfego registrado ainda.</p>
        )}
      </AdminPanel>

      <AdminPanel
        title={`Últimos erros 5xx${errors ? ` · ${nf(errors.length)}` : ""}`}
        hint="Até 500. Clique no correlation para copiar e procurar no log."
        action={<Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar rota, código, mensagem ou correlation" className="h-8 w-72" />}
      >
        {!errors ? (
          <Skeleton className="m-4 h-40" />
        ) : errors.length ? (
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[var(--wq-surface)] text-left text-xs text-[var(--wq-text-muted)]">
                <tr>
                  <th className="px-4 py-2 font-medium">Quando</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Rota</th>
                  <th className="px-4 py-2 font-medium">Detalhe</th>
                  <th className="px-4 py-2 font-medium">Cliente</th>
                  <th className="px-4 py-2 font-medium">Correlation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--wq-border)]">
                {errors.map((e, i) => (
                  <tr key={`${e.at}-${i}`}>
                    <td className="whitespace-nowrap px-4 py-2 tabular-nums text-[var(--wq-text-muted)]">{when(e.at)}</td>
                    <td className="px-4 py-2 font-semibold text-rose-600">{e.status}</td>
                    <td className="max-w-[18rem] truncate px-4 py-2 font-mono text-xs">
                      {e.method} {e.route}
                    </td>
                    <td className="max-w-[22rem] truncate px-4 py-2 text-xs text-[var(--wq-text-muted)]" title={e.message}>
                      {[e.code, e.message].filter(Boolean).join(" · ")}
                    </td>
                    <td className="px-4 py-2 text-xs">{CLIENT_LABEL[e.client] || e.client}</td>
                    <td className="px-4 py-2">
                      {e.correlationId ? (
                        <button type="button" onClick={() => copy(e.correlationId)} className="font-mono text-[11px] text-[var(--wq-brand-text)] hover:underline">
                          {e.correlationId.slice(0, 12)}
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-4 py-4 text-sm text-emerald-700 dark:text-emerald-300">Nenhum erro 5xx{term ? " com essa busca" : " no período"}.</p>
        )}
      </AdminPanel>
    </AdminPage>
  )
}
