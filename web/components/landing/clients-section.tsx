"use client"

import { useLanguage } from "@/components/landing/language-provider"

export function ClientsSection() {
  const { t } = useLanguage()

  return (
    <section id="clientes" className="border-t border-[var(--border)] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="lp-display text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
          {t.clients.title}
        </h2>
        <p className="mt-3 max-w-xl text-base text-[var(--muted-foreground)] sm:text-lg">{t.clients.subtitle}</p>

        <ul className="mt-10 grid gap-4 sm:grid-cols-3">
          {t.clients.names.map((name) => (
            <li
              key={name}
              className="border border-[var(--border)] bg-[var(--surface)] px-5 py-6"
            >
              <p className="lp-display text-xl font-semibold tracking-tight text-[var(--ink)] sm:text-2xl">{name}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
