"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  AlarmClock,
  ArrowRight,
  BadgeDollarSign,
  CalendarClock,
  Lightbulb,
  Loader2,
  PackageCheck,
  PhoneCall,
  RefreshCw,
  Sparkles,
  Tag,
  Warehouse,
  type LucideIcon,
} from "lucide-react"
import { getDailyBriefV1, type AiQuota, type DailyBrief, type DailyBriefAction } from "@/lib/apiV1"
import { cn } from "@/lib/utils"
import { AiQuotaNotice } from "./AiQuotaNotice"

const ACTION_ICON: Record<string, LucideIcon> = {
  call: PhoneCall,
  ready: PackageCheck,
  unpaid: BadgeDollarSign,
  shelf: Warehouse,
  late: AlarmClock,
  price: Tag,
  tomorrow: CalendarClock,
}

const TONE: Record<DailyBriefAction["tone"], { bar: string; icon: string }> = {
  brand: { bar: "before:bg-[var(--wq-brand)]", icon: "bg-[var(--wq-brand-soft)] text-[var(--wq-brand)]" },
  ok: { bar: "before:bg-emerald-500", icon: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
  warn: { bar: "before:bg-amber-500", icon: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
  danger: { bar: "before:bg-rose-500", icon: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" },
  muted: { bar: "before:bg-[var(--wq-border)]", icon: "bg-[var(--wq-paper)] text-[var(--wq-text-muted)]" },
}

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })

/** Morning brief: what is at stake today and the four moves that matter. AI writes the words on Business. */
export function DailyBriefCard() {
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
    const role = String(localStorage.getItem("role") || "").toLowerCase()
    if (role === "sector") {
      setHidden(true)
      return
    }
    load()
  }, [])

  if (hidden) return null
  const n = brief?.numbers
  const actions = brief?.actions || []
  const stake = brief?.stake || 0
  const chips = n
    ? [
        { label: "Prontos", value: n.ready, href: "/kanban", tone: n.ready ? "ok" : "" },
        { label: "Ligar hoje", value: n.callToday, href: "/orcamentos", tone: n.callOverdue ? "warn" : n.callToday ? "brand" : "" },
        { label: "Atrasados", value: n.overdue, href: "/kanban", tone: n.overdue ? "warn" : "" },
        { label: "Vencem amanhã", value: n.dueTomorrow, href: "/kanban", tone: "" },
      ]
    : []

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[var(--wq-brand)]/15 blur-3xl"
      />
      <div className="relative flex items-start gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--wq-brand)] text-white shadow-[0_8px_20px_-8px_var(--wq-brand)]">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--wq-text-muted)]">
            Resumo do dia
            {brief?.ai ? (
              <span className="rounded-full bg-[var(--wq-brand)] px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white">IA</span>
            ) : null}
          </p>
          {stake > 0 ? (
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--wq-text)] sm:text-3xl">
              {brl(stake)} <span className="text-base font-medium text-[var(--wq-text-muted)] sm:text-lg">em jogo hoje</span>
            </p>
          ) : null}
          <p className={cn("text-[15px] font-medium leading-snug text-[var(--wq-text)] sm:text-base", stake > 0 ? "mt-1" : "mt-1")}>
            {brief ? brief.text : "Lendo a operação…"}
          </p>
          {brief?.tip ? (
            <p className="mt-2 flex items-start gap-1.5 text-sm text-[var(--wq-text-muted)]">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              {brief.tip}
            </p>
          ) : null}
          <AiQuotaNotice quota={quota} className="mt-2" />
        </div>
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
      </div>

      {actions.length ? (
        <ol className="relative mt-4 grid gap-2 px-4 sm:grid-cols-2 sm:px-5">
          {actions.map((a, index) => {
            const Icon = ACTION_ICON[a.id] || ArrowRight
            const tone = TONE[a.tone] || TONE.muted
            return (
              <li
                key={a.id}
                className="animate-in fade-in slide-in-from-bottom-1 fill-mode-both duration-500"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <Link
                  href={a.href}
                  className={cn(
                    "group relative flex items-center gap-3 overflow-hidden rounded-xl border border-[var(--wq-border)] bg-[var(--wq-surface)] py-2.5 pl-4 pr-3 transition hover:-translate-y-0.5 hover:border-[var(--wq-brand)]/40 hover:shadow-md",
                    "before:absolute before:inset-y-0 before:left-0 before:w-1",
                    tone.bar
                  )}
                >
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", tone.icon)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[var(--wq-text)]">
                      <span className="mr-1 text-[var(--wq-text-muted)]">{index + 1}.</span>
                      {a.title}
                    </span>
                    <span className="block truncate text-xs text-[var(--wq-text-muted)]">{a.detail}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[var(--wq-text-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--wq-brand)]" />
                </Link>
              </li>
            )
          })}
        </ol>
      ) : null}

      <div className="relative mt-4 grid grid-cols-2 gap-px border-t border-[var(--wq-border)] bg-[var(--wq-border)] sm:grid-cols-4">
        {chips.map((c) => (
          <Link key={c.label} href={c.href} className="bg-[var(--wq-surface)] px-4 py-2.5 hover:bg-[var(--wq-paper)]">
            <p
              className={cn(
                "font-[family-name:var(--font-display)] text-xl font-semibold tabular-nums",
                c.tone === "warn" && "text-rose-600 dark:text-rose-400",
                c.tone === "ok" && "text-emerald-600 dark:text-emerald-400",
                c.tone === "brand" && "text-[var(--wq-brand)]"
              )}
            >
              {c.value}
            </p>
            <p className="text-[11px] text-[var(--wq-text-muted)]">{c.label}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
