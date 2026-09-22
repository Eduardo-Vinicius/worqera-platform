"use client"

import { useLanguage } from "@/components/landing/language-provider"

export function LoopSection() {
  const { t } = useLanguage()

  return (
    <section id="produto" className="scroll-mt-24 border-t border-[var(--border)] py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="lp-display text-balance text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
            {t.loop.title}
          </h2>
          <p className="mt-3 text-base text-[var(--muted-foreground)] sm:text-lg">{t.loop.subtitle}</p>
        </div>

        <ol className="mt-12 grid gap-10 sm:mt-14 md:grid-cols-3 md:gap-8">
          {t.loop.steps.map((step) => (
            <li key={step.n} className="border-t border-[var(--ink)] pt-5">
              <p className="lp-mono text-xs text-[var(--muted-foreground)]">{step.n}</p>
              <h3 className="lp-display mt-3 text-xl font-semibold text-[var(--ink)]">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)] sm:text-[15px]">
                {step.desc}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
