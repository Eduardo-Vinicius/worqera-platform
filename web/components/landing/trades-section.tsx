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

        <ul className="mt-10 grid gap-6 sm:mt-12 sm:grid-cols-2 lg:grid-cols-3">
          {t.trades.items.map((row) => (
            <li key={row.trade} className="border-t border-white/15 pt-4">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-white/45 uppercase">{row.trade}</p>
              <p className="lp-display mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{row.item}</p>
            </li>
          ))}
        </ul>

        <p className="mt-10 max-w-lg text-sm text-white/45">{t.trades.hint}</p>
      </div>
    </section>
  )
}
