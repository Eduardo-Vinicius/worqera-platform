"use client"

import Link from "next/link"
import { useState } from "react"
import { AnimatePresence, m } from "motion/react"
import { Check, ChevronDown, CreditCard, DatabaseBackup, GraduationCap, LayoutGrid, ShieldCheck, Sparkles, Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/landing/language-provider"
import { Reveal, RevealGroup, RevealItem } from "@/components/landing/fx/reveal"
import { RollNumber } from "@/components/landing/fx/roll-number"
import { PlanTable } from "@/components/landing/plan-table"
import { WA_MESSAGES, waLink } from "@/components/landing/contact"
import { PLANS, YEARLY_OFF, formatBRL, yearlyMonthly, type Cycle, type Plan } from "@/lib/plans"
import { cn } from "@/lib/utils"

const SETUP_ICONS = [LayoutGrid, DatabaseBackup, GraduationCap]
const TRUST_ICONS = [CreditCard, Undo2, ShieldCheck]
const SPRING = { type: "spring", stiffness: 420, damping: 32 } as const

/** What the plan costs per day, to anchor the price: monthly over 30 days, yearly over 365. */
const perDay = (plan: Plan, cycle: Cycle) => Math.round(((cycle === "yearly" ? plan.yearly / 365 : plan.monthly / 30) * 100)) / 100

export function PricingSection() {
  const { locale, t } = useLanguage()
  const pt = locale === "pt"
  const p = t.pricing
  const [cycle, setCycle] = useState<Cycle>("monthly")
  const [compare, setCompare] = useState(false)

  return (
    <section id="pricing" className="relative scroll-mt-24 overflow-hidden border-t border-[var(--border)] py-16 sm:py-24">
      <div aria-hidden className="pointer-events-none absolute top-0 left-1/2 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--brand-soft),transparent)]" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="lp-display text-balance text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-[2.6rem] sm:leading-[1.08]">{p.title}</h2>
          <p className="mt-3 text-base text-[var(--muted-foreground)] sm:text-lg">{p.subtitle}</p>

          <div className="mt-7 inline-grid grid-cols-2 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1 shadow-sm" role="radiogroup">
            {(["monthly", "yearly"] as const).map((c) => {
              const selected = cycle === c
              return (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setCycle(c)}
                  className={cn(
                    "relative isolate flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-colors",
                    selected ? "text-[var(--surface)]" : "text-[var(--muted-foreground)] hover:text-[var(--ink)]"
                  )}
                >
                  {selected ? <m.span layoutId="lp-cycle" transition={SPRING} className="absolute inset-0 -z-10 rounded-full bg-[var(--ink)]" /> : null}
                  {c === "monthly" ? p.monthly : p.yearly}
                  {c === "yearly" ? (
                    <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold", selected ? "bg-[var(--action)] text-white" : "bg-[color-mix(in_srgb,var(--action)_14%,transparent)] text-[var(--action)]")}>
                      −{YEARLY_OFF}%
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
          <AnimatePresence>
            {cycle === "yearly" ? (
              <m.p
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--action)]"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {p.yearlyBadge}
              </m.p>
            ) : null}
          </AnimatePresence>
        </Reveal>

        <RevealGroup stagger={0.1} className="mt-12 grid items-stretch gap-5 md:grid-cols-3">
          {p.plans.map((plan) => {
            const catalog = PLANS.find((c) => c.name === plan.name)
            if (!catalog) return null
            const month = cycle === "yearly" ? yearlyMonthly(catalog) : catalog.monthly
            const popular = plan.popular
            const card = (
              <div className={cn("relative flex h-full flex-col rounded-[1.5rem] bg-[var(--surface)] p-6", !popular && "border border-[var(--border)]")}>
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="lp-display text-xl font-semibold text-[var(--ink)]">{plan.name}</h3>
                  {!popular && plan.seal ? <span className="text-[10px] font-semibold tracking-[0.12em] text-[var(--primary)] uppercase">{plan.seal}</span> : null}
                </div>
                <p className="mt-2 min-h-10 text-sm font-medium text-[var(--ink)]">{plan.description}</p>

                <div className="my-5 border-y border-[var(--border)] py-5">
                  <p className="lp-display flex items-baseline gap-1.5 text-[2.6rem] leading-none font-semibold tracking-tight text-[var(--ink)]">
                    <RollNumber value={formatBRL(month)} />
                    <span className="text-sm font-normal tracking-normal text-[var(--muted-foreground)]">{p.perMonth}</span>
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--primary)]">
                    ≈ <RollNumber value={formatBRL(perDay(catalog, cycle))} /> {p.perDay}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {cycle === "yearly" ? `${formatBRL(catalog.yearly)} ${p.yearNote}` : p.trialNote}
                  </p>
                </div>

                <ul className="mb-6 flex-1 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-[var(--muted-foreground)]">
                      <span className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full", popular ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "bg-[var(--brand-soft)] text-[var(--primary)]")}>
                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  size="lg"
                  variant={popular ? "default" : "outline"}
                  className={cn("h-12 w-full rounded-full text-base", popular ? "lp-cta lp-shine" : "border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--primary)]")}
                >
                  <Link href={`/signup?plan=${plan.name.toLowerCase()}${cycle === "yearly" ? "&cycle=yearly" : ""}`}>{plan.cta}</Link>
                </Button>
              </div>
            )
            return (
              <RevealItem key={plan.name} className={cn("relative", popular && "md:-my-3 md:scale-[1.04]")}>
                {popular ? (
                  <>
                    <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-[var(--primary)] px-3 py-1 text-[11px] font-bold tracking-wide whitespace-nowrap text-[var(--primary-foreground)] uppercase shadow-lg">
                      {p.popular}
                    </span>
                    <div className="lp-ring h-full rounded-[1.6rem] p-[2px] shadow-[0_40px_80px_-40px_color-mix(in_srgb,var(--primary)_80%,transparent)]">{card}</div>
                  </>
                ) : (
                  card
                )}
              </RevealItem>
            )
          })}
        </RevealGroup>

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => setCompare((v) => !v)}
            aria-expanded={compare}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--primary)]"
          >
            {compare ? p.compareHide : p.compare}
            <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", compare && "rotate-180")} />
          </button>
        </div>
        <AnimatePresence initial={false}>
          {compare ? (
            <m.div
              key="compare"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="pt-6">
                <PlanTable pt={pt} />
              </div>
            </m.div>
          ) : null}
        </AnimatePresence>

        <Reveal className="mt-8 grid gap-5 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <p className="lp-display text-lg font-semibold text-[var(--ink)]">
              {p.setupTitle} · {p.setupOnce}
            </p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">{p.setupDesc}</p>
            <ol className="mt-4 grid gap-3 sm:grid-cols-3">
              {p.setupSteps.map((step, index) => {
                const Icon = SETUP_ICONS[index] || LayoutGrid
                return (
                  <li key={step.title} className="flex items-center gap-3 rounded-2xl bg-[var(--paper)] px-3 py-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--primary)]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-[var(--ink)]">
                        {index + 1}. {step.title}
                      </span>
                      <span className="block text-xs text-[var(--muted-foreground)]">{step.desc}</span>
                    </span>
                  </li>
                )
              })}
            </ol>
          </div>
          <Button asChild variant="outline" className="h-11 shrink-0 rounded-full border-[var(--border)] px-6 text-[var(--ink)] hover:border-[var(--primary)]">
            <a href={waLink(WA_MESSAGES.setup[locale])} target="_blank" rel="noopener noreferrer">
              {p.setupCta}
            </a>
          </Button>
        </Reveal>

        <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {p.trustItems.map((item, index) => {
            const Icon = TRUST_ICONS[index] || ShieldCheck
            return (
              <li key={item} className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)]">
                <Icon className="h-4 w-4 text-[var(--ready)]" />
                {item}
              </li>
            )
          })}
        </ul>

        <RevealGroup stagger={0.08} className="mt-10 grid gap-3 md:grid-cols-3">
          {p.mini.map((item) => (
            <RevealItem key={item.q} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="font-semibold text-[var(--ink)]">{item.q}</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--muted-foreground)]">{item.a}</p>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  )
}
