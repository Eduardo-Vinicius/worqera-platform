"use client"

import { useLanguage } from "@/components/landing/language-provider"

export function TradesSection() {
  const { t } = useLanguage()

  return (
    <section id="ramos" className="scroll-mt-24 bg-[var(--ink)] py-16 text-white sm:py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="lp-display text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          {t.trades.title}
        </h2>
        <p className="mt-3 max-w-xl text-base text-white/65 sm:text-lg">{t.trades.line}</p>

        <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-4 sm:mt-12 sm:gap-x-10">
          {t.trades.items.map((item) => (
            <li key={item}>
              <span className="lp-display lp-trade cursor-default text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {item}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-10 max-w-lg text-sm text-white/45">{t.trades.hint}</p>
      </div>
    </section>
  )
}
