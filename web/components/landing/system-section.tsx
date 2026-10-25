"use client"

import Link from "next/link"
import { ArrowRight, ArrowUpRight } from "lucide-react"
import { useLanguage } from "@/components/landing/language-provider"

export function SystemSection() {
  const { t } = useLanguage()

  return (
    <section id="recursos" className="scroll-mt-24 border-t border-[var(--border)] py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--primary)] uppercase">
              {t.system.eyebrow}
            </p>
            <h2 className="lp-display mt-3 text-balance text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
              {t.system.title}
            </h2>
            <p className="mt-3 text-base text-[var(--muted-foreground)] sm:text-lg">{t.system.subtitle}</p>
          </div>
          <Link
            href="/recursos"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-[var(--primary)] hover:underline"
          >
            {t.system.all}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <ol className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-4">
          {t.system.pillars.map((pillar, index) => (
            <li key={pillar.title}>
              <Link
                href={pillar.href}
                className="lp-pillar group flex h-full flex-col rounded-sm border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="lp-mono text-xs text-[var(--primary)]">{pillar.k}</p>
                  <ArrowUpRight className="h-4 w-4 text-[var(--muted-foreground)] transition group-hover:text-[var(--primary)]" />
                </div>
                <h3 className="lp-display mt-3 text-xl font-semibold text-[var(--ink)]">{pillar.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--muted-foreground)]">{pillar.desc}</p>
                <p className="mt-4 text-[10px] font-semibold tracking-[0.14em] text-[var(--primary)] uppercase">{pillar.tag}</p>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
