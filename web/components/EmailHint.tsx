"use client"

import { isEmail, suggestEmail } from "@/lib/emailHints"

/** Under an e-mail field: "falta o @" or "Você quis dizer …@gmail.com?" with one tap to fix. */
export function EmailHint({ value, onFix }: { value: string; onFix: (email: string) => void }) {
  const typed = value.trim()
  if (!typed) return null
  const fix = suggestEmail(typed)
  if (fix) {
    return (
      <p className="text-xs text-amber-700 dark:text-amber-300">
        Você quis dizer <b className="font-semibold">{fix}</b>?{" "}
        <button type="button" onClick={() => onFix(fix)} className="font-semibold text-[var(--wq-brand-text)] underline underline-offset-2">
          Usar este
        </button>
      </p>
    )
  }
  if (!isEmail(typed)) {
    return <p className="text-xs text-[var(--wq-danger)]">Confira o e-mail: falta o @ ou o domínio (ex.: nome@gmail.com).</p>
  }
  return null
}
