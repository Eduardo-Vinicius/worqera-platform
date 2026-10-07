"use client"

import { useLanguage } from "@/components/landing/language-provider"

export function SystemSection() {
  const { t } = useLanguage()

  return (
    <section className="border-t border-[var(--border)] py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--primary)] uppercase">
            {t.system.eyebrow}
          </p>
          <h2 className="lp-display mt-3 text-balance text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
            {t.system.title}
          </h2>
          <p className="mt-3 text-base text-[var(--muted-foreground)] sm:text-lg">{t.system.subtitle}</p>
        </div>

        <ol className="mt-10 grid gap-4 sm:mt-12 md:grid-cols-3">
          {t.system.pillars.map((pillar, index) => (
            <li
              key={pillar.title}
              className="lp-pillar rounded-sm border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"
              style={{ animationDelay: `${index * 0.12}s` }}
            >
              <p className="lp-mono text-xs text-[var(--primary)]">{pillar.k}</p>
              <h3 className="lp-display mt-3 text-2xl font-semibold text-[var(--ink)]">{pillar.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)] sm:text-[15px]">
                {pillar.desc}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
