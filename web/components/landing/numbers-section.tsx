"use client"

import { useLanguage } from "@/components/landing/language-provider"
import { CountUp } from "@/components/landing/fx/count-up"
import { RevealGroup, RevealItem } from "@/components/landing/fx/reveal"
import { cn } from "@/lib/utils"

/** The real numbers of shops already running on Worqera, counting up as they appear. */
export function NumbersSection() {
  const { t } = useLanguage()

  return (
    <section className="relative py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-center text-[11px] font-semibold tracking-[0.18em] text-[var(--muted-foreground)] uppercase">{t.numbers.label}</p>
        <RevealGroup as="ul" stagger={0.15} className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {t.numbers.items.map((item, index) => {
            const first = index === 0
            return (
              <RevealItem
                key={item.label}
                className={cn(
                  "relative overflow-hidden rounded-2xl border px-4 py-6 text-center sm:px-6 sm:py-8",
                  first
                    ? "border-transparent bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[0_30px_60px_-30px_color-mix(in_srgb,var(--primary)_90%,transparent)]"
                    : "border-[var(--border)] bg-[var(--surface)]"
                )}
              >
                {first ? (
                  <span aria-hidden className="pointer-events-none absolute -bottom-16 left-1/2 h-32 w-48 -translate-x-1/2 rounded-full bg-white/25 blur-3xl" />
                ) : null}
                <p
                  className={cn(
                    "lp-display relative text-[1.75rem] leading-none font-semibold tracking-tight whitespace-nowrap sm:text-[2.6rem]",
                    first ? "text-[var(--primary-foreground)]" : "text-[var(--primary)]"
                  )}
                >
                  <CountUp value={item.value} delay={index * 0.15} />
                </p>
                <p className={cn("relative mt-2 text-sm leading-snug", first ? "text-[var(--primary-foreground)]/85" : "text-[var(--muted-foreground)]")}>
                  {item.label}
                </p>
              </RevealItem>
            )
          })}
        </RevealGroup>
        <p className="mt-5 text-center text-sm font-medium text-[var(--ink)]">{t.hero.social}</p>
      </div>
    </section>
  )
}
