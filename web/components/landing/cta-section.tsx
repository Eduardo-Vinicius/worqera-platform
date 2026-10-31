"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/landing/language-provider"

const WHATSAPP = "https://wa.me/5511985591053?text=" + encodeURIComponent("Olá! Quero conhecer a Worqera.")

/** Last push before the footer. */
export function CtaSection() {
  const { t } = useLanguage()
  return (
    <section className="border-t border-[var(--border)] py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="lp-display text-balance text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">{t.cta.title}</h2>
        <p className="mx-auto mt-3 max-w-xl text-base text-[var(--muted-foreground)] sm:text-lg">{t.cta.sub}</p>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Button asChild size="lg" className="lp-cta h-12 rounded-md px-8 text-base font-medium">
            <Link href="/signup">
              {t.cta.primary}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-12 rounded-md border-[var(--border)] bg-[var(--surface)] px-8 text-base font-medium text-[var(--ink)] hover:bg-[var(--muted)]"
          >
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer">
              {t.cta.secondary}
            </a>
          </Button>
        </div>
      </div>
    </section>
  )
}
