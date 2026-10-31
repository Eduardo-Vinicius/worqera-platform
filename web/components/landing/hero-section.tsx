"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/landing/language-provider"
import { FlowFilm } from "@/components/landing/flow-film"
import { ArrowRight } from "lucide-react"

/** Top of the home: what it does, the real numbers, who it is for. */
export function HeroSection() {
  const { t } = useLanguage()

  return (
    <section className="lp-hero-wash relative overflow-hidden pt-14 sm:pt-16">
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-10 sm:px-6 sm:pb-10 sm:pt-14 lg:pt-16">
        <div className="lp-animate-in mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm font-medium text-[var(--primary)]">{t.hero.kicker}</p>
          <h1 className="lp-display text-balance text-4xl font-semibold leading-[1.05] text-[var(--ink)] sm:text-5xl lg:text-[3.4rem]">
            {t.hero.headline}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-[var(--muted-foreground)] sm:text-lg">
            {t.hero.sub}
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="lp-cta h-12 rounded-md px-8 text-base font-medium">
              <Link href="/signup">
                {t.hero.cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 rounded-md border-[var(--border)] bg-[var(--surface)] px-8 text-base font-medium text-[var(--ink)] hover:bg-[var(--muted)]"
            >
              <Link href="/#pricing">{t.hero.secondary}</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-[var(--muted-foreground)]">{t.hero.note}</p>
        </div>

        <div className="lp-animate-in-delay mx-auto mt-10 max-w-4xl">
          <p className="text-center text-[11px] font-semibold tracking-[0.18em] text-[var(--muted-foreground)] uppercase">
            {t.numbers.label}
          </p>
          <dl className="mt-3 grid overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] sm:grid-cols-3">
            {t.numbers.items.map((item, index) => (
              <div
                key={item.label}
                className={`px-5 py-5 text-center ${index > 0 ? "border-t border-[var(--border)] sm:border-l sm:border-t-0" : ""}`}
              >
                <dt className="sr-only">{item.label}</dt>
                <dd className="lp-display text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">{item.value}</dd>
                <dd className="mt-1 text-sm text-[var(--muted-foreground)]">{item.label}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-center text-sm font-medium text-[var(--ink)]">{t.hero.social}</p>
        </div>

        <div id="ramos" className="mx-auto mt-8 max-w-4xl scroll-mt-24 text-center">
          <span className="mr-2 text-xs font-semibold tracking-[0.14em] text-[var(--muted-foreground)] uppercase">
            {t.hero.tradesLabel}
          </span>
          <ul className="mt-2 inline-flex flex-wrap justify-center gap-2">
            {t.trades.items.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/${item.slug}`}
                  className="inline-block rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--ink)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                >
                  {item.trade}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="lp-animate-in-delay mx-auto max-w-6xl px-0 pb-6 sm:px-6 sm:pb-10">
        <FlowFilm />
      </div>
    </section>
  )
}
