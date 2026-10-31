"use client"

import { useLanguage } from "@/components/landing/language-provider"

/** The life of one order, from check-in to delivery. */
export function HowSection() {
  const { t } = useLanguage()

  return (
    <section id="como-funciona" className="scroll-mt-24 border-t border-[var(--border)] bg-[var(--muted)]/40 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--primary)] uppercase">{t.how.eyebrow}</p>
        <h2 className="lp-display mt-3 max-w-2xl text-balance text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
          {t.how.title}
        </h2>
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.how.steps.map((step, index) => (
            <li key={step.title} className="relative rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <span className="lp-display flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary)] text-base font-semibold text-[var(--primary-foreground)]">
                {index + 1}
              </span>
              <h3 className="lp-display mt-4 text-lg font-semibold text-[var(--ink)]">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">{step.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
