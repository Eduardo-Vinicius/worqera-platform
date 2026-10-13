"use client"

import { useLanguage } from "@/components/landing/language-provider"

export function PracticeSection() {
  const { t } = useLanguage()
  const panel = t.practice

  return (
    <section className="border-t border-[var(--border)] py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="lp-display text-balance text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
            {panel.title}
          </h2>
          <p className="mt-3 text-base text-[var(--muted-foreground)] sm:text-lg">{panel.subtitle}</p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          <article className="flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--muted-foreground)] uppercase">
                {panel.productLabel}
              </p>
              <h3 className="lp-display mt-6 text-2xl font-semibold tracking-tight text-[var(--ink)]">{panel.productName}</h3>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">{panel.productMeta}</p>
            </div>
            <p className="mt-8 inline-flex w-fit rounded-full bg-[var(--muted)] px-3 py-1 text-sm font-medium text-[var(--ink)]">
              {panel.productStock}
            </p>
          </article>

          <article className="flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-[var(--band)] p-5 text-[var(--on-band)] sm:p-6">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--action)] uppercase">{panel.saleLabel}</p>
              <p className="lp-mono mt-6 text-5xl font-medium tracking-tight">{panel.saleCode}</p>
              <p className="mt-3 text-sm text-[var(--on-band)]/70">{panel.saleMeta}</p>
            </div>
            <p className="lp-display mt-8 text-3xl font-semibold">{panel.salePrice}</p>
          </article>

          <article className="flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--muted-foreground)] uppercase">
                {panel.mailLabel}
              </p>
              <p className="mt-6 text-xs text-[var(--muted-foreground)]">{panel.mailTo}</p>
              <h3 className="lp-display mt-2 text-2xl font-semibold tracking-tight text-[var(--ink)]">{panel.mailSubject}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted-foreground)]">{panel.mailBody}</p>
            </div>
            <p className="mt-8 text-sm font-medium text-[var(--ink)]">Worqera</p>
          </article>
        </div>
      </div>
    </section>
  )
}
