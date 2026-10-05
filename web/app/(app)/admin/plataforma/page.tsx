"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AppHeader } from "@/components/shell/AppHeader"
import { Button } from "@/components/ui/button"
import { getPlatformOpsV1, meV1, type OpsEndpoint } from "@/lib/apiV1"
import { toast } from "sonner"

type Ops = Awaited<ReturnType<typeof getPlatformOpsV1>>
type WindowId = "1h" | "24h" | "30d"
type SortId = "calls" | "slow" | "errors"

const WINDOWS: Array<{ id: WindowId; label: string }> = [
  { id: "1h", label: "1 hora" },
  { id: "24h", label: "24 horas" },
  { id: "30d", label: "30 dias" },
]

function formatWhen(value?: string | null) {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}

function sortEndpoints(rows: OpsEndpoint[], sort: SortId) {
  const list = [...rows]
  if (sort === "slow") list.sort((a, b) => b.avgMs - a.avgMs || b.count - a.count)
  else if (sort === "errors") list.sort((a, b) => b.errors - a.errors || b.errorRate - a.errorRate)
  else list.sort((a, b) => b.count - a.count)
  return list
}

export default function PlatformPortalPage() {
  const [allowed, setAllowed] = useState(false)
  const [ops, setOps] = useState<Ops | null>(null)
  const [loading, setLoading] = useState(true)
  const [windowId, setWindowId] = useState<WindowId>("24h")
  const [sort, setSort] = useState<SortId>("calls")

  const load = useCallback(async () => {
    try {
      const me = await meV1()
      if (!me?.platformAdmin) {
        setAllowed(false)
        toast.error("Acesso restrito ao time Worqera")
        return
      }
      setAllowed(true)
      setOps(await getPlatformOpsV1())
    } catch (err: any) {
      toast.error(err?.message || "Falha ao carregar o portal")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(), 30000)
    return () => window.clearInterval(timer)
  }, [load])

  const view = ops?.windows?.[windowId]
  const rows = useMemo(() => sortEndpoints(view?.endpoints || [], sort), [view, sort])
  const shops = ops?.shops

  return (
    <div className="-mx-2.5 -mt-3 sm:-mx-5 sm:-mt-5 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-6">
      <AppHeader
        title="Portal"
        subtitle="Oficinas, chamadas e erros. O tempo é só o do servidor."
        actions={
          <Button type="button" variant="outline" size="sm" className="rounded-[10px]" onClick={() => void load()}>
            Atualizar
          </Button>
        }
      />
      <div className="mx-auto w-full max-w-[1600px] space-y-4 px-2.5 py-4 sm:px-5 md:px-6 lg:px-8">
        {ops?.redis === "down" ? (
          <p className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Redis fora do ar. Oficinas, notícias e erros continuam visíveis. Chamadas e usuários ativos ficam zerados até ele voltar.
          </p>
        ) : null}

        {!allowed && !loading ? (
          <p className="text-sm text-[var(--wq-text-muted)]">Sem acesso.</p>
        ) : null}

        {allowed ? (
          <>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Kpi label="Oficinas" value={shops?.total} hint="cadastradas" href="/admin/shops" />
              <Kpi label="Em trial" value={shops?.trialing} hint="assinatura" href="/admin/shops" />
              <Kpi label="Ativas" value={shops?.active} hint="plano pago" href="/admin/shops" />
              <Kpi label="Suspensas" value={shops?.suspended} hint="acesso bloqueado" href="/admin/shops" />
              <Kpi label="Pedidos abertos" value={shops?.openOrders} hint="soma das oficinas" />
            </section>

            <div className="flex flex-wrap items-center gap-2">
              {WINDOWS.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  size="sm"
                  variant={windowId === item.id ? "default" : "outline"}
                  className={`rounded-[10px] ${windowId === item.id ? "bg-[var(--wq-action)] hover:bg-[var(--wq-action)]/90" : ""}`}
                  onClick={() => setWindowId(item.id)}
                >
                  {item.label}
                </Button>
              ))}
            </div>

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi label="Usuários ativos" value={ops?.activeUsers} hint="request nos últimos 30 min" />
              <Kpi label="Chamadas" value={view?.calls} hint={WINDOWS.find((w) => w.id === windowId)?.label} />
              <Kpi label="Erros 5xx" value={view?.errors} hint="nessa janela" />
              <Kpi label="Tempo médio" value={view ? `${view.avgMs} ms` : "—"} hint="dentro da API" />
            </section>

            <section className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--wq-border)] px-4 py-3">
                <h2 className="text-sm font-semibold">Endpoints</h2>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["calls", "Chamadas"],
                      ["slow", "Mais lentos"],
                      ["errors", "Mais erros"],
                    ] as const
                  ).map(([id, label]) => (
                    <Button
                      key={id}
                      type="button"
                      size="sm"
                      variant={sort === id ? "default" : "outline"}
                      className={`h-8 rounded-[10px] ${sort === id ? "bg-[var(--wq-action)] hover:bg-[var(--wq-action)]/90" : ""}`}
                      onClick={() => setSort(id)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-[var(--wq-text-muted)]">
                    <tr>
                      <th className="px-4 py-2 font-medium">Rota</th>
                      <th className="px-4 py-2 font-medium">Chamadas</th>
                      <th className="px-4 py-2 font-medium">Média</th>
                      <th className="px-4 py-2 font-medium">Máximo</th>
                      <th className="px-4 py-2 font-medium">2xx</th>
                      <th className="px-4 py-2 font-medium">4xx</th>
                      <th className="px-4 py-2 font-medium">5xx</th>
                      <th className="px-4 py-2 font-medium">Erro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-[var(--wq-text-muted)]" colSpan={8}>
                          Nenhuma chamada nessa janela.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => (
                        <tr key={`${row.method} ${row.route}`} className="border-t border-[var(--wq-border)]">
                          <td className="px-4 py-2 font-mono text-xs">
                            {row.method} {row.route}
                          </td>
                          <td className="px-4 py-2 tabular-nums">{row.count}</td>
                          <td className="px-4 py-2 tabular-nums">{row.avgMs} ms</td>
                          <td className="px-4 py-2 tabular-nums">{row.maxMs} ms</td>
                          <td className="px-4 py-2 tabular-nums">{row.ok}</td>
                          <td className="px-4 py-2 tabular-nums">{row.clientErrors}</td>
                          <td className="px-4 py-2 tabular-nums">{row.errors}</td>
                          <td className="px-4 py-2 tabular-nums">{row.errorRate}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)]">
              <section className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
                <h2 className="border-b border-[var(--wq-border)] px-4 py-3 text-sm font-semibold">
                  Últimos {ops?.errors?.length || 0} erros
                </h2>
                <ul className="max-h-[520px] divide-y divide-[var(--wq-border)] overflow-y-auto">
                  {(ops?.errors || []).length === 0 ? (
                    <li className="px-4 py-4 text-sm text-[var(--wq-text-muted)]">Nenhum erro 5xx guardado.</li>
                  ) : (
                    ops?.errors.map((err) => (
                      <li key={err.id} className="px-4 py-2.5 text-sm">
                        <p className="font-medium">
                          {err.status} · {err.message}
                        </p>
                        <p className="font-mono text-xs text-[var(--wq-text-muted)]">
                          {err.method} {err.route}
                          {err.shopName ? ` · ${err.shopName}` : ""}
                          {" · "}
                          {formatWhen(err.at)}
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              </section>

              <div className="space-y-4">
                <section className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
                  <div className="flex items-center justify-between gap-2 border-b border-[var(--wq-border)] px-4 py-3">
                    <h2 className="text-sm font-semibold">Notícias no ar</h2>
                    <Link href="/admin/plataforma/noticias" className="text-xs font-medium text-[var(--wq-brand-text)] underline">
                      Publicar
                    </Link>
                  </div>
                  <ul className="divide-y divide-[var(--wq-border)]">
                    {(ops?.notices || []).length === 0 ? (
                      <li className="px-4 py-4 text-sm text-[var(--wq-text-muted)]">Nenhuma notícia vigente.</li>
                    ) : (
                      ops?.notices.map((notice) => (
                        <li key={notice.id} className="px-4 py-3">
                          <p className="text-sm font-medium">{notice.title}</p>
                          <p className="text-xs text-[var(--wq-text-muted)]">
                            {notice.platform === "all" ? "todas as plataformas" : notice.platform}
                            {notice.endsAt ? ` · até ${formatWhen(notice.endsAt)}` : " · sem expiração"}
                          </p>
                        </li>
                      ))
                    )}
                  </ul>
                </section>

                <section className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
                  <div className="flex items-center justify-between gap-2 border-b border-[var(--wq-border)] px-4 py-3">
                    <h2 className="text-sm font-semibold">Desligado no global</h2>
                    <Link href="/admin/plataforma/parametros" className="text-xs font-medium text-[var(--wq-brand-text)] underline">
                      Parâmetros
                    </Link>
                  </div>
                  <ul className="divide-y divide-[var(--wq-border)]">
                    {(ops?.disabled || []).length === 0 ? (
                      <li className="px-4 py-4 text-sm text-[var(--wq-text-muted)]">
                        Funções e serviços globais estão ligados.
                      </li>
                    ) : (
                      ops?.disabled.map((item) => (
                        <li key={`${item.kind}-${item.key}`} className="px-4 py-2.5 text-sm">
                          <p className="font-medium">{item.label}</p>
                          <p className="text-xs text-[var(--wq-text-muted)]">Fora do menu da oficina</p>
                        </li>
                      ))
                    )}
                  </ul>
                </section>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

function Kpi({
  label,
  value,
  hint,
  href,
}: {
  label: string
  value?: number | string | null
  hint?: string
  href?: string
}) {
  const body = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--wq-text-muted)]">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value ?? "—"}</p>
      {hint ? <p className="mt-1 text-xs text-[var(--wq-text-muted)]">{hint}</p> : null}
    </>
  )
  const className = "rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-4 text-left"
  if (!href) return <div className={className}>{body}</div>
  return (
    <Link href={href} className={`${className} transition hover:border-[var(--wq-brand)]/40`}>
      {body}
    </Link>
  )
}
