"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/landing/language-provider"
import { FlowFilm } from "@/components/landing/flow-film"
import { ArrowRight } from "lucide-react"

export function HeroSection() {
  const { t } = useLanguage()

  return (
    <section className="lp-hero-wash relative overflow-hidden pt-14 sm:pt-16">
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-10 sm:px-6 sm:pb-14 sm:pt-16 lg:pt-20">
        <div className="lp-animate-in mx-auto max-w-3xl text-center">
          <p className="lp-display mb-3 text-sm font-semibold tracking-[0.28em] text-[var(--primary)] uppercase">
            {t.hero.brand}
          </p>
          <p className="mb-5 text-sm font-medium text-[var(--ink)]">{t.hero.kicker}</p>
          <h1 className="lp-display text-balance text-4xl font-semibold leading-[1.05] text-[var(--ink)] sm:text-5xl lg:text-[3.5rem]">
            {t.hero.headline}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-[var(--muted-foreground)] sm:text-lg">
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
              <Link href="/login">{t.hero.secondary}</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-[var(--muted-foreground)]">{t.hero.note}</p>
          <p className="mt-1 text-sm font-medium text-[var(--ink)]">{t.hero.social}</p>
        </div>
      </div>

      <div className="lp-animate-in-delay mx-auto max-w-6xl px-0 pb-6 sm:px-6 sm:pb-10">
        <FlowFilm />
      </div>
    </section>
  )
}
