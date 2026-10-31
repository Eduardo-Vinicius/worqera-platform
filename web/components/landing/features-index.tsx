"use client"

import Link from "next/link"
import { ArrowRight, ArrowUpRight, Check, Clock, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/landing/language-provider"
import { MarketingShell } from "@/components/landing/marketing-shell"
import { COMING, FEATURE_GROUPS, PLAN_ROWS, getFeature } from "@/components/landing/features-data"

function PlanMark({ value, pt }: { value: string; pt: boolean }) {
  if (value === "yes") return <Check className="mx-auto h-4 w-4 text-[var(--primary)]" strokeWidth={2.5} aria-label={pt ? "Sim" : "Yes"} />
  if (value === "no") return <Minus className="mx-auto h-4 w-4 text-[var(--muted-foreground)]/50" aria-label={pt ? "Não" : "No"} />
  const [ptText, enText] = value.split("|")
  return <span className="text-xs font-semibold text-[var(--ink)]">{pt ? ptText : enText || ptText}</span>
}

export function FeaturesIndex() {
  const { locale } = useLanguage()
  const pt = locale === "pt"

  return (
    <MarketingShell>
      <section className="lp-hero-wash border-b border-[var(--border)]">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--primary)] uppercase">
            {pt ? "Recursos" : "Features"}
          </p>
          <h1 className="lp-display mt-3 max-w-3xl text-balance text-4xl font-semibold leading-[1.05] text-[var(--ink)] sm:text-5xl">
            {pt ? "A fila, o cliente, as vendas e o dinheiro. Num sistema só." : "The queue, the customer, sales and money. One system."}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--muted-foreground)] sm:text-lg">
            {pt
              ? "A Worqera orquestra a fila de pedidos de quem conserta, fabrica ou atende sob encomenda. Kanban por setor, cliente avisado, orçamento recuperado, financeiro e IA trabalhando juntos."
              : "Worqera orchestrates the order queue for shops that repair, make or work to order. Sector kanban, notified customers, recovered quotes, finance and AI working together."}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="lp-cta h-12 rounded-md px-8 text-base">
              <Link href="/signup">
                {pt ? "Testar grátis por 7 dias" : "Try free for 7 days"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <a href="#planos" className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--ink)]">
              {pt ? "Comparar planos" : "Compare plans"}
            </a>
          </div>
        </div>
      </section>

      {FEATURE_GROUPS.map((group) => (
        <section key={group.id} className="border-b border-[var(--border)] py-14 sm:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="lp-display text-2xl font-semibold tracking-tight text-[var(--ink)] sm:text-3xl">{pt ? group.pt : group.en}</h2>
            <ul className={`mt-8 grid gap-4 ${group.slugs.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
              {group.slugs.map((slug) => {
                const feature = getFeature(slug, locale)
                return (
                  <li key={slug}>
                    <Link
                      href={`/recursos/${slug}`}
                      className="lp-pillar group flex h-full flex-col border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold tracking-[0.14em] text-[var(--muted-foreground)] uppercase">
                          {feature.kicker}
                        </span>
                        <ArrowUpRight className="h-4 w-4 text-[var(--muted-foreground)] group-hover:text-[var(--primary)]" />
                      </div>
                      <p className="lp-display mt-3 text-2xl font-semibold text-[var(--ink)]">{feature.name}</p>
                      <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">{feature.short}</p>
                      <ul className="mt-4 flex-1 space-y-1.5">
                        {feature.caps.slice(0, 3).map((cap) => (
                          <li key={cap.title} className="flex items-start gap-2 text-sm text-[var(--ink)]">
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--primary)]" strokeWidth={2.5} />
                            {cap.title}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-5 text-[10px] font-semibold tracking-[0.14em] text-[var(--primary)] uppercase">{feature.plan}</p>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      ))}

      <section id="planos" className="scroll-mt-24 border-b border-[var(--border)] py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="lp-display text-3xl font-semibold tracking-tight text-[var(--ink)]">
            {pt ? "O que vem em cada plano" : "What comes with each plan"}
          </h2>
          <p className="mt-2 text-[var(--muted-foreground)]">
            {pt ? "Um preço por empresa. Sem cobrança por usuário." : "One price per company. No per-user billing."}
          </p>
          <div className="mt-8 overflow-x-auto border border-[var(--border)] bg-[var(--surface)]">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left">
                  <th className="px-4 py-3 font-semibold text-[var(--muted-foreground)]">{pt ? "Recurso" : "Feature"}</th>
                  {[
                    ["Basic", "R$ 147"],
                    ["Pro", "R$ 297"],
                    ["Business", "R$ 597"],
                  ].map(([name, price]) => (
                    <th key={name} className="w-28 px-3 py-3 text-center">
                      <p className="lp-display text-base font-semibold text-[var(--ink)]">{name}</p>
                      <p className="text-xs font-normal text-[var(--muted-foreground)]">{price}{pt ? "/mês" : "/mo"}</p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PLAN_ROWS.map((row) => (
                  <tr key={row.pt} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-4 py-3 text-[var(--ink)]">
                      {row.href ? (
                        <Link href={`/recursos/${row.href}`} className="hover:text-[var(--primary)] hover:underline">
                          {pt ? row.pt : row.en}
                        </Link>
                      ) : pt ? (
                        row.pt
                      ) : (
                        row.en
                      )}
                    </td>
                    <td className="px-3 py-3 text-center"><PlanMark value={row.basic} pt={pt} /></td>
                    <td className="px-3 py-3 text-center"><PlanMark value={row.pro} pt={pt} /></td>
                    <td className="px-3 py-3 text-center"><PlanMark value={row.business} pt={pt} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-[var(--muted-foreground)]">
            {pt
              ? "7 dias grátis em qualquer plano. Implantação com a Worqera: R$ 497 uma vez."
              : "7 free days on any plan. Setup with Worqera: R$ 497 once."}
          </p>
        </div>
      </section>

      <section className="bg-[var(--band)] py-16 text-[var(--on-band)] sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--on-band)]/60 uppercase">
            {pt ? "Chegando" : "Coming"}
          </p>
          <h2 className="lp-display mt-2 text-3xl font-semibold tracking-tight">
            {pt ? "O que já está construído e entra em breve" : "Built and shipping soon"}
          </h2>
          <ul className="mt-10 grid gap-8 sm:grid-cols-2">
            {COMING.map((item) => {
              const copy = pt ? item.pt : item.en
              return (
                <li key={copy.title} className="border-t border-white/15 pt-4">
                  <Clock className="h-4 w-4 text-[var(--on-band)]/60" />
                  <p className="lp-display mt-3 text-xl font-semibold">{copy.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--on-band)]/65">{copy.desc}</p>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="lp-display text-3xl font-semibold tracking-tight text-[var(--ink)]">
              {pt ? "Comece pela fila. O resto vem junto." : "Start with the queue. The rest comes with it."}
            </h2>
            <p className="mt-2 text-[var(--muted-foreground)]">
              {pt ? "Sobe a empresa hoje, entra o primeiro pedido e veja o cliente avisado." : "Set up the company today, take the first order and watch the customer get notified."}
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
