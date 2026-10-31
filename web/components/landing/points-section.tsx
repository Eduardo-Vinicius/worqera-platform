"use client"

import Link from "next/link"
import { ArrowRight, ArrowUpRight, Bell, HandCoins, KanbanSquare, Wallet, X } from "lucide-react"
import { useLanguage } from "@/components/landing/language-provider"

const ICONS = [KanbanSquare, Bell, HandCoins, Wallet]

/** Why use it: each pain of the shop before, and what it looks like with Worqera. */
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

        <ol className="mt-10 grid gap-4 md:grid-cols-2">
          {t.points.items.map((point, index) => {
            const Icon = ICONS[index] || KanbanSquare
            return (
              <li key={point.title}>
                <Link
                  href={point.href}
                  className="lp-pillar group flex h-full flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]"
                >
                  <div className="flex items-center justify-between px-6 pt-6">
                    <span className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--primary)]/10 text-[var(--primary)]">
                        <Icon className="h-5 w-5" />
                      </span>
                      <h3 className="lp-display text-xl font-semibold text-[var(--ink)]">{point.title}</h3>
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-[var(--muted-foreground)] transition group-hover:text-[var(--primary)]" />
                  </div>
                  <div className="mx-6 mt-5 flex items-start gap-2 rounded-md bg-[var(--muted)] px-3 py-2.5 text-sm text-[var(--muted-foreground)]">
                    <X className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
                    <span>
                      <span className="font-semibold">{t.points.before}: </span>
                      {point.before}
                    </span>
                  </div>
                  <p className="flex-1 px-6 pt-4 text-[15px] leading-relaxed text-[var(--ink)]">
                    <span className="font-semibold text-[var(--primary)]">{t.points.after}: </span>
                    {point.desc}
                  </p>
                  <p className="mt-5 border-t border-[var(--border)] px-6 py-3 text-xs font-medium text-[var(--muted-foreground)]">{point.proof}</p>
                </Link>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
