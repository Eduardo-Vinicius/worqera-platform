"use client"

import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { useLanguage } from "@/components/landing/language-provider"
import { FEATURE_SLUGS, getFeature, type FeatureSlug } from "@/components/landing/features-data"
import { FEATURE_ICONS } from "@/components/landing/feature-icons"
import { Reveal, RevealGroup, RevealItem } from "@/components/landing/fx/reveal"
import { Spotlight } from "@/components/landing/fx/spotlight"

/** Grid of feature cards linking to /recursos/[slug]. */
export function FeatureStrip({ exclude, title }: { exclude?: FeatureSlug; title?: string }) {
  const { locale } = useLanguage()
  const pt = locale === "pt"
  const slugs = FEATURE_SLUGS.filter((slug) => slug !== exclude)

  return (
    <section className="border-b border-[var(--border)] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="lp-display text-3xl font-semibold tracking-tight text-[var(--ink)]">
            {title || (pt ? "Tudo o que vem junto" : "Everything that comes with it")}
          </h2>
          <Link href="/recursos" className="text-sm font-semibold text-[var(--primary)] hover:underline">
            {pt ? "Ver todos os recursos" : "See all features"}
          </Link>
        </Reveal>
        <RevealGroup stagger={0.05} className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {slugs.map((slug) => {
            const feature = getFeature(slug, locale)
            const Icon = FEATURE_ICONS[slug]
            return (
              <RevealItem key={slug}>
                <Spotlight className="h-full rounded-2xl">
                  <Link
                    href={`/recursos/${slug}`}
                    className="group flex h-full flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:-translate-y-0.5 hover:border-[var(--primary)]/50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--primary)] transition group-hover:scale-110">
                        <Icon className="h-4 w-4" />
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-[var(--muted-foreground)] transition group-hover:text-[var(--primary)]" />
                    </div>
                    <p className="lp-display mt-4 text-lg font-semibold text-[var(--ink)]">{feature.name}</p>
                    <p className="mt-1 flex-1 text-sm leading-relaxed text-[var(--muted-foreground)]">{feature.short}</p>
                    <p className="mt-3 text-[10px] font-semibold tracking-[0.14em] text-[var(--primary)] uppercase">{feature.plan}</p>
                  </Link>
                </Spotlight>
              </RevealItem>
            )
          })}
        </RevealGroup>
      </div>
    </section>
  )
}
