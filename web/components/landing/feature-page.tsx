"use client"

import Link from "next/link"
import { ArrowRight, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/landing/language-provider"
import { MarketingShell } from "@/components/landing/marketing-shell"
import { FeatureStrip } from "@/components/landing/feature-strip"
import { FEATURE_ICONS } from "@/components/landing/feature-icons"
import { getFeature, type FeatureCopy, type FeatureSlug, type MockTone } from "@/components/landing/features-data"

const WHATSAPP = "https://wa.me/5511985591053?text="

const TONE: Record<MockTone, string> = {
  brand: "bg-[var(--brand-soft)] text-[var(--primary)]",
  ok: "bg-[color-mix(in_srgb,var(--ready)_16%,transparent)] text-[var(--ready)]",
  warn: "bg-amber-500/15 text-amber-600",
  muted: "bg-[var(--muted)] text-[var(--muted-foreground)]",
}

/** A product-looking card built from copy, so every feature page has a screen without screenshots. */
export function FeatureMock({ feature }: { feature: FeatureCopy }) {
  const Icon = FEATURE_ICONS[feature.slug]
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--mock-bg)] shadow-[0_24px_60px_-40px_rgba(15,23,42,0.6)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--primary)] text-white">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <p className="text-sm font-semibold text-[var(--ink)]">{feature.mock.title}</p>
      </div>
      <ul className="space-y-2 p-3 sm:p-4">
        {feature.mock.rows.map((row, index) => (
          <li
            key={`${row.a}-${index}`}
            className="lp-board-card flex items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--mock-col)] px-3 py-2.5"
            style={{ animationDelay: `${0.15 + index * 0.12}s` }}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--ink)]">{row.a}</p>
              <p className="truncate text-xs text-[var(--muted-foreground)]">{row.b}</p>
            </div>
            {row.c ? (
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${TONE[row.tone || "muted"]}`}>
                {row.c}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function FeatureLanding({ slug }: { slug: FeatureSlug }) {
  const { locale } = useLanguage()
  const pt = locale === "pt"
  const feature = getFeature(slug, locale)
  const businessOnly = feature.plan === "Business"
  const talkHref =
    WHATSAPP + encodeURIComponent(pt ? `Olá! Quero saber mais sobre ${feature.name} na Worqera.` : `Hi! I want to know more about ${feature.name} on Worqera.`)

  return (
    <MarketingShell>
      <section className="lp-hero-wash border-b border-[var(--border)]">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center">
          <div className="lp-animate-in">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--primary)] uppercase">
              <Link href="/recursos" className="hover:underline">
                {pt ? "Recursos" : "Features"}
              </Link>{" "}
              · {feature.kicker}
            </p>
            <h1 className="lp-display mt-3 text-balance text-4xl font-semibold leading-[1.05] text-[var(--ink)] sm:text-5xl">
              {feature.headline}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--muted-foreground)] sm:text-lg">{feature.lead}</p>
            <p className="mt-5 inline-flex rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--ink)]">
              {feature.plan}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              {businessOnly ? (
                <Button asChild size="lg" className="lp-cta h-12 rounded-md px-8 text-base">
                  <a href={talkHref} target="_blank" rel="noopener noreferrer">
                    {pt ? "Falar com a Worqera" : "Talk to Worqera"}
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
              ) : (
                <Button asChild size="lg" className="lp-cta h-12 rounded-md px-8 text-base">
                  <Link href="/signup">
                    {pt ? "Testar grátis por 7 dias" : "Try free for 7 days"}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
              <Link href="/#pricing" className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--ink)]">
                {pt ? "Ver planos" : "See plans"}
              </Link>
            </div>
          </div>
          <div className="lp-animate-in-delay">
            <FeatureMock feature={feature} />
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--border)] py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <h2 className="lp-display text-3xl font-semibold tracking-tight text-[var(--ink)]">{feature.painsTitle}</h2>
          <ul className="space-y-5">
            {feature.pains.map((line) => (
              <li key={line} className="border-t border-[var(--border)] pt-5 text-base leading-relaxed text-[var(--muted-foreground)]">
                {line}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-b border-[var(--border)] py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="lp-display text-3xl font-semibold tracking-tight text-[var(--ink)]">{feature.stepsTitle}</h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {feature.steps.map((step) => (
              <li key={step.n} className="border-t-2 border-[var(--primary)] pt-4">
                <p className="lp-mono text-xs text-[var(--primary)]">{step.n}</p>
                <p className="lp-display mt-2 text-xl font-semibold tracking-tight text-[var(--ink)]">{step.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-[var(--band)] py-16 text-[var(--on-band)] sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="lp-display text-3xl font-semibold tracking-tight">{feature.capsTitle}</h2>
          <ul className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {feature.caps.map((cap) => (
              <li key={cap.title} className="border-t border-white/15 pt-4">
                <p className="lp-display text-xl font-semibold">{cap.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--on-band)]/65">{cap.desc}</p>
              </li>
            ))}
          </ul>
          {feature.soon ? (
            <p className="mt-10 flex max-w-3xl items-start gap-2 rounded-md border border-white/15 bg-white/5 px-4 py-3 text-sm text-[var(--on-band)]/80">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" />
              {feature.soon}
            </p>
          ) : null}
        </div>
      </section>

      <section className="border-b border-[var(--border)] py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <h2 className="lp-display text-3xl font-semibold tracking-tight text-[var(--ink)]">
            {pt ? "Perguntas frequentes" : "Common questions"}
          </h2>
          <dl className="space-y-6">
            {feature.faq.map((item) => (
              <div key={item.q} className="border-t border-[var(--border)] pt-5">
                <dt className="font-semibold text-[var(--ink)]">{item.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <FeatureStrip exclude={slug} title={pt ? "A Worqera também faz" : "Worqera also does"} />

      <section className="py-16 sm:py-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="lp-display text-3xl font-semibold tracking-tight text-[var(--ink)]">
              {pt ? "Sua fila, organizada esta semana." : "Your queue, organized this week."}
            </h2>
            <p className="mt-2 text-[var(--muted-foreground)]">
              {pt ? "7 dias grátis, sem cartão. Setores, pedido e cliente avisado no primeiro dia." : "7 days free, no card. Sectors, an order and a notified customer on day one."}
            </p>
          </div>
          <Button asChild size="lg" className="lp-cta h-12 w-fit rounded-md px-8 text-base">
            <Link href="/signup">
              {pt ? "Testar grátis" : "Try free"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </MarketingShell>
  )
}
