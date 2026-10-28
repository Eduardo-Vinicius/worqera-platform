"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Loader2, Star, UserRound } from "lucide-react"
import { getAttendanceV1, type AttendanceReport } from "@/lib/apiV1"
import { formatBRL } from "@/lib/orderMoney"
import { cn } from "@/lib/utils"

/** Métricas → Atendimento: who opened orders, how much they sold and how clients rated the service. */
export function AttendanceCard({ periodo }: { periodo: string }) {
  const [report, setReport] = useState<AttendanceReport | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getAttendanceV1(periodo)
      .then((res) => !cancelled && setReport(res))
      .catch(() => !cancelled && setReport(null))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [periodo])

  const rows = report?.rows || []
  const maxOrders = Math.max(1, ...rows.map((r) => r.orders))
  const t = report?.totals

  return (
    <section className="rounded-2xl border border-[var(--wq-border)] bg-white p-4 sm:p-5 dark:bg-[var(--wq-surface)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg text-[var(--wq-text)]">
            <UserRound className="h-4 w-4 text-[var(--wq-brand)]" />
            Atendimento
          </h2>
          <p className="text-sm text-[var(--wq-text-muted)]">
            Quem abriu os pedidos, quanto vendeu e a nota do cliente para o atendimento.
          </p>
        </div>
        {t ? (
          <p
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold",
              t.coverage >= 90 ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"
            )}
            title="Pedidos do período com Aberto por marcado"
          >
            {t.coverage}% com &quot;Aberto por&quot; · {t.informed}/{t.orders}
          </p>
        ) : null}
      </div>

      {loading && !report ? (
        <div className="flex items-center justify-center py-10 text-sm text-[var(--wq-text-muted)]">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando
        </div>
      ) : !t?.attendants ? (
        <div className="mt-4 rounded-xl border border-dashed border-[var(--wq-border)] px-4 py-6 text-center text-sm">
          <p className="font-medium">Ninguém marcado como &quot;Atende no balcão&quot;</p>
          <p className="mt-1 text-[var(--wq-text-muted)]">
            Marque em{" "}
            <Link href="/funcionarios" className="font-semibold text-[var(--wq-brand-text)] underline">
              Funcionários
            </Link>{" "}
            ou pelo &quot;+ Cadastrar&quot; no topo do pedido.
          </p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.1em] text-[var(--wq-text-muted)]">
                <th className="pb-2 font-semibold">Quem</th>
                <th className="pb-2 font-semibold">Pedidos</th>
                <th className="pb-2 text-right font-semibold">Vendido</th>
                <th className="pb-2 text-right font-semibold">Ticket</th>
                <th className="pb-2 text-right font-semibold">Atendimento</th>
                <th className="pb-2 text-right font-semibold">Recuperou</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--wq-border)]">
              {rows.map((r) => (
                <tr key={r.employeeId || "none"} className={cn(!r.employeeId && "text-[var(--wq-text-muted)]")}>
                  <td className="py-2.5 pr-3 font-medium">{r.name}</td>
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="w-8 tabular-nums">{r.orders}</span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--wq-paper)]">
                        <span
                          className={cn("block h-full rounded-full", r.employeeId ? "bg-[var(--wq-brand)]" : "bg-[var(--wq-border)]")}
                          style={{ width: `${(r.orders / maxOrders) * 100}%` }}
                        />
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 text-right tabular-nums">{formatBRL(r.sold)}</td>
                  <td className="py-2.5 text-right tabular-nums">{r.ticket ? formatBRL(r.ticket) : "—"}</td>
                  <td className="py-2.5 text-right">
                    {r.serviceScore != null ? (
                      <span className="inline-flex items-center gap-1 tabular-nums" title={`${r.serviceScoreCount} avaliação(ões)`}>
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {String(r.serviceScore).replace(".", ",")}
                        <span className="text-xs text-[var(--wq-text-muted)]">({r.serviceScoreCount})</span>
                      </span>
                    ) : (
                      <span className="text-[var(--wq-text-muted)]">—</span>
                    )}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">{r.recoveries || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--wq-text-muted)]">
            <span>A nota de atendimento vem da página do pedido do cliente (&quot;Como foi o atendimento?&quot;).</span>
            <Link href="/admin/atendimento" className="font-semibold text-[var(--wq-brand-text)] hover:underline">
              Relatório completo, CSV e pedidos sem &quot;Aberto por&quot; →
            </Link>
          </p>
        </div>
      )}
    </section>
  )
}
