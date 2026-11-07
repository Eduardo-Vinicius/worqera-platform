"use client"

import { useEffect, useState } from "react"
import { ArrowRight, Loader2 } from "lucide-react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { getCrmRetentionV1, type CrmRetention as Retention } from "@/lib/apiV1"
import { brl, gapLabel, type CrmTab } from "./crmUi"

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" }).replace(".", "")
}

/** CRM → Visão da base: who comes back, month by month. */
export function CrmRetention({ onTab }: { onTab: (tab: CrmTab) => void }) {
  const [data, setData] = useState<Retention | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    getCrmRetentionV1(6)
      .then(setData)
      .catch((err) => setError(err?.message || "Não carregou"))
  }, [])

  if (!data) {
    return (
      <section className="flex items-center justify-center rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] py-10 text-sm text-[var(--wq-text-muted)]">
        {error || (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Lendo quem volta
          </>
        )}
      </section>
    )
  }

  const points = data.months.map((m) => ({ ...m, label: monthLabel(m.month) }))
  const current = data.months[data.months.length - 1]
  const tiles = [
    {
      label: "Voltam para a 2ª visita",
      value: data.secondVisit.rate == null ? "—" : `${data.secondVisit.rate}%`,
      hint: data.secondVisit.eligible
        ? `${data.secondVisit.came} de ${data.secondVisit.eligible} clientes com 60+ dias de casa`
        : "Aparece quando houver clientes com 60+ dias",
    },
    {
      label: "Tempo até voltar",
      value: data.secondVisit.medianDays == null ? "—" : gapLabel(data.secondVisit.medianDays),
      hint: "Metade volta antes disso (1ª → 2ª visita)",
    },
    {
      label: "Voltaram em 30 dias",
      value: String(data.returned30),
      hint: "Fizeram mais um pedido no último mês",
      tab: "voltaram" as CrmTab,
    },
    {
      label: "Voltaram depois de sumir",
      value: String(data.reactivated90.clients),
      hint: `Ficaram ${data.inactiveDays}+ dias longe e voltaram (90 dias)${data.reactivated90.value ? ` · ${brl(data.reactivated90.value)}` : ""}`,
      tab: "voltaram" as CrmTab,
    },
  ]

  return (
    <section className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[var(--wq-border)] px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold">Quem volta</h3>
          <p className="text-[11px] text-[var(--wq-text-muted)]">
            Clientes por mês: os novos e os que voltaram
            {data.returningShare != null ? ` · quem volta faz ${data.returningShare}% do faturamento dos últimos 6 meses` : ""}
          </p>
        </div>
        <button type="button" onClick={() => onTab("voltaram")} className="inline-flex items-center text-xs font-semibold text-[var(--wq-brand-text)]">
          Ver quem voltou <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid gap-4 p-4 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="mb-2 flex flex-wrap gap-4 text-xs text-[var(--wq-text-muted)]">
            <span className="flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-sm bg-[#C4B5FD]" /> Novos
            </span>
            <span className="flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-sm bg-[#7D26DE]" /> Voltaram
            </span>
            {current ? (
              <span className="ml-auto">
                Este mês: <b className="text-[var(--wq-text)]">{current.returnRate}%</b> dos clientes atendidos já eram da casa
              </span>
            ) : null}
          </div>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={points} margin={{ top: 6, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--wq-border)" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--wq-text-muted)" }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--wq-text-muted)" }} />
                <Tooltip
                  cursor={{ fill: "var(--wq-paper)" }}
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--wq-border)", background: "var(--wq-surface)", fontSize: 12 }}
                  formatter={(value: number, name: string, item: any) => {
                    const row = item?.payload
                    if (name === "newClients") return [`${value}${row?.newValue != null ? ` · ${brl(row.newValue)}` : ""}`, "Novos"]
                    return [`${value}${row?.returningValue != null ? ` · ${brl(row.returningValue)}` : ""}${row?.reactivated ? ` (${row.reactivated} depois de sumir)` : ""}`, "Voltaram"]
                  }}
                />
                <Bar dataKey="newClients" stackId="a" fill="#C4B5FD" radius={[0, 0, 4, 4]} />
                <Bar dataKey="returning" stackId="a" fill="#7D26DE" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 self-start">
          {tiles.map((t) => {
            const body = (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--wq-text-muted)]">{t.label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--wq-text)]">{t.value}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-[var(--wq-text-muted)]">{t.hint}</p>
              </>
            )
            return t.tab ? (
              <button
                key={t.label}
                type="button"
                onClick={() => onTab(t.tab!)}
                className="rounded-xl border border-[var(--wq-border)] p-3 text-left transition hover:border-[var(--wq-brand)]/50 hover:bg-[var(--wq-paper)]"
              >
                {body}
              </button>
            ) : (
              <div key={t.label} className="rounded-xl border border-[var(--wq-border)] p-3">
                {body}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
