"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Download, Loader2, RefreshCw, Star, Trophy, UserRound, Users } from "lucide-react"
import { toast } from "sonner"
import { AppHeader } from "@/components/shell/AppHeader"
import { Button } from "@/components/ui/button"
import { getAttendanceV1, listAttendantsV1, type Attendant, type AttendanceReport } from "@/lib/apiV1"
import { updateOrderService } from "@/lib/apiService"
import { formatBRL } from "@/lib/orderMoney"
import { cn } from "@/lib/utils"

const PERIODS = [
  { id: "7d", label: "7 dias" },
  { id: "30d", label: "30 dias" },
  { id: "90d", label: "90 dias" },
  { id: "1y", label: "1 ano" },
] as const

const STATUS_LABEL: Record<string, string> = { open: "Aberto", in_progress: "Em andamento", ready: "Pronto" }

function csvCell(v: unknown) {
  const s = v == null ? "" : String(v)
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function downloadCsv(report: AttendanceReport) {
  const head = ["Quem", "Pedidos", "Entregues", "Recusados", "Vendido", "Ticket médio", "Nota atendimento", "Avaliações", "Recuperou"]
  const rows = report.rows.map((r) => [
    r.name,
    r.orders,
    r.delivered,
    r.cancelled,
    r.sold.toFixed(2).replace(".", ","),
    r.ticket.toFixed(2).replace(".", ","),
    r.serviceScore != null ? String(r.serviceScore).replace(".", ",") : "",
    r.serviceScoreCount,
    r.recoveries,
  ])
  const csv = "\ufeff" + [head, ...rows].map((r) => r.map(csvCell).join(";")).join("\n")
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
  const a = document.createElement("a")
  a.href = url
  a.download = `atendimento-${report.period.start}-a-${report.period.end}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/** Gestão → Atendimento: who opens the orders, how much they sell, how clients rate them, and what is missing. */
export default function AtendimentoReportPage() {
  const [periodo, setPeriodo] = useState<(typeof PERIODS)[number]["id"]>("30d")
  const [report, setReport] = useState<AttendanceReport | null>(null)
  const [attendants, setAttendants] = useState<Attendant[]>([])
  const [loading, setLoading] = useState(true)
  const [pick, setPick] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setReport(await getAttendanceV1(periodo))
    } catch (err: any) {
      toast.error(err?.message || "Não carregou o relatório")
    } finally {
      setLoading(false)
    }
  }, [periodo])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    listAttendantsV1().then(setAttendants).catch(() => setAttendants([]))
  }, [])

  const assign = async (orderId: string) => {
    const employeeId = pick[orderId]
    if (!employeeId) return
    setSaving(orderId)
    try {
      await updateOrderService(orderId, { openedByEmployeeId: employeeId })
      setReport((r) => (r ? { ...r, missing: (r.missing || []).filter((m) => m.id !== orderId) } : r))
      toast.success(`Marcado: aberto por ${attendants.find((a) => a.id === employeeId)?.name || ""}`)
    } catch (err: any) {
      toast.error(err?.message || "Não salvou")
    } finally {
      setSaving("")
    }
  }

  const t = report?.totals
  const people = (report?.rows || []).filter((r) => r.employeeId)
  const unknown = (report?.rows || []).find((r) => !r.employeeId)
  const maxOrders = Math.max(1, ...people.map((r) => r.orders))
  const best = [...people].sort((a, b) => b.sold - a.sold)[0]

  return (
    <div className="-mx-2.5 -mt-3 sm:-mx-5 sm:-mt-5 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-6">
      <AppHeader group="relatorios"
        title="Desempenho da equipe"
        subtitle="Quem abriu cada pedido, quanto vendeu e a nota do cliente"
        actions={
          <div className="flex gap-1.5">
            <Button type="button" size="sm" variant="outline" className="h-9 rounded-[10px]" disabled={!report} onClick={() => report && downloadCsv(report)}>
              <Download className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Excel / CSV</span>
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-9 rounded-[10px]" disabled={loading} onClick={() => void load()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        }
      />

      <div className="mx-auto w-full max-w-[1200px] space-y-4 px-2.5 pb-10 sm:px-5 md:px-6 lg:px-8">
        <div className="flex flex-wrap gap-1.5">
          {PERIODS.map((p) => (
            <Button
              key={p.id}
              size="sm"
              variant={periodo === p.id ? "default" : "outline"}
              className={cn("h-9 rounded-[10px]", periodo === p.id && "bg-[var(--wq-action)] text-white")}
              onClick={() => setPeriodo(p.id)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {[
            { label: "Pedidos no período", value: t ? String(t.orders) : "—", hint: t ? `${t.attendants} pessoa${t.attendants === 1 ? "" : "s"} atendendo` : "", icon: Users },
            {
              label: "Com Aberto por",
              value: t ? `${t.coverage}%` : "—",
              hint: t ? `${t.informed} de ${t.orders} pedidos` : "",
              icon: UserRound,
              warn: Boolean(t && t.orders && t.coverage < 90),
            },
            {
              label: "Nota do atendimento",
              value: t?.serviceScore != null ? `${String(t.serviceScore).replace(".", ",")}★` : "—",
              hint: t?.serviceScoreCount ? `${t.serviceScoreCount} avaliação${t.serviceScoreCount === 1 ? "" : "ões"}` : "Ainda sem notas",
              icon: Star,
            },
            { label: "Recuperados", value: t ? String(t.recoveries ?? 0) : "—", hint: best ? `Quem mais vendeu: ${best.name}` : "", icon: Trophy },
          ].map((c) => {
            const Icon = c.icon
            return (
              <div key={c.label} className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] px-4 py-3.5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">{c.label}</p>
                  <Icon className="h-4 w-4 text-[var(--wq-brand)]" />
                </div>
                <p className={cn("mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums sm:text-3xl", c.warn && "text-amber-700 dark:text-amber-400")}>
                  {c.value}
                </p>
                <p className="mt-1 truncate text-xs text-[var(--wq-text-muted)]">{c.hint}</p>
              </div>
            )
          })}
        </section>

        {loading && !report ? (
          <div className="flex items-center justify-center py-16 text-sm text-[var(--wq-text-muted)]">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando
          </div>
        ) : !t?.attendants ? (
          <div className="rounded-2xl border border-dashed border-[var(--wq-border)] px-4 py-10 text-center">
            <p className="font-medium">Ninguém marcado como &quot;Atende no balcão&quot;</p>
            <p className="mt-1 text-sm text-[var(--wq-text-muted)]">
              Marque em{" "}
              <Link href="/funcionarios" className="font-semibold text-[var(--wq-brand-text)] underline">
                Funcionários
              </Link>{" "}
              ou use o &quot;+ Cadastrar&quot; no topo do Novo pedido.
            </p>
          </div>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
            <h2 className="border-b border-[var(--wq-border)] px-4 py-3 text-sm font-semibold">Por pessoa</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.1em] text-[var(--wq-text-muted)]">
                    <th className="px-4 py-2 font-semibold">Quem</th>
                    <th className="px-2 py-2 font-semibold">Pedidos</th>
                    <th className="px-2 py-2 text-right font-semibold">Entregues</th>
                    <th className="px-2 py-2 text-right font-semibold">Vendido</th>
                    <th className="px-2 py-2 text-right font-semibold">Ticket</th>
                    <th className="px-2 py-2 text-right font-semibold">Atendimento</th>
                    <th className="px-2 py-2 text-right font-semibold">Recuperou</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--wq-border)]">
                  {[...people, ...(unknown && unknown.orders ? [unknown] : [])].map((r) => (
                    <tr key={r.employeeId || "none"} className={cn("hover:bg-[var(--wq-paper)]", !r.employeeId && "text-[var(--wq-text-muted)]")}>
                      <td className="px-4 py-2.5 font-medium">{r.name}</td>
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-8 tabular-nums">{r.orders}</span>
                          <span className="h-1.5 w-28 overflow-hidden rounded-full bg-[var(--wq-paper)]">
                            <span
                              className={cn("block h-full rounded-full", r.employeeId ? "bg-[var(--wq-brand)]" : "bg-[var(--wq-border)]")}
                              style={{ width: `${(r.orders / maxOrders) * 100}%` }}
                            />
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{r.delivered}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{formatBRL(r.sold)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{r.ticket ? formatBRL(r.ticket) : "—"}</td>
                      <td className="px-2 py-2.5 text-right">
                        {r.serviceScore != null ? (
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            {String(r.serviceScore).replace(".", ",")}
                            <span className="text-xs text-[var(--wq-text-muted)]">({r.serviceScoreCount})</span>
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{r.recoveries || "—"}</td>
                      <td className="px-4 py-2.5 text-right">
                        {r.employeeId ? (
                          <Link
                            href={`/pedidos?tab=todos&openedBy=${r.employeeId}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--wq-brand-text)] hover:underline"
                          >
                            Ver pedidos <ArrowRight className="h-3 w-3" />
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-[var(--wq-border)] px-4 py-2 text-xs text-[var(--wq-text-muted)]">
              Vendido e ticket contam pedidos abertos no período, menos os recusados. A nota vem de &quot;Como foi o atendimento?&quot; na página do cliente.
            </p>
          </section>
        )}

        {report?.missing?.length && attendants.length ? (
          <section className="overflow-hidden rounded-2xl border border-amber-300/70 bg-[var(--wq-surface)]">
            <div className="border-b border-[var(--wq-border)] px-4 py-3">
              <h2 className="text-sm font-semibold">Pedidos em andamento sem &quot;Aberto por&quot;</h2>
              <p className="text-xs text-[var(--wq-text-muted)]">
                Escolha quem atendeu e salve: entra na conta da pessoa na hora. Pedidos antigos que já saíram ficam como &quot;Não informado&quot;.
              </p>
            </div>
            <ul className="divide-y divide-[var(--wq-border)]">
              {report.missing.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                  <Link href={`/pedidos?q=${encodeURIComponent(m.code)}`} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      #{m.code} · {m.clientName || "Cliente"}
                    </p>
                    <p className="text-xs text-[var(--wq-text-muted)]">
                      {STATUS_LABEL[m.status] || m.status} · {new Date(m.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    </p>
                  </Link>
                  <select
                    className="h-9 rounded-[10px] border border-[var(--wq-border)] bg-[var(--wq-surface)] px-2 text-sm"
                    value={pick[m.id] || ""}
                    onChange={(e) => setPick((p) => ({ ...p, [m.id]: e.target.value }))}
                    aria-label={`Quem abriu o pedido ${m.code}`}
                  >
                    <option value="">Quem abriu?</option>
                    {attendants.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 rounded-[10px] bg-[var(--wq-action)] text-white"
                    disabled={!pick[m.id] || saving === m.id}
                    onClick={() => void assign(m.id)}
                  >
                    {saving === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  )
}
