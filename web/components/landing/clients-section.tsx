"use client"

import { useLanguage } from "@/components/landing/language-provider"

export function ClientsSection() {
  const { t } = useLanguage()

  return (
    <section id="clientes" className="border-t border-[var(--border)] py-14 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="lp-display text-2xl font-semibold tracking-tight text-[var(--ink)] sm:text-3xl">
          {t.clients.title}
        </h2>
        <p className="mt-2 text-sm text-[var(--muted-foreground)] sm:text-base">{t.clients.subtitle}</p>

        <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-3 border-t border-[var(--border)] pt-8 sm:gap-x-12">
          {t.clients.names.map((name) => (
            <li key={name} className="lp-display text-lg font-semibold text-[var(--ink)] sm:text-xl">
              {name}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
