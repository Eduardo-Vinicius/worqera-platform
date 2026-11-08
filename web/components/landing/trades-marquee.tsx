"use client"

import Link from "next/link"
import { Car, Footprints, Glasses, Hammer, PawPrint, Printer, Scissors, Shirt, Smartphone, type LucideIcon } from "lucide-react"
import { useLanguage } from "@/components/landing/language-provider"
import { Marquee } from "@/components/landing/fx/marquee"
import { Reveal } from "@/components/landing/fx/reveal"
import type { TradeSlug } from "@/components/landing/trades-data"

export const TRADE_ICONS: Record<TradeSlug, LucideIcon> = {
  sapataria: Footprints,
  lavanderia: Shirt,
  assistencia: Smartphone,
  automotivo: Car,
  atelier: Scissors,
  grafica: Printer,
  marcenaria: Hammer,
  otica: Glasses,
  pet: PawPrint,
}

type TradeItem = { slug: string; trade: string; item: string; use: string }

function TradeChip({ item }: { item: TradeItem }) {
  const Icon = TRADE_ICONS[item.slug as TradeSlug] || Footprints
  return (
    <Link
      href={`/${item.slug}`}
      className="group/chip flex w-[300px] shrink-0 items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 transition hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-[var(--shadow-lg)] sm:w-[340px]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--primary)] transition group-hover/chip:bg-[var(--primary)] group-hover/chip:text-[var(--primary-foreground)]">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[var(--ink)]">
          {item.trade} <span className="font-normal text-[var(--muted-foreground)]">· {item.item}</span>
        </span>
        <span className="block truncate text-xs text-[var(--muted-foreground)]">{item.use}</span>
      </span>
    </Link>
  )
}

/** Two strips of trades moving in opposite directions; each one opens its trade page. */
export function TradesMarquee() {
  const { t } = useLanguage()
  const items = t.trades.items
  const reversed = [...items].reverse()

  return (
    <section id="ramos" className="scroll-mt-24 overflow-hidden border-t border-[var(--border)] py-16 sm:py-20">
      <Reveal className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="lp-display text-balance text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">{t.trades.title}</h2>
        <p className="mt-3 text-base text-[var(--muted-foreground)] sm:text-lg">{t.trades.line}</p>
      </Reveal>
      <div className="mt-10 space-y-3">
        <Marquee seconds={55}>
          {items.map((item) => (
            <TradeChip key={item.slug} item={item} />
          ))}
        </Marquee>
        <Marquee seconds={65} reverse>
          {reversed.map((item) => (
            <TradeChip key={item.slug} item={item} />
          ))}
        </Marquee>
      </div>
      <p className="mx-auto mt-6 max-w-2xl px-4 text-center text-sm text-[var(--muted-foreground)]">{t.trades.hint}</p>
    </section>
  )
}
