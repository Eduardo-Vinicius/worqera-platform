"use client"

import { useEffect, useState } from "react"
import {
  AlarmClock,
  BadgeDollarSign,
  Cake,
  CalendarClock,
  Flag,
  Flame,
  Loader2,
  PackageCheck,
  PhoneCall,
  RefreshCw,
  Sparkles,
  Tag,
  Timer,
  Truck,
  Warehouse,
  type LucideIcon,
} from "lucide-react"
import { getDailyBriefV1, type AiQuota, type DailyBrief, type DailyBriefAction } from "@/lib/apiV1"
import { cn } from "@/lib/utils"

export const ACTION_ICON: Record<string, LucideIcon> = {
  call: PhoneCall,
  ready: PackageCheck,
  unpaid: BadgeDollarSign,
  shelf: Warehouse,
  late: AlarmClock,
  price: Tag,
  tomorrow: CalendarClock,
  today: Timer,
  urgent: Flame,
  check: Flag,
  restock: Truck,
  birthday: Cake,
}

type Chip = { label: string; value: number; href: string; tone: "" | "ok" | "warn" | "brand" }

function briefChips(brief: DailyBrief | null): Chip[] {
  if (!brief) return []
  if (brief.audience === "sector") {
    const n = brief.numbers
    return [
      { label: "Na fila", value: n.queue, href: "/kanban", tone: "" },
      { label: "Atrasados", value: n.overdue, href: "/kanban", tone: n.overdue ? "warn" : "" },
      { label: "Vencem hoje", value: n.dueToday, href: "/kanban", tone: n.dueToday ? "brand" : "" },
      { label: "Vencem amanhã", value: n.dueTomorrow, href: "/kanban", tone: "" },
    ]
  }
  const n = brief.numbers
  const late: Chip = { label: "Atrasados", value: n.overdue, href: "/kanban", tone: n.overdue ? "warn" : "" }
  const rest: Chip[] = [
    { label: "Prontos", value: n.ready, href: "/kanban", tone: n.ready ? "ok" : "" },
    { label: "Ligar hoje", value: n.callToday, href: "/orcamentos", tone: n.callOverdue ? "warn" : n.callToday ? "brand" : "" },
  ]
  const tomorrow: Chip = { label: "Vencem amanhã", value: n.dueTomorrow, href: "/kanban", tone: "" }
  return brief.audience === "team" ? [late, ...rest, tomorrow] : [...rest, late, tomorrow]
}

function chipTone(tone: Chip["tone"]) {
  return cn(
    tone === "warn" && "text-rose-600 dark:text-rose-400",
    tone === "ok" && "text-emerald-600 dark:text-emerald-400",
    tone === "brand" && "text-[var(--wq-brand)]"
  )
}

export const TONE: Record<DailyBriefAction["tone"], { bar: string; icon: string }> = {
  brand: { bar: "before:bg-[var(--wq-brand)]", icon: "bg-[var(--wq-brand-soft)] text-[var(--wq-brand)]" },
  ok: { bar: "before:bg-emerald-500", icon: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
  warn: { bar: "before:bg-amber-500", icon: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
  danger: { bar: "before:bg-rose-500", icon: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" },
  muted: { bar: "before:bg-[var(--wq-border)]", icon: "bg-[var(--wq-paper)] text-[var(--wq-text-muted)]" },
}


export function useDailyBrief() {
  const [brief, setBrief] = useState<DailyBrief | null>(null)
  const [quota, setQuota] = useState<AiQuota | null>(null)
  const [busy, setBusy] = useState(false)
  const [hidden, setHidden] = useState(false)

  const load = (refresh = false) => {
    setBusy(true)
    getDailyBriefV1(refresh)
      .then((res) => {
        setBrief(res.brief)
        setQuota(res.aiQuota)
      })
      .catch(() => setHidden(true))
      .finally(() => setBusy(false))
  }

  useEffect(() => {
    load()
  }, [])

  return { brief, quota, busy, hidden, load }
}

/** Slim version for the sector kanban: the sentence plus the queue numbers, no links away from the board. */
export function SectorBriefStrip() {
  const { brief, busy, hidden, load } = useDailyBrief()
  if (hidden || !brief || brief.audience !== "sector") return null
  if (!brief.numbers.queue) return null
  const chips = briefChips(brief).filter((c) => c.label !== "Na fila" && c.value > 0)
  return (
    <section className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-[var(--wq-border)] bg-[var(--wq-surface)] px-3 py-2 animate-in fade-in duration-500">
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--wq-brand)] text-white">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium leading-snug text-[var(--wq-text)]">{brief.text}</span>
          {brief.tip ? <span className="block text-xs text-[var(--wq-text-muted)]">{brief.tip}</span> : null}
        </span>
      </span>
      {chips.length ? (
        <span className="flex items-center gap-3">
          {chips.map((c) => (
            <span key={c.label} className="text-xs text-[var(--wq-text-muted)]">
              <b className={cn("mr-1 text-base font-semibold tabular-nums text-[var(--wq-text)]", chipTone(c.tone))}>{c.value}</b>
              {c.label.toLowerCase()}
            </span>
          ))}
        </span>
      ) : null}
      <button
        type="button"
        onClick={() => load(true)}
        disabled={busy}
        className="rounded-lg p-1.5 text-[var(--wq-text-muted)] hover:bg-[var(--wq-paper)]"
        aria-label="Atualizar resumo"
        title="Atualizar"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
      </button>
    </section>
  )
}
