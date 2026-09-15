"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/landing/language-provider"
import { Check, Sparkles, Shield } from "lucide-react"

export function PricingSection() {
  const { locale, t } = useLanguage()

  return (
    <section id="pricing" className="relative py-14 sm:py-16 lg:py-24">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center sm:mb-16">
          <h2 className="lp-brand mb-3 text-balance text-2xl font-semibold tracking-tight text-foreground sm:mb-4 sm:text-3xl md:text-4xl lg:text-5xl">
            {t.pricing.title}
          </h2>
          <p className="mb-6 text-base text-muted-foreground sm:text-lg">{t.pricing.subtitle}</p>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-accent" />
              <span>{t.pricing.roi}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4 text-emerald-400" />
              <span>{locale === "pt" ? "7 dias grátis · AbacatePay" : "7-day free · AbacatePay"}</span>
            </div>
          </div>
        </div>

        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3 lg:gap-8">
          {t.pricing.plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-xl border p-5 backdrop-blur-sm transition-all hover:-translate-y-1 sm:rounded-2xl sm:p-6 lg:p-8 ${
                plan.popular
                  ? "border-primary/40 bg-card shadow-md ring-1 ring-primary/15 md:scale-[1.02]"
                  : "border-border bg-card shadow-sm hover:border-primary/20"
              }`}
            >
              {plan.popular ? (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground sm:px-4">
                  {locale === "pt" ? "Mais escolhido" : "Most chosen"}
                </div>
              ) : null}

              <div className="mb-4 sm:mb-6">
                <h3
                  className={`mb-2 text-lg font-bold sm:text-xl ${plan.popular ? "text-accent" : "text-foreground"}`}
                >
                  {plan.name}
                </h3>
                <p className="text-xs text-muted-foreground sm:text-sm">{plan.description}</p>
              </div>

              <div className="mb-6 border-y border-border/30 py-4 sm:mb-8">
                <div className="text-center">
                  <span
                    className={`text-2xl font-bold sm:text-3xl ${plan.popular ? "text-accent" : "text-foreground"}`}
                  >
                    {locale === "pt" ? "7 dias grátis" : "7 days free"}
                  </span>
                </div>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  {locale === "pt" ? "Depois, plano sob medida" : "Then a tailored plan"}
                </p>
              </div>

              <ul className="mb-6 space-y-3 sm:mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check
                      className={`mt-0.5 h-4 w-4 flex-shrink-0 ${plan.popular ? "text-accent" : "text-muted-foreground"}`}
                    />
                    <span className="text-xs leading-relaxed text-muted-foreground sm:text-sm">{feature}</span>
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
                <Link href="/signup">{locale === "pt" ? "Testar grátis" : "Try free"}</Link>
              </Button>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-3xl text-center text-xs text-muted-foreground sm:mt-10 sm:text-sm">
          {locale === "pt"
            ? "Cobrança via AbacatePay após o trial. Precisa de algo custom? Fale com a gente no WhatsApp."
            : "Billing via AbacatePay after trial. Need something custom? Reach us on WhatsApp."}
        </p>
      </div>
    </section>
  )
}
