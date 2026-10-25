"use client"

import { useEffect, useState } from "react"
import { Loader2, RefreshCw, Sparkles } from "lucide-react"
import { getWeeklyInsightsV1, type AiQuota } from "@/lib/apiV1"
import { AiQuotaNotice } from "./AiQuotaNotice"

/** Weekly read of the operation (Business). Hidden on other plans. */
export function WeeklyInsightsCard() {
  const [data, setData] = useState<{ week: string; bullets: string[]; ai: boolean } | null>(null)
  const [locked, setLocked] = useState(true)
  const [busy, setBusy] = useState(false)
  const [quota, setQuota] = useState<AiQuota | null>(null)

  const load = (refresh = false) => {
    setBusy(true)
    getWeeklyInsightsV1(refresh)
      .then((res) => {
        setLocked(res.locked)
        setData(res.insights)
        setQuota(res.aiQuota || null)
      })
      .catch(() => setLocked(true))
      .finally(() => setBusy(false))
  }

  useEffect(() => {
    load()
  }, [])

  if (locked && !busy) return null
  return (
    <section className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
      <header className="flex items-center justify-between gap-2 border-b border-[var(--wq-border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--wq-brand)]" />
          <h2 className="text-sm font-semibold text-[var(--wq-text)]">Leitura da semana</h2>
          {data?.ai ? (
            <span className="rounded-full bg-[var(--wq-brand)] px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white">IA</span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={busy}
          className="rounded-lg p-1.5 text-[var(--wq-text-muted)] hover:bg-[var(--wq-paper)]"
          aria-label="Gerar de novo"
          title="Gerar de novo"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </button>
      </header>
      <ul className="space-y-2.5 px-4 py-4">
        {(data?.bullets || []).map((b, i) => (
          <li key={i} className="flex gap-3 text-sm leading-relaxed text-[var(--wq-text)]">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--wq-brand)]" />
            <span>{b}</span>
          </li>
        ))}
        {!data && busy ? <li className="text-sm text-[var(--wq-text-muted)]">Lendo os números da semana…</li> : null}
      </ul>
      <AiQuotaNotice quota={quota} className="mx-4 mb-4" />
    </section>
  )
}
