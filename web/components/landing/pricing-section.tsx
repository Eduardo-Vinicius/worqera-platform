"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/landing/language-provider"
import { IMPLANTACAO, PLANS, YEARLY_OFF, formatBRL, yearlyMonthly } from "@/lib/plans"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

const IMPLANTACAO_WA =
  "https://wa.me/5511985591053?text=" + encodeURIComponent("Olá! Quero a implantação da Worqera na minha empresa.")

export function PricingSection() {
  const { locale, t } = useLanguage()
  const pt = locale === "pt"
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly")

  return (
    <section id="pricing" className="scroll-mt-24 border-t border-[var(--border)] py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <h2 className="lp-display text-balance text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
              {t.pricing.title}
            </h2>
            <p className="mt-3 text-base text-[var(--muted-foreground)] sm:text-lg">{t.pricing.subtitle}</p>
          </div>
          <div className="inline-grid shrink-0 grid-cols-2 self-start rounded-md border border-[var(--border)] bg-[var(--surface)] p-1 md:self-auto">
            {(["monthly", "yearly"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCycle(c)}
                aria-pressed={cycle === c}
                className={cn(
                  "rounded px-4 py-1.5 text-sm font-semibold transition",
                  cycle === c ? "bg-[var(--ink)] text-[var(--surface)]" : "text-[var(--muted-foreground)] hover:text-[var(--ink)]"
                )}
              >
                {c === "monthly" ? (pt ? "Mensal" : "Monthly") : `${pt ? "Anual" : "Yearly"} · −${YEARLY_OFF}%`}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3 lg:gap-5">
          {t.pricing.plans.map((plan) => {
            const catalog = PLANS.find((p) => p.name === plan.name)
            const perMonth = catalog ? (cycle === "yearly" ? yearlyMonthly(catalog) : catalog.monthly) : null
            return (
              <div
                key={plan.name}
                className={cn(
                  "flex flex-col rounded-lg border bg-[var(--surface)] p-5 sm:p-6",
                  plan.popular ? "border-[var(--ink)] shadow-[0_24px_60px_-40px_rgba(15,23,42,0.5)]" : "border-[var(--border)]"
                )}
              >
                <div className="mb-5">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="lp-display text-lg font-semibold text-[var(--ink)]">{plan.name}</h3>
                    {plan.seal ? (
                      <span className="text-[10px] font-semibold tracking-[0.12em] text-[var(--primary)] uppercase">{plan.seal}</span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm font-medium text-[var(--ink)]">{plan.description}</p>
                </div>

                <div className="mb-5 border-y border-[var(--border)] py-4">
                  <p className="lp-display flex items-baseline gap-2 text-3xl font-semibold tracking-tight text-[var(--ink)]">
                    {perMonth != null ? formatBRL(perMonth) : plan.price}
                    <span className="text-sm font-normal text-[var(--muted-foreground)]">{plan.priceNote}</span>
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {cycle === "yearly" && catalog
                      ? pt
                        ? `${formatBRL(catalog.yearly)} por ano · 2 meses grátis`
                        : `${formatBRL(catalog.yearly)} a year · 2 months free`
                      : pt
                        ? "7 dias grátis no cadastro"
                        : "7 days free on signup"}
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
                  className={plan.popular ? "lp-cta w-full rounded-md" : "w-full rounded-md border-[var(--border)] text-[var(--ink)]"}
                >
                  <Link href={`/signup?plan=${plan.name.toLowerCase()}`}>{plan.cta}</Link>
                </Button>
              </div>
            )
          })}
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-[var(--ink)]">
              {pt ? "Implantação com a Worqera" : "Setup with Worqera"} · {formatBRL(IMPLANTACAO)} {pt ? "uma vez" : "once"}
            </p>
            <p className="text-sm text-[var(--muted-foreground)]">
              {pt
                ? "A gente monta os setores, traz o histórico do sistema antigo e treina a equipe."
                : "We build your sectors, bring the history from the old system and train the team."}
            </p>
          </div>
          <Button asChild variant="outline" className="shrink-0 rounded-md border-[var(--border)] text-[var(--ink)]">
            <a href={IMPLANTACAO_WA} target="_blank" rel="noopener noreferrer">
              {pt ? "Quero a implantação" : "I want setup"}
            </a>
          </Button>
        </div>

        <p className="mt-6 text-sm text-[var(--muted-foreground)]">{t.pricing.custom}</p>
        <p className="mt-2 text-xs text-[var(--muted-foreground)]">
          {t.pricing.trust} · {t.pricing.guarantee}
        </p>
      </div>
    </section>
  )
}
