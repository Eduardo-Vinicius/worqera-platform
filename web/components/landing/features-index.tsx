"use client"

import Link from "next/link"
import { ArrowRight, ArrowUpRight, Check, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/landing/language-provider"
import { MarketingShell } from "@/components/landing/marketing-shell"
import { COMING, FEATURE_GROUPS, getFeature } from "@/components/landing/features-data"
import { FEATURE_ICONS } from "@/components/landing/feature-icons"
import { Aurora } from "@/components/landing/hero-section"
import { PlanTable } from "@/components/landing/plan-table"
import { SectionIndex } from "@/components/landing/section-index"
import { Magnetic } from "@/components/landing/fx/magnetic"
import { Reveal, RevealGroup, RevealItem } from "@/components/landing/fx/reveal"
import { Spotlight } from "@/components/landing/fx/spotlight"

export function FeaturesIndex() {
  const { locale } = useLanguage()
  const pt = locale === "pt"
  const index = [
    ...FEATURE_GROUPS.map((group) => ({ id: group.id, label: pt ? group.pt : group.en })),
    { id: "planos", label: pt ? "Planos" : "Plans" },
    { id: "chegando", label: pt ? "Chegando" : "Coming" },
  ]

  return (
    <MarketingShell>
      <SectionIndex items={index} />
      <section className="relative -mt-16 overflow-hidden border-b border-[var(--border)] pt-16">
        <Aurora />
        <div className="lp-animate-in relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--primary)] uppercase">
            {pt ? "Recursos" : "Features"}
          </p>
          <h1 className="lp-display mt-3 max-w-3xl text-balance text-4xl font-semibold leading-[1.05] text-[var(--ink)] sm:text-5xl">
            {pt ? "A fila, o cliente, as vendas e o dinheiro. Num sistema só." : "The queue, the customer, sales and money. One system."}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-loose text-[var(--muted-foreground)] sm:text-lg">
            {pt
              ? "A Worqera orquestra a fila de pedidos de quem conserta, fabrica ou atende sob encomenda. Kanban por setor, cliente avisado, orçamento recuperado, financeiro e IA trabalhando juntos."
              : "Worqera orchestrates the order queue for shops that repair, make or work to order. Sector kanban, notified customers, recovered quotes, finance and AI working together."}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Magnetic>
              <Button asChild size="lg" className="lp-cta lp-shine h-12 rounded-full px-8 text-base">
                <Link href="/signup">
                  {pt ? "Testar grátis por 7 dias" : "Try free for 7 days"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </Magnetic>
            <a href="#planos" className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--ink)]">
              {pt ? "Comparar planos" : "Compare plans"}
            </a>
          </div>
        </div>
      </section>

      {FEATURE_GROUPS.map((group) => (
        <section key={group.id} id={group.id} className="scroll-mt-24 border-b border-[var(--border)] py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal as="h2" className="lp-display text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-3xl">
              {pt ? group.pt : group.en}
            </Reveal>
            <RevealGroup stagger={0.08} className={`mt-8 grid gap-6 ${group.slugs.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
              {group.slugs.map((slug) => {
                const feature = getFeature(slug, locale)
                const Icon = FEATURE_ICONS[slug]
                return (
                  <RevealItem key={slug}>
                    <Spotlight className="h-full rounded-2xl">
                    <Link
                      href={`/recursos/${slug}`}
                      className="lp-pillar group flex h-full flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8"
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] text-[var(--muted-foreground)] uppercase">
                          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--primary)]">
                            <Icon className="h-4 w-4" />
                          </span>
                          {feature.kicker}
                        </span>
                        <ArrowUpRight className="h-4 w-4 text-[var(--muted-foreground)] group-hover:text-[var(--primary)]" />
                      </div>
                      <p className="lp-display mt-3 text-4xl font-semibold text-[var(--ink)]">{feature.name}</p>
                      <p className="mt-2 text-sm leading-loose text-[var(--muted-foreground)]">{feature.short}</p>
                      <ul className="mt-4 flex-1 space-y-1.5">
                        {feature.caps.slice(0, 3).map((cap) => (
                          <li key={cap.title} className="flex items-start gap-2 text-sm text-[var(--ink)]">
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--primary)]" strokeWidth={2.5} />
                            {cap.title}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-5 w-fit rounded-full bg-[var(--brand-soft)] px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.14em] text-[var(--primary)] uppercase">{feature.plan}</p>
                    </Link>
                    </Spotlight>
                  </RevealItem>
                )
              })}
            </RevealGroup>
          </div>
        </section>
      ))}

      <section id="planos" className="scroll-mt-24 border-b border-[var(--border)] py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="lp-display text-4xl font-semibold tracking-tight text-[var(--ink)]">
            {pt ? "O que vem em cada plano" : "What comes with each plan"}
          </h2>
          <p className="mt-2 text-[var(--muted-foreground)]">
            {pt ? "Um preço por empresa. Sem cobrança por usuário." : "One price per company. No per-user billing."}
          </p>
          <Reveal className="mt-8">
            <PlanTable pt={pt} />
          </Reveal>
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">
            {pt
              ? "7 dias grátis em qualquer plano. Implantação com a Worqera sob consulta."
              : "7 free days on any plan. Setup with Worqera on request."}
          </p>
        </div>
      </section>

      <section id="chegando" className="scroll-mt-24 bg-[var(--band)] py-16 text-[var(--on-band)] sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--on-band)]/60 uppercase">
            {pt ? "Chegando" : "Coming"}
          </p>
          <h2 className="lp-display mt-2 text-4xl font-semibold tracking-tight">
            {pt ? "O que já está construído e entra em breve" : "Built and shipping soon"}
          </h2>
          <ul className="mt-10 grid gap-8 sm:grid-cols-2">
            {COMING.map((item) => {
              const copy = pt ? item.pt : item.en
              return (
                <li key={copy.title} className="border-t border-white/15 pt-4">
                  <Clock className="h-4 w-4 text-[var(--on-band)]/60" />
                  <p className="lp-display mt-3 text-xl font-semibold">{copy.title}</p>
                  <p className="mt-2 text-sm leading-loose text-[var(--on-band)]/65">{copy.desc}</p>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="lp-display text-4xl font-semibold tracking-tight text-[var(--ink)]">
              {pt ? "Comece pela fila. O resto vem junto." : "Start with the queue. The rest comes with it."}
            </h2>
            <p className="mt-2 text-[var(--muted-foreground)]">
              {pt ? "Sobe a empresa hoje, entra o primeiro pedido e veja o cliente avisado." : "Set up the company today, take the first order and watch the customer get notified."}
            </p>
          </div>
          <Button asChild size="lg" className="lp-cta lp-shine h-12 w-fit rounded-full px-8 text-base">
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
