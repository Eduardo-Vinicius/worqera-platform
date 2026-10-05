"use client"

import { useCallback, useEffect, useState } from "react"
import { AppHeader } from "@/components/shell/AppHeader"
import { Button } from "@/components/ui/button"
import { getPlatformOpsV1, meV1 } from "@/lib/apiV1"
import { toast } from "sonner"

type Ops = Awaited<ReturnType<typeof getPlatformOpsV1>>

function formatWhen(value?: string | null) {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}

export default function PlatformPortalPage() {
  const [allowed, setAllowed] = useState(false)
  const [ops, setOps] = useState<Ops | null>(null)
  const [loading, setLoading] = useState(true)

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

  const slow = [...(ops?.endpoints || [])].sort((a, b) => b.avgMs - a.avgMs).slice(0, 8)

  return (
    <div className="-mx-2.5 -mt-3 sm:-mx-5 sm:-mt-5 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-6">
      <AppHeader
        title="Portal"
        subtitle="Uso da API nos últimos 30 dias · tempo só dentro do servidor"
        actions={
          <Button type="button" variant="outline" size="sm" className="rounded-[10px]" onClick={() => void load()}>
            Atualizar
          </Button>
        }
      />
      <div className="mx-auto w-full max-w-[1600px] space-y-4 px-2.5 py-4 sm:px-5 md:px-6 lg:px-8">
        {!allowed && !loading ? (
          <p className="text-sm text-[var(--wq-text-muted)]">Sem acesso.</p>
        ) : null}
        {allowed ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--wq-text-muted)]">
                  Usuários ativos
                </p>
                <p className="mt-1 text-3xl font-semibold tabular-nums">{ops?.activeUsers ?? "—"}</p>
                <p className="mt-1 text-xs text-[var(--wq-text-muted)]">Acessaram a API nos últimos 30 min</p>
              </div>
              <div className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--wq-text-muted)]">Redis</p>
                <p className="mt-1 text-3xl font-semibold">{ops?.redis === "up" ? "No ar" : "Fora"}</p>
                <p className="mt-1 text-xs text-[var(--wq-text-muted)]">Contadores somem sozinhos em 30 dias</p>
              </div>
              <div className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--wq-text-muted)]">Erros</p>
                <p className="mt-1 text-3xl font-semibold tabular-nums">{ops?.errors?.length ?? 0}</p>
                <p className="mt-1 text-xs text-[var(--wq-text-muted)]">Últimos registrados, teto de 1000</p>
              </div>
            </div>

            <section className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
              <h2 className="border-b border-[var(--wq-border)] px-4 py-3 text-sm font-semibold">Endpoints</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-[var(--wq-text-muted)]">
                    <tr>
                      <th className="px-4 py-2 font-medium">Rota</th>
                      <th className="px-4 py-2 font-medium">Chamadas</th>
                      <th className="px-4 py-2 font-medium">Média</th>
                      <th className="px-4 py-2 font-medium">Máximo</th>
                      <th className="px-4 py-2 font-medium">Erros 5xx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(ops?.endpoints || []).length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-[var(--wq-text-muted)]" colSpan={5}>
                          Ainda sem chamadas neste Redis.
                        </td>
                      </tr>
                    ) : (
                      ops?.endpoints.map((row) => (
                        <tr key={`${row.method} ${row.route}`} className="border-t border-[var(--wq-border)]">
                          <td className="px-4 py-2 font-mono text-xs">
                            {row.method} {row.route}
                          </td>
                          <td className="px-4 py-2 tabular-nums">{row.count}</td>
                          <td className="px-4 py-2 tabular-nums">{row.avgMs} ms</td>
                          <td className="px-4 py-2 tabular-nums">{row.maxMs} ms</td>
                          <td className="px-4 py-2 tabular-nums">{row.errors}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
              <h2 className="border-b border-[var(--wq-border)] px-4 py-3 text-sm font-semibold">Mais lentos</h2>
              <ul className="divide-y divide-[var(--wq-border)]">
                {slow.length === 0 ? (
                  <li className="px-4 py-4 text-sm text-[var(--wq-text-muted)]">Sem dados.</li>
                ) : (
                  slow.map((row) => (
                    <li key={`slow-${row.method}-${row.route}`} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                      <span className="font-mono text-xs">
                        {row.method} {row.route}
                      </span>
                      <span className="tabular-nums text-[var(--wq-text-muted)]">{row.avgMs} ms</span>
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
              <h2 className="border-b border-[var(--wq-border)] px-4 py-3 text-sm font-semibold">Erros recentes</h2>
              <ul className="divide-y divide-[var(--wq-border)]">
                {(ops?.errors || []).length === 0 ? (
                  <li className="px-4 py-4 text-sm text-[var(--wq-text-muted)]">Nenhum erro 5xx guardado.</li>
                ) : (
                  ops?.errors.map((err) => (
                    <li key={err.id} className="px-4 py-2 text-sm">
                      <p className="font-medium">
                        {err.status} · {err.message}
                      </p>
                      <p className="font-mono text-xs text-[var(--wq-text-muted)]">
                        {err.method} {err.route} · {formatWhen(err.at)}
                      </p>
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
              <h2 className="border-b border-[var(--wq-border)] px-4 py-3 text-sm font-semibold">Última posição</h2>
              <ul className="divide-y divide-[var(--wq-border)]">
                {(ops?.locations || []).length === 0 ? (
                  <li className="px-4 py-4 text-sm text-[var(--wq-text-muted)]">
                    O app ainda não enviou posição.
                  </li>
                ) : (
                  ops?.locations.map((loc) => (
                    <li key={loc.userId} className="px-4 py-2 text-sm">
                      <p className="font-medium">
                        {loc.name} {loc.shopName ? `· ${loc.shopName}` : ""}
                      </p>
                      <p className="font-mono text-xs text-[var(--wq-text-muted)]">
                        {loc.lat}, {loc.lng} · {formatWhen(loc.at)}
                      </p>
                    </li>
                  ))
                )}
              </ul>
            </section>
          </>
        ) : null}
      </div>
    </div>
  )
}
