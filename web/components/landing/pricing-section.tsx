"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/landing/language-provider"
import { Check, Sparkles, Shield } from "lucide-react"
import { EARLY_TOTAL, getEarlySeatsLeft } from "@/lib/earlySeats"

const WHATSAPP =
  "https://wa.me/5511985591053?text=" +
  encodeURIComponent("Olá! Quero assinar o Worqera Pro / Early.")

export function PricingSection() {
  const { locale, t } = useLanguage()
  const pt = locale === "pt"
  const earlyLeft = getEarlySeatsLeft()

  return (
    <section id="pricing" className="relative py-14 sm:py-16 lg:py-24">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center sm:mb-16">
          <h2 className="lp-brand mb-3 text-balance text-2xl font-semibold tracking-tight text-foreground sm:mb-4 sm:text-3xl md:text-4xl lg:text-5xl">
            {t.pricing.title}
          </h2>
          <p className="mb-6 text-base text-muted-foreground sm:text-lg">{t.pricing.subtitle}</p>

          {earlyLeft > 0 ? (
            <p className="mb-6 inline-flex rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary sm:text-sm">
              {pt
                ? `Early R$ 147 — restam ${earlyLeft} de ${EARLY_TOTAL} vagas`
                : `Early R$ 147 — ${earlyLeft} of ${EARLY_TOTAL} seats left`}
            </p>
          ) : (
            <p className="mb-6 text-sm text-muted-foreground">
              {pt ? "Early esgotado — novas oficinas no Pro R$ 247." : "Early sold out — new shops on Pro."}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-accent" />
              <span>{t.pricing.roi}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4 text-emerald-500" />
              <span>{t.pricing.guarantee}</span>
            </div>
          </div>
        </div>

        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3 lg:gap-8">
          {t.pricing.plans.map((plan, index) => {
            const earlyGone = plan.name === "Early" && earlyLeft <= 0
            const href = plan.name === "Business" || earlyGone ? WHATSAPP : "/signup"
            const external = plan.name === "Business" || earlyGone
            return (
              <div
                key={index}
                className={`relative rounded-xl border p-5 backdrop-blur-sm transition-all hover:-translate-y-1 sm:rounded-2xl sm:p-6 lg:p-8 ${
                  plan.popular
                    ? "border-primary/40 bg-card shadow-md ring-1 ring-primary/15 md:scale-[1.02]"
                    : earlyGone
                      ? "border-border bg-card/60 opacity-80 shadow-sm"
                      : "border-border bg-card shadow-sm hover:border-primary/20"
                }`}
              >
                {plan.popular ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground sm:px-4">
                    {pt ? "Recomendado" : "Recommended"}
                  </div>
                ) : null}
                {plan.name === "Early" && earlyLeft > 0 ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground shadow-sm sm:px-4">
                    {pt ? `${earlyLeft} vagas` : `${earlyLeft} left`}
                  </div>
                ) : null}

                <div className="mb-4 sm:mb-6">
                  <h3
                    className={`mb-2 text-lg font-bold sm:text-xl ${plan.popular ? "text-primary" : "text-foreground"}`}
                  >
                    {plan.name}
                  </h3>
                  <p className="text-xs text-muted-foreground sm:text-sm">{plan.description}</p>
                </div>

                <div className="mb-6 border-y border-border/30 py-4 sm:mb-8">
                  <div className="text-center">
                    <span
                      className={`text-3xl font-bold tracking-tight sm:text-4xl ${
                        plan.popular ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {plan.price}
                    </span>
                    {"priceNote" in plan && plan.priceNote ? (
                      <span className="mt-1 block text-xs text-muted-foreground sm:text-sm">
                        {plan.priceNote}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    {pt ? "7 dias grátis no signup" : "7 days free on signup"}
                  </p>
                </div>

                <ul className="mb-6 space-y-3 sm:mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          plan.popular ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                      <span className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  size="lg"
                  variant={plan.popular ? "default" : "outline"}
                  className={`w-full text-sm ${
                    plan.popular
                      ? "bg-primary text-primary-foreground shadow-lg hover:bg-secondary"
                      : "border-border hover:bg-card/80"
                  }`}
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

        <p className="mx-auto mt-6 max-w-3xl text-center text-sm text-muted-foreground">
          {t.pricing.custom}
        </p>
        <p className="mx-auto mt-3 max-w-3xl text-center text-xs text-muted-foreground sm:mt-4">
          {pt
            ? "Cobrança após o trial via AbacatePay ou PIX com a Worqera. Early limitado às 10 primeiras oficinas."
            : "Billing after trial via AbacatePay or PIX with Worqera. Early limited to the first 10 workshops."}
        </p>
      </div>
    </section>
  )
}
