"use client"

import Link from "next/link"
import { ArrowRight, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/landing/language-provider"
import { MarketingShell } from "@/components/landing/marketing-shell"
import { getTradePage, TRADE_SLUGS, type TradeSlug } from "@/components/landing/trades-data"
import { FeatureStrip } from "@/components/landing/feature-strip"
import { LiveStage } from "@/components/landing/live-stage"
import { PricingSection } from "@/components/landing/pricing-section"
import { Aurora, CheckBadge } from "@/components/landing/hero-section"
import { StatusMark } from "@/components/landing/points-section"
import { TRADE_ICONS } from "@/components/landing/trades-marquee"
import { Magnetic } from "@/components/landing/fx/magnetic"
import { Reveal, RevealGroup, RevealItem } from "@/components/landing/fx/reveal"
import { Spotlight } from "@/components/landing/fx/spotlight"

export function TradeLanding({ slug }: { slug: TradeSlug }) {
  const { locale, t } = useLanguage()
  const pt = locale === "pt"
  const page = getTradePage(slug, locale)
  const Icon = TRADE_ICONS[slug]
  const sectors = page.sectors.map((sector) => sector.name)
  const stageCols = [sectors[0], sectors[1], t.stage.cols[2], t.stage.cols[3]]
  const story = slug === "sapataria" ? t.clients.stories.find((row) => row.company === "Casa do Tênis") : undefined

  return (
    <MarketingShell>
      <section className="relative -mt-16 overflow-hidden pt-16">
        <Aurora />
        <div className="relative mx-auto max-w-6xl px-4 pt-12 pb-12 sm:px-6 sm:pt-16">
          <div className="max-w-3xl">
            <p className="lp-animate-in lp-glass inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--ink)]">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)]">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="font-semibold">
                {t.hero.kickerFor} {page.trade.toLowerCase()}
              </span>
              <span className="hidden text-[var(--muted-foreground)] sm:inline">· {page.kicker}</span>
            </p>
            <h1
              className="lp-display lp-animate-in mt-5 text-balance text-4xl leading-[1.04] font-semibold text-[var(--ink)] sm:text-6xl"
              style={{ animationDelay: "0.08s" }}
            >
              {page.headline}
            </h1>
            <p className="lp-animate-in mt-5 max-w-xl text-base leading-relaxed text-[var(--muted-foreground)] sm:text-lg" style={{ animationDelay: "0.16s" }}>
              {page.lead}
            </p>
            <div className="lp-animate-in mt-8 flex flex-col gap-3 sm:flex-row sm:items-center" style={{ animationDelay: "0.24s" }}>
              <Magnetic>
                <Button asChild size="lg" className="lp-cta lp-shine h-12 w-full rounded-full px-8 text-base font-semibold sm:w-auto">
                  <Link href="/signup">
                    {page.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </Magnetic>
              <p className="text-sm text-[var(--muted-foreground)]">{page.ctaNote}</p>
            </div>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
              {t.hero.badges.map((badge, index) => (
                <CheckBadge key={badge} delay={index * 0.15}>
                  {badge}
                </CheckBadge>
              ))}
            </div>
          </div>

          <div className="lp-animate-in-delay mt-12" style={{ animationDelay: "0.35s" }}>
            <LiveStage item={page.item} service={sectors[2]} cols={stageCols} />
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border)] py-16 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-2">
          <Reveal className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--late)] uppercase">{t.points.off}</p>
            <h2 className="lp-display mt-2 text-2xl font-semibold tracking-tight text-[var(--ink)] sm:text-3xl">{page.problemTitle}</h2>
            <ul className="mt-6 space-y-4">
              {page.problem.map((line) => (
                <li key={line} className="flex gap-3 text-[15px] leading-relaxed text-[var(--muted-foreground)]">
                  <StatusMark ok={false} />
                  {line}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.1} className="rounded-3xl border border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_5%,var(--surface))] p-6 sm:p-8">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--primary)] uppercase">{t.points.on}</p>
            <h2 className="lp-display mt-2 text-2xl font-semibold tracking-tight text-[var(--ink)] sm:text-3xl">{page.stepsTitle}</h2>
            <ol className="mt-6 space-y-4">
              {page.steps.map((step) => (
                <li key={step.n} className="flex gap-3">
                  <StatusMark ok />
                  <span>
                    <span className="block font-semibold text-[var(--ink)]">{step.title}</span>
                    <span className="block text-sm leading-relaxed text-[var(--muted-foreground)]">{step.desc}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[var(--band)] py-16 text-[var(--on-band)] sm:py-24">
        <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[800px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(167,139,250,0.35),transparent)]" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <h2 className="lp-display text-3xl font-semibold tracking-tight sm:text-4xl">{page.sectorsTitle}</h2>
          </Reveal>
          <RevealGroup stagger={0.12} as="ol" className="relative mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <span aria-hidden className="absolute top-6 right-[12%] left-[12%] hidden h-px overflow-hidden bg-white/15 lg:block">
              <span className="lp-b-fill block h-full bg-gradient-to-r from-[#a78bfa] to-[#2dd4bf]" />
            </span>
            {page.sectors.map((sector, index) => (
              <RevealItem key={sector.name} className="relative">
                <span className="lp-display relative z-[1] flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-[var(--band)] text-lg font-semibold">
                  {index + 1}
                </span>
                <p className="lp-display mt-4 text-xl font-semibold">{sector.name}</p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--on-band)]/65">{sector.desc}</p>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      <section className="border-b border-[var(--border)] py-16 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-2">
          {[
            [page.customerTitle, page.customer],
            [page.companyTitle, page.company],
          ].map(([title, body], index) => (
            <Reveal key={title} delay={index * 0.1}>
              <Spotlight className="h-full rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
                <h2 className="lp-display text-2xl font-semibold tracking-tight text-[var(--ink)] sm:text-3xl">{title}</h2>
                <p className="mt-4 text-base leading-relaxed text-[var(--muted-foreground)]">{body}</p>
              </Spotlight>
            </Reveal>
          ))}
        </div>
      </section>

      {story ? (
        <section className="border-b border-[var(--border)] py-16 sm:py-24">
          <Reveal className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="lp-display text-6xl leading-none text-[var(--primary)]" aria-hidden>
              “
            </p>
            <blockquote className="mt-2 max-w-4xl text-pretty text-xl leading-snug font-medium text-[var(--ink)] sm:text-[1.7rem]">{story.quote}</blockquote>
            <p className="mt-6 font-semibold text-[var(--ink)]">{story.name}</p>
            <p className="text-sm text-[var(--muted-foreground)]">
              {story.role},{" "}
              {story.href ? (
                <a href={story.href} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
                  {story.company}
                </a>
              ) : (
                story.company
              )}
              {story.place ? ` · ${story.place}` : ""}
            </p>
          </Reveal>
        </section>
      ) : null}

      <FeatureStrip title={pt ? `Além da fila, para ${page.trade.toLowerCase()}` : `Beyond the queue, for ${page.trade.toLowerCase()}`} />

      <PricingSection />

      <section className="border-t border-[var(--border)] py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="lp-display text-3xl font-semibold tracking-tight text-[var(--ink)]">{t.trades.title}</h2>
            <Button asChild className="lp-cta lp-shine h-11 w-fit rounded-full px-6">
              <Link href="/signup">
                {page.cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <RevealGroup stagger={0.05} className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TRADE_SLUGS.filter((item) => item !== slug).map((item) => {
              const other = getTradePage(item, locale)
              const OtherIcon = TRADE_ICONS[item]
              return (
                <RevealItem key={item}>
                  <Link
                    href={`/${item}`}
                    className="group flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 transition hover:-translate-y-0.5 hover:border-[var(--primary)]/50"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--primary)] transition group-hover:bg-[var(--primary)] group-hover:text-[var(--primary-foreground)]">
                      <OtherIcon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[var(--ink)]">{other.trade}</span>
                      <span className="block truncate text-xs text-[var(--muted-foreground)]">{other.item}</span>
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-[var(--muted-foreground)] transition group-hover:text-[var(--primary)]" />
                  </Link>
                </RevealItem>
              )
            })}
          </RevealGroup>
        </div>
      </section>
    </MarketingShell>
  )
}
