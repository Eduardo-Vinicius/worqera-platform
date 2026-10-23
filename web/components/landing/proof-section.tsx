"use client"

import { useLanguage } from "@/components/landing/language-provider"

export function ProofSection() {
  const { t } = useLanguage()

  return (
    <section className="border-t border-[var(--border)]">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--primary)] uppercase">{t.proof.title}</p>
        <div className="mt-6 grid gap-8 sm:grid-cols-3">
          {t.proof.items.map((item) => (
            <div key={item.label}>
              <p className="lp-display text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
                {item.value}
              </p>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
