"use client"

import Link from "next/link"
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type {
  MetricsFinanceiroEvolucaoDiaria,
  MetricsFinanceiroSetorValor,
  MetricsFinanceiroTopServico,
} from "@/lib/apiService"
import { cn } from "@/lib/utils"

export const brl = (value: number, cents = false) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: cents ? 2 : 0 }).format(value || 0)

const compact = (value: number) =>
  value >= 1000 ? `R$ ${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : brl(value)

const PALETTE = ["#7D26DE", "#AE50FD", "#4F0FA6", "#10B981", "#F59E0B", "#0EA5E9", "#F43F5E", "#64748B"]

export function Panel({
  title,
  hint,
  action,
  className,
  children,
}: {
  title: string
  hint?: string
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={cn("rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]", className)}>
      <div className="flex items-start justify-between gap-3 border-b border-[var(--wq-border)] px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[var(--wq-text)]">{title}</h2>
          {hint ? <p className="text-[11px] text-[var(--wq-text-muted)]">{hint}</p> : null}
        </div>
        {action}
      </div>
      <div className="px-4 py-4 sm:px-5">{children}</div>
    </section>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="py-8 text-center text-sm text-[var(--wq-text-muted)]">{text}</p>
}

type Point = { key: string; label: string; recebido: number; previsto: number; pedidos: number }

/** Daily up to 30 days; by month for longer periods. */
export function toRevenuePoints(days: MetricsFinanceiroEvolucaoDiaria[], monthly: boolean): Point[] {
  const map = new Map<string, Point>()
  for (const d of days) {
    if (!d.data) continue
    const key = monthly ? d.data.slice(0, 7) : d.data
    const date = new Date(`${monthly ? `${key}-15` : key}T12:00:00`)
    const label = monthly
      ? date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "")
      : date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
    const row = map.get(key) || { key, label, recebido: 0, previsto: 0, pedidos: 0 }
    row.recebido += d.receitaRecebida || 0
    row.previsto += d.receitaPrevista || 0
    row.pedidos += d.pedidos || 0
    map.set(key, row)
  }
  return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key))
}

export function RevenueChart({ points }: { points: Point[] }) {
  if (!points.length) return <Empty text="Sem pedidos no período." />
  const best = points.reduce((a, b) => (b.previsto > a.previsto ? b : a), points[0])
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-[var(--wq-text-muted)]">
        <span className="flex items-center gap-1.5">
          <i className="h-2.5 w-2.5 rounded-full bg-[#7D26DE]" /> Recebido
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-0.5 w-4 bg-[#94A3B8]" /> Previsto (vendido)
        </span>
        <span className="ml-auto">
          Melhor: <b className="text-[var(--wq-text)]">{best.label}</b> · {brl(best.previsto)}
        </span>
      </div>
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="wqRecebido" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7D26DE" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#7D26DE" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--wq-border)" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--wq-text-muted)" }} minTickGap={16} />
            <YAxis
              width={64}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "var(--wq-text-muted)" }}
              tickFormatter={(v: number) => compact(v)}
            />
            <Tooltip
              cursor={{ stroke: "#7D26DE", strokeOpacity: 0.25 }}
              contentStyle={{ borderRadius: 12, border: "1px solid var(--wq-border)", background: "var(--wq-surface)", fontSize: 12 }}
              formatter={(value: number, name: string) => [brl(value, true), name === "recebido" ? "Recebido" : "Previsto"]}
              labelFormatter={(label: string, payload: any[]) => `${label} · ${payload?.[0]?.payload?.pedidos ?? 0} pedido(s)`}
            />
            <Area type="monotone" dataKey="previsto" stroke="#94A3B8" strokeDasharray="5 4" strokeWidth={1.5} fill="transparent" />
            <Area type="monotone" dataKey="recebido" stroke="#7D26DE" strokeWidth={2.4} fill="url(#wqRecebido)" activeDot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function ServicesShare({ rows }: { rows: MetricsFinanceiroTopServico[] }) {
  if (!rows.length) return <Empty text="Sem serviços com valor no período." />
  const top = rows[0]
  return (
    <div className="grid items-center gap-4 sm:grid-cols-[180px_1fr]">
      <div className="relative mx-auto h-[180px] w-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey="receita" nameKey="servico" innerRadius={58} outerRadius={84} paddingAngle={2} stroke="none">
              {rows.map((row, i) => (
                <Cell key={row.servico} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number, name: string) => [brl(v, true), name]} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-[10px] uppercase tracking-wide text-[var(--wq-text-muted)]">Campeão</p>
          <p className="text-lg font-semibold text-[var(--wq-text)]">{Math.round(top.fatia || 0)}%</p>
        </div>
      </div>
      <ul className="space-y-2.5">
        {rows.map((row, i) => (
          <li key={row.servico} className="flex items-center gap-3">
            <i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className={cn("truncate text-sm text-[var(--wq-text)]", i === 0 && "font-semibold")}>{row.servico}</span>
                <span className="shrink-0 font-mono text-sm font-semibold text-[var(--wq-text)]">{brl(row.receita)}</span>
              </div>
              <p className="text-[11px] text-[var(--wq-text-muted)]">
                {(row.fatia || 0).toLocaleString("pt-BR")}% · {row.pedidos}× · média {brl(row.ticketMedio || 0)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function SectorMoney({ rows }: { rows: MetricsFinanceiroSetorValor[] }) {
  const visible = rows.filter((r) => r.items > 0)
  if (!visible.length) return <Empty text="Nenhum pedido aberto agora." />
  const max = Math.max(...visible.map((r) => r.value), 1)
  const total = visible.reduce((s, r) => s + r.value, 0)
  return (
    <div>
      <p className="mb-3 text-xs text-[var(--wq-text-muted)]">
        <b className="text-base text-[var(--wq-text)]">{brl(total)}</b> em pedidos abertos agora
      </p>
      <ul className="space-y-3">
        {visible.map((row) => (
          <li key={row.sectorId}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate font-medium text-[var(--wq-text)]">
                {row.name}
                {row.terminal ? (
                  <span className="ml-2 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                    pronto p/ receber
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 font-mono font-semibold text-[var(--wq-text)]">{brl(row.value)}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--wq-paper)]">
                <div
                  className={cn("h-full rounded-full", row.terminal ? "bg-emerald-500" : "bg-[linear-gradient(90deg,#4F0FA6,#AE50FD)]")}
                  style={{ width: `${Math.max(3, Math.round((row.value / max) * 100))}%` }}
                />
              </div>
              <span className="w-14 shrink-0 text-right text-[11px] text-[var(--wq-text-muted)]">{row.items} {row.items === 1 ? "item" : "itens"}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export type RankRow = { key: string; label: string; sub?: string; value: number; extra?: string; href?: string }

export function RankList({ rows, empty }: { rows: RankRow[]; empty: string }) {
  if (!rows.length) return <Empty text={empty} />
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <ol className="space-y-2">
      {rows.map((row, i) => {
        const body = (
          <div className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-[var(--wq-paper)]">
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                i === 0 ? "bg-[#7D26DE] text-white" : "bg-[var(--wq-paper)] text-[var(--wq-text-muted)]"
              )}
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-medium text-[var(--wq-text)]">{row.label}</span>
                <span className="shrink-0 font-mono text-sm font-semibold text-[var(--wq-text)]">{brl(row.value)}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--wq-paper)]">
                  <div className="h-full rounded-full bg-[#AE50FD]" style={{ width: `${Math.round((row.value / max) * 100)}%` }} />
                </div>
                {row.sub ? <span className="shrink-0 text-[11px] text-[var(--wq-text-muted)]">{row.sub}</span> : null}
              </div>
              {row.extra ? <p className="mt-0.5 text-[11px] text-[var(--wq-text-muted)]">{row.extra}</p> : null}
            </div>
          </div>
        )
        return <li key={row.key}>{row.href ? <Link href={row.href}>{body}</Link> : body}</li>
      })}
    </ol>
  )
}
