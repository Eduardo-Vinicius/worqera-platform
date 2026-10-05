"use client"

import { useLanguage } from "@/components/landing/language-provider"

export function ProofSection() {
  const { t } = useLanguage()

  return (
    <section className="border-t border-[var(--border)]">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6 sm:py-12">
        {t.proof.items.map((item) => (
          <div key={item.label}>
            <p className="lp-display text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
              {item.value}
            </p>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
