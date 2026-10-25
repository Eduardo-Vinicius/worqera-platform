"use client"

import type { QuoteReason } from "@/lib/apiV1"
import { cn } from "@/lib/utils"
import { FOLLOW_UP_PRESETS, REASONS, dateInputValue, followUpFromDateInput, followUpFromDays } from "./quoteUi"

export function ReasonPicker({
  value,
  onChange,
}: {
  value: QuoteReason | null
  onChange: (value: QuoteReason) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {REASONS.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onChange(r.id)}
          className={cn(
            "min-h-11 rounded-xl border px-3 py-2 text-left text-sm font-medium transition",
            value === r.id
              ? "border-[var(--wq-brand)] bg-[var(--wq-brand-soft)] text-[var(--wq-text)] shadow-[inset_0_0_0_1px_var(--wq-brand)]"
              : "border-[var(--wq-border)] bg-[var(--wq-surface)] text-[var(--wq-text-muted)] hover:border-[var(--wq-brand)]/40 hover:text-[var(--wq-text)]"
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  )
}

export function FollowUpPicker({
  value,
  onChange,
}: {
  value: string | null
  onChange: (iso: string | null) => void
}) {
  const current = dateInputValue(value)
  const presetFor = (days: number | null) => {
    const iso = followUpFromDays(days)
    return dateInputValue(iso) === current && (days == null) === (value == null)
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {FOLLOW_UP_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(followUpFromDays(p.days))}
            className={cn(
              "h-9 rounded-full border px-3 text-sm transition",
              presetFor(p.days)
                ? "border-[var(--wq-action)] bg-[var(--wq-action)] text-white"
                : "border-[var(--wq-border)] bg-[var(--wq-surface)] text-[var(--wq-text-muted)] hover:text-[var(--wq-text)]"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <input
        type="date"
        value={current}
        onChange={(e) => onChange(followUpFromDateInput(e.target.value))}
        className="h-10 w-full rounded-[10px] border border-[var(--wq-border)] bg-[var(--wq-paper)] px-3 text-sm text-[var(--wq-text)] sm:w-48"
        aria-label="Outra data"
      />
    </div>
  )
}
