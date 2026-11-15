"use client"

import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/landing/language-provider"
import { Magnetic } from "@/components/landing/fx/magnetic"
import { WA_MESSAGES, waLink } from "@/components/landing/contact"

/** Last push before the footer: a dark, flat panel with the two ways in (trial or full setup). */
export function CtaSection() {
  const { locale, t } = useLanguage()

  return (
    <section className="px-4 py-16 sm:px-6 sm:py-24">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#130f1f] px-6 py-16 text-center text-white sm:px-10 sm:py-20">
        <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-[var(--primary)]" />

        <div className="relative mx-auto max-w-2xl">
          <h2 className="lp-display text-balance text-4xl font-semibold tracking-tight sm:text-5xl">{t.cta.title}</h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/80 sm:text-lg">{t.cta.sub}</p>
          <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Magnetic>
              <Button asChild size="lg" className="h-12 w-full rounded-full bg-[var(--primary)] px-8 text-base font-semibold text-white hover:bg-[var(--primary)]/90 sm:w-auto">
                <Link href="/signup">
                  {t.cta.primary}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </Magnetic>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 rounded-full border-white/25 bg-transparent px-8 text-base font-medium text-white hover:bg-white/10 hover:text-white"
            >
              <a href={waLink(WA_MESSAGES.setup[locale])} target="_blank" rel="noopener noreferrer">
                {t.cta.secondary}
              </a>
            </Button>
          </div>
          <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/70">
            {t.cta.points.map((point) => (
              <li key={point} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
