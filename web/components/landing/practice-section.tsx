"use client"

import { useLanguage } from "@/components/landing/language-provider"

export function PracticeSection() {
  const { t } = useLanguage()

  return (
    <section className="border-t border-[var(--border)] py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="lp-display text-balance text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
            {t.practice.title}
          </h2>
          <p className="mt-3 text-base text-[var(--muted-foreground)] sm:text-lg">{t.practice.subtitle}</p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2 lg:gap-8">
          <div className="border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--muted-foreground)] uppercase">
              {t.practice.boardLabel}
            </p>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {["A", "B", "C"].map((col, i) => (
                <div key={col} className="min-h-[140px] bg-[var(--mock-bg)] p-2.5">
                  <div className="mb-2 h-1 w-8 bg-[var(--ink)]/20" />
                  <div className="space-y-2">
                    <div className="border border-[var(--border)] bg-[var(--surface)] px-2 py-2">
                      <p className="lp-mono text-xs font-medium">00{30 + i}</p>
                      <p className="mt-1 h-1.5 w-10 bg-[var(--muted)]" />
                    </div>
                    {i < 2 ? (
                      <div className="border border-[var(--border)] bg-[var(--surface)] px-2 py-2">
                        <p className="lp-mono text-xs font-medium">00{40 + i}</p>
                        <p className="mt-1 h-1.5 w-8 bg-[var(--muted)]" />
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-between border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--muted-foreground)] uppercase">
                {t.practice.lookupLabel}
              </p>
              <p className="lp-mono mt-8 text-5xl font-semibold tracking-tight text-[var(--ink)] sm:text-6xl">
                {t.practice.lookupCode}
              </p>
              <p className="mt-3 inline-flex rounded-sm bg-[var(--muted)] px-2.5 py-1 text-sm font-medium text-[var(--ink)]">
                {t.practice.lookupStatus}
              </p>
            </div>
            <p className="mt-10 text-sm text-[var(--muted-foreground)]">{t.practice.lookupHint}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
