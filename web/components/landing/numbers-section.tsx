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
            const first = index < 2
            return (
              <RevealItem
                key={item.label}
                className={cn(
                  "relative overflow-hidden rounded-2xl border px-4 py-6 text-center sm:px-6 sm:py-8",
                  first
                    ? "border-transparent bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "border-[var(--border)] bg-[var(--surface)]"
                )}
              >
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
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-6">
          <span className="text-[11px] font-semibold tracking-[0.18em] text-[var(--muted-foreground)] uppercase">{t.numbers.partners}</span>
          <ul className="grid w-full grid-cols-3 gap-2 sm:flex sm:gap-3 sm:w-auto sm:flex-wrap sm:items-center sm:justify-center">
            {t.clients.items
              .filter((client) => client.logo)
              .map((client) => (
                <li key={client.name}>
                  <a
                    href="#clientes"
                    className="flex h-full flex-col items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-4 text-center transition hover:border-[var(--primary)] sm:flex-row sm:rounded-full sm:py-1.5 sm:pr-5 sm:pl-1.5 sm:text-left"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={client.logo} alt={client.name} width={56} height={56} className="h-14 w-14 rounded-full bg-white object-contain sm:h-11 sm:w-11" />
                    <span className="text-sm leading-tight font-semibold text-[var(--ink)]">{client.name}</span>
                  </a>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
