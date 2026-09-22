"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/landing/language-provider"
import { Check } from "lucide-react"
import { EARLY_TOTAL, getEarlySeatsLeft } from "@/lib/earlySeats"

const WHATSAPP =
  "https://wa.me/5511985591053?text=" +
  encodeURIComponent("Olá! Quero assinar o Worqera Pro / Early.")

export function PricingSection() {
  const { locale, t } = useLanguage()
  const pt = locale === "pt"
  const earlyLeft = getEarlySeatsLeft()

  return (
    <section id="pricing" className="scroll-mt-24 border-t border-[var(--border)] py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="lp-display text-balance text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
            {t.pricing.title}
          </h2>
          <p className="mt-3 text-base text-[var(--muted-foreground)] sm:text-lg">{t.pricing.subtitle}</p>
          {earlyLeft > 0 ? (
            <p className="mt-4 text-sm text-[var(--ink)]">
              {pt
                ? `Early R$ 147 — restam ${earlyLeft} de ${EARLY_TOTAL} vagas`
                : `Early R$ 147 — ${earlyLeft} of ${EARLY_TOTAL} seats left`}
            </p>
          ) : (
            <p className="mt-4 text-sm text-[var(--muted-foreground)]">
              {pt ? "Early esgotado — novas oficinas no Pro." : "Early sold out — new shops on Pro."}
            </p>
          )}
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3 lg:gap-5">
          {t.pricing.plans.map((plan) => {
            const earlyGone = plan.name === "Early" && earlyLeft <= 0
            const href = plan.name === "Business" || earlyGone ? WHATSAPP : "/signup"
            const external = plan.name === "Business" || earlyGone
            return (
              <div
                key={plan.name}
                className={`flex flex-col border p-5 sm:p-6 ${
                  plan.popular
                    ? "border-[var(--ink)] bg-[var(--surface)]"
                    : "border-[var(--border)] bg-[var(--surface)]"
                } ${earlyGone ? "opacity-70" : ""}`}
              >
                <div className="mb-5">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="lp-display text-lg font-semibold text-[var(--ink)]">{plan.name}</h3>
                    {plan.popular ? (
                      <span className="text-[10px] font-semibold tracking-[0.12em] text-[var(--primary)] uppercase">
                        {pt ? "Recomendado" : "Recommended"}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">{plan.description}</p>
                </div>

                <div className="mb-5 border-y border-[var(--border)] py-4">
                  <p className="lp-display text-3xl font-semibold tracking-tight text-[var(--ink)]">
                    {plan.price}
                  </p>
                  {plan.priceNote ? (
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">{plan.priceNote}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                    {pt ? "7 dias grátis no signup" : "7 days free on signup"}
                  </p>
                </div>

                <ul className="mb-6 flex-1 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-[var(--muted-foreground)]">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ink)]" strokeWidth={2} />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  size="lg"
                  variant={plan.popular ? "default" : "outline"}
                  className={
                    plan.popular
                      ? "lp-cta w-full rounded-md"
                      : "w-full rounded-md border-[var(--border)] text-[var(--ink)]"
                  }
                >
                  {external ? (
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      {earlyGone ? (pt ? "Early esgotado — falar" : "Early sold out — chat") : plan.cta}
                    </a>
                  ) : (
                    <Link href={href}>{plan.cta}</Link>
                  )}
                </Button>
              </div>
            )
          })}
        </div>

        <p className="mt-8 text-sm text-[var(--muted-foreground)]">{t.pricing.custom}</p>
        <p className="mt-2 text-xs text-[var(--muted-foreground)]">{t.pricing.trust}</p>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">{t.pricing.guarantee}</p>
      </div>
    </section>
  )
}
