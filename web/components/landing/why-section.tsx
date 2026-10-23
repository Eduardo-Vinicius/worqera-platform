"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/landing/language-provider"

export function WhySection() {
  const { t } = useLanguage()

  return (
    <section className="border-t border-[var(--border)] py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="lp-display max-w-3xl text-balance text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
          {t.why.title}
        </h2>
        <p className="mt-3 max-w-xl text-base text-[var(--muted-foreground)] sm:text-lg">{t.why.subtitle}</p>

        <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--primary)] uppercase">
              {t.why.replacesTitle}
            </p>
            <ul className="mt-5 divide-y divide-[var(--border)] border-y border-[var(--border)]">
              {t.why.replaces.map((row) => (
                <li key={row.from} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                  <span className="text-sm text-[var(--muted-foreground)] line-through decoration-[var(--border)]">
                    {row.from}
                  </span>
                  <span className="text-sm font-medium text-[var(--ink)] sm:text-right">{row.to}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--primary)] uppercase">
              {t.why.reasonsTitle}
            </p>
            <ul className="mt-5 grid gap-5">
              {t.why.reasons.map((row) => (
                <li key={row.title}>
                  <p className="font-medium text-[var(--ink)]">{row.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--muted-foreground)]">{row.desc}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Button asChild size="lg" className="lp-cta mt-10 h-12 rounded-md px-8 text-base font-medium">
          <Link href="/signup">
            {t.why.cta}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  )
}
