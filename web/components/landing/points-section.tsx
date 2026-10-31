"use client"

import Link from "next/link"
import { ArrowRight, ArrowUpRight, Bell, HandCoins, KanbanSquare } from "lucide-react"
import { useLanguage } from "@/components/landing/language-provider"

const ICONS = [KanbanSquare, Bell, HandCoins]

/** The three main points of the product, each linking to its feature page. */
export function PointsSection() {
  const { t } = useLanguage()

  return (
    <section id="produto" className="scroll-mt-24 border-t border-[var(--border)] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--primary)] uppercase">{t.points.eyebrow}</p>
            <h2 className="lp-display mt-3 text-balance text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
              {t.points.title}
            </h2>
          </div>
          <Link
            href="/recursos"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-[var(--primary)] hover:underline"
          >
            {t.points.all}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {t.points.items.map((point, index) => {
            const Icon = ICONS[index] || KanbanSquare
            return (
              <li key={point.title}>
                <Link
                  href={point.href}
                  className="lp-pillar group flex h-full flex-col rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--primary)]/10 text-[var(--primary)]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-[var(--muted-foreground)] transition group-hover:text-[var(--primary)]" />
                  </div>
                  <h3 className="lp-display mt-5 text-xl font-semibold text-[var(--ink)]">{point.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--muted-foreground)] sm:text-[15px]">{point.desc}</p>
                  <p className="mt-5 text-xs font-medium text-[var(--primary)]">{point.proof}</p>
                </Link>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
