"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Loader2, RefreshCw, Sparkles } from "lucide-react"
import { getDailyBriefV1, type AiQuota, type DailyBrief } from "@/lib/apiV1"
import { cn } from "@/lib/utils"
import { AiQuotaNotice } from "./AiQuotaNotice"

/** Morning summary on the home screen. Numbers are live; the sentence is AI on Business. */
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
  const chips = n
    ? [
        { label: "Prontos para avisar", value: n.ready, href: "/kanban", tone: n.ready ? "ok" : "" },
        { label: "Ligar hoje", value: n.callToday, href: "/orcamentos", tone: n.callOverdue ? "warn" : n.callToday ? "brand" : "" },
        { label: "Atrasados", value: n.overdue, href: "/kanban", tone: n.overdue ? "warn" : "" },
        { label: "Vencem amanhã", value: n.dueTomorrow, href: "/kanban", tone: "" },
      ]
    : []

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--wq-brand)_10%,var(--wq-surface)),var(--wq-surface)_60%)]">
      <div className="flex items-start gap-3 px-4 pt-4 sm:px-5">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--wq-brand)] text-white">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--wq-text-muted)]">
            Resumo do dia
            {brief?.ai ? (
              <span className="rounded-full bg-[var(--wq-brand)] px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white">IA</span>
            ) : null}
          </p>
          <p className="mt-1 text-[15px] font-medium leading-snug text-[var(--wq-text)] sm:text-base">
            {brief ? brief.text : "Lendo a operação…"}
          </p>
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
      <div className="mt-3 grid grid-cols-2 gap-px border-t border-[var(--wq-border)] bg-[var(--wq-border)] sm:grid-cols-4">
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
