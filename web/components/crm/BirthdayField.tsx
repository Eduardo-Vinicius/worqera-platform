"use client"

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

export type BirthdayValue = { day: number; month: number; year: number | null } | null

/** Day + month (year optional): enough to send "feliz aniversário". */
export function BirthdayField({ value, onChange, id = "birthday" }: { value: BirthdayValue; onChange: (v: BirthdayValue) => void; id?: string }) {
  const day = value?.day || ""
  const month = value?.month || ""
  const year = value?.year || ""
  const set = (patch: Partial<{ day: number; month: number; year: number | null }>) => {
    const next = { day: Number(day) || 0, month: Number(month) || 0, year: year ? Number(year) : null, ...patch }
    if (!next.day && !next.month) return onChange(null)
    onChange(next as { day: number; month: number; year: number | null })
  }
  const cls = "h-10 rounded-[10px] border border-[var(--wq-border)] bg-[var(--wq-surface)] px-2 text-sm"
  return (
    <div className="grid grid-cols-[4.5rem_1fr_5.5rem] gap-2">
      <select id={id} aria-label="Dia" className={cls} value={day} onChange={(e) => set({ day: Number(e.target.value) })}>
        <option value="">Dia</option>
        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
      <select aria-label="Mês" className={cls} value={month} onChange={(e) => set({ month: Number(e.target.value) })}>
        <option value="">Mês</option>
        {MONTHS.map((m, i) => (
          <option key={m} value={i + 1}>
            {m}
          </option>
        ))}
      </select>
      <input
        aria-label="Ano (opcional)"
        inputMode="numeric"
        placeholder="Ano"
        maxLength={4}
        className={cls}
        value={year}
        onChange={(e) => set({ year: e.target.value.replace(/\D/g, "") ? Number(e.target.value.replace(/\D/g, "")) : null })}
      />
    </div>
  )
}

/** API payload: { day, month, year } when complete, null to clear, undefined when untouched. */
export function birthdayPayload(v: BirthdayValue) {
  if (!v) return null
  if (!v.day || !v.month) return undefined
  return { day: v.day, month: v.month, year: v.year && v.year >= 1900 ? v.year : null }
}
