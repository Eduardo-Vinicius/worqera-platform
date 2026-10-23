"use client"

import Link from "next/link"
import { useLanguage } from "@/components/landing/language-provider"

export function TradesSection() {
  const { t } = useLanguage()

  return (
    <section id="ramos" className="scroll-mt-24 bg-[var(--band)] py-16 text-[var(--on-band)] sm:py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="lp-display text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          {t.trades.title}
        </h2>
        <p className="mt-3 max-w-xl text-base text-[var(--on-band)]/70 sm:text-lg">{t.trades.line}</p>

        <ul className="mt-10 grid gap-6 sm:mt-12 sm:grid-cols-2 lg:grid-cols-3">
          {t.trades.items.map((row) => (
            <li key={row.trade} className="border-t border-white/15 pt-4">
              <Link href={`/${row.slug}`} className="block hover:opacity-90">
                <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--action)] uppercase">{row.trade}</p>
                <p className="lp-display mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{row.item}</p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--on-band)]/60">{row.use}</p>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-10 max-w-lg text-sm text-[var(--on-band)]/55">{t.trades.hint}</p>
      </div>
    </section>
  )
}
