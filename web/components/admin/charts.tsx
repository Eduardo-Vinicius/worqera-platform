"use client"

import { useEffect, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import type { MetricDelta } from "@/lib/apiV1"

/** Shared pieces of the Worqera admin: KPI cards, SVG charts, period chips, health dot, skeletons. */

export const nf = (v: number) => (Number(v) || 0).toLocaleString("pt-BR")
export const brl0 = (v: number) =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })

export function DeltaBadge({ delta, invert = false, suffix = "%" }: { delta?: MetricDelta | null; invert?: boolean; suffix?: string }) {
  if (!delta) return null
  if (delta.pct == null) {
    return delta.value ? <span className="rounded-full bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">novo</span> : null
  }
  if (delta.pct === 0) return <span className="rounded-full bg-[var(--wq-paper)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--wq-text-muted)]">= 0{suffix}</span>
  const up = delta.pct > 0
  const good = invert ? !up : up
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
        good ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
      )}
      title={`Período anterior: ${nf(delta.prev)}`}
    >
      {up ? "▲" : "▼"} {Math.abs(delta.pct).toLocaleString("pt-BR")}
      {suffix}
    </span>
  )
}

export function KpiCard({
  label,
  value,
  delta,
  hint,
  invert,
  tone,
}: {
  label: string
  value: ReactNode
  delta?: MetricDelta | null
  hint?: string
  invert?: boolean
  tone?: "warn" | "danger" | "ok"
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] px-4 py-3.5">
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">{label}</p>
        <DeltaBadge delta={delta} invert={invert} />
      </div>
      <p
        className={cn(
          "mt-1.5 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums tracking-tight sm:text-[28px]",
          tone === "danger" && "text-rose-600 dark:text-rose-400",
          tone === "warn" && "text-amber-600 dark:text-amber-400",
          tone === "ok" && "text-emerald-600 dark:text-emerald-400"
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 truncate text-xs text-[var(--wq-text-muted)]">{hint}</p> : null}
    </div>
  )
}

/** Small area chart for a daily series. */
export function Spark({ points, label, color = "var(--wq-brand)", format = nf }: { points: Array<{ day: string; value: number }>; label: string; color?: string; format?: (v: number) => string }) {
  const w = 300
  const h = 70
  const max = Math.max(1, ...points.map((p) => p.value))
  const step = points.length > 1 ? w / (points.length - 1) : w
  const xy = points.map((p, i) => [i * step, h - (p.value / max) * (h - 6) - 3] as const)
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ")
  const area = xy.length ? `${line} L${w},${h} L0,${h} Z` : ""
  const total = points.reduce((a, p) => a + p.value, 0)
  return (
    <div className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-sm tabular-nums text-[var(--wq-text-muted)]">{format(total)}</p>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 h-20 w-full" preserveAspectRatio="none" role="img" aria-label={label}>
        <path d={area} fill={color} opacity={0.12} />
        <path d={line} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
        {xy.map(([x, y], i) => (
          <circle key={points[i].day} cx={x} cy={y} r={2.5} fill={color}>
            <title>{`${points[i].day.split("-").reverse().join("/")}: ${format(points[i].value)}`}</title>
          </circle>
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-[var(--wq-text-muted)]">
        <span>{points[0]?.day.split("-").reverse().slice(0, 2).join("/")}</span>
        <span>{points.at(-1)?.day.split("-").reverse().slice(0, 2).join("/")}</span>
      </div>
    </div>
  )
}

/** Column chart with a tooltip per column (ex.: requests per half hour). */
export function Columns({ points, label }: { points: Array<{ at: string; value: number }>; label: string }) {
  const max = Math.max(1, ...points.map((p) => p.value))
  const [hover, setHover] = useState<number | null>(null)
  const shown = hover != null ? points[hover] : null
  return (
    <div className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs tabular-nums text-[var(--wq-text-muted)]">
          {shown
            ? `${new Date(shown.at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} · ${nf(shown.value)}`
            : `${points.length} janelas de 30 min`}
        </p>
      </div>
      {points.length ? (
        <div className="mt-3 flex h-32 items-end gap-px" onMouseLeave={() => setHover(null)}>
          {points.map((p, i) => (
            <div
              key={p.at}
              onMouseEnter={() => setHover(i)}
              className={cn("min-w-[1px] flex-1 rounded-t-sm", hover === i ? "bg-[var(--wq-brand)]" : "bg-[var(--wq-brand)]/45")}
              style={{ height: `${Math.max(2, (p.value / max) * 100)}%` }}
              title={`${new Date(p.at).toLocaleString("pt-BR")}: ${nf(p.value)}`}
            />
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-[var(--wq-text-muted)]">Sem dados no período.</p>
      )}
    </div>
  )
}

/** Horizontal bars with label, value and an optional side note. */
export function Bars({
  rows,
  title,
  hint,
  empty = "Sem dados no período.",
  format = nf,
}: {
  rows: Array<{ label: string; value: number; note?: string; tone?: string }>
  title: string
  hint?: string
  empty?: string
  format?: (v: number) => string
}) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <div className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-4">
      <p className="text-sm font-semibold">{title}</p>
      {hint ? <p className="mt-0.5 text-xs text-[var(--wq-text-muted)]">{hint}</p> : null}
      {rows.length ? (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <li key={r.label} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-2 text-sm">
              <span className="truncate" title={r.label}>
                {r.label}
              </span>
              <span className="h-2 overflow-hidden rounded-full bg-[var(--wq-paper)]">
                <span className={cn("block h-full rounded-full", r.tone || "bg-[var(--wq-brand)]")} style={{ width: `${Math.max(3, (r.value / max) * 100)}%` }} />
              </span>
              <span className="text-right text-xs tabular-nums text-[var(--wq-text-muted)]">
                <b className="font-semibold text-[var(--wq-text)]">{format(r.value)}</b>
                {r.note ? ` · ${r.note}` : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-[var(--wq-text-muted)]">{empty}</p>
      )}
    </div>
  )
}

export function HealthDot({ status, label }: { status: "healthy" | "degraded" | "down"; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium">
      <span
        className={cn(
          "h-2.5 w-2.5 rounded-full",
          status === "healthy" ? "bg-emerald-500" : status === "degraded" ? "bg-amber-500" : "bg-rose-500"
        )}
      />
      {label}
    </span>
  )
}

export function Chips<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T
  options: Array<{ id: T; label: string }>
  onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-1">
      {options.map((o) => (
        <button
          key={String(o.id)}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded-lg px-3 py-1 text-sm font-medium transition",
            value === o.id ? "bg-[var(--wq-brand)] text-white" : "text-[var(--wq-text-muted)] hover:text-[var(--wq-text)]"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl bg-[var(--wq-paper)]", className)} />
}

/** "Atualizado há 12 s" and a reload every `everyMs` (default 60 s). */
export function useAutoRefresh(load: () => Promise<void> | void, deps: unknown[], everyMs = 60000) {
  const [at, setAt] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    let alive = true
    const run = async () => {
      await load()
      if (alive) setAt(Date.now())
    }
    void run()
    const t = window.setInterval(() => void run(), everyMs)
    const tick = window.setInterval(() => setNow(Date.now()), 5000)
    return () => {
      alive = false
      window.clearInterval(t)
      window.clearInterval(tick)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  const ago = at ? Math.max(0, Math.round((now - at) / 1000)) : null
  return ago == null ? "carregando…" : ago < 5 ? "atualizado agora" : `atualizado há ${ago < 60 ? `${ago}s` : `${Math.round(ago / 60)} min`}`
}

export const PERIODS = [
  { id: 1, label: "Hoje" },
  { id: 7, label: "7d" },
  { id: 14, label: "14d" },
  { id: 30, label: "30d" },
]

export const LONG_PERIODS = [
  { id: 7, label: "7d" },
  { id: 14, label: "14d" },
  { id: 30, label: "30d" },
  { id: 90, label: "90d" },
]
