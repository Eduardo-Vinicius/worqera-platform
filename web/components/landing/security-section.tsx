"use client"

import { useLanguage } from "@/components/landing/language-provider"
import { CreditCard, Lock, ShieldCheck } from "lucide-react"

export function SecuritySection() {
  const { locale } = useLanguage()
  const pt = locale === "pt"

  const items = pt
    ? [
        {
          icon: CreditCard,
          title: "Pagamento com AbacatePay",
          desc: "Assinatura e cobrança via parceiro especializado — fluxo simples e rastreável para sua oficina.",
        },
        {
          icon: Lock,
          title: "Pagamento seguro",
          desc: "Dados sensíveis tratados com cuidado. Você foca na operação; a cobrança fica protegida.",
        },
        {
          icon: ShieldCheck,
          title: "Usabilidade em primeiro lugar",
          desc: "Interface limpa no celular e no computador. Equipe aprende rápido e usa no dia a dia sem fricção.",
        },
      ]
    : [
        {
          icon: CreditCard,
          title: "Payments with AbacatePay",
          desc: "Subscriptions billed through a specialized partner — simple and traceable for your workshop.",
        },
        {
          icon: Lock,
          title: "Secure checkout",
          desc: "Sensitive data handled carefully. You run the shop; billing stays protected.",
        },
        {
          icon: ShieldCheck,
          title: "Usability first",
          desc: "Clean UI on phone and desktop. Teams learn fast and use it every day without friction.",
        },
      ]

  return (
    <section id="confianca" className="relative border-y border-border bg-muted/35 py-14 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            {pt ? "Confiança" : "Trust"}
          </p>
          <h2 className="lp-brand mb-3 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {pt ? "Assinar com tranquilidade" : "Subscribe with peace of mind"}
          </h2>
          <p className="text-base text-muted-foreground sm:text-lg">
            {pt
              ? "Parceira de pagamento, segurança e uma experiência que convida a usar — não a temer."
              : "Payment partner, security, and an experience that invites you to use it — not fear it."}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.title}
                className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm md:text-left"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary md:mx-0">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
              </div>
            )
          })}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          {pt ? (
            <>
              Pagamentos processados em parceria com{" "}
              <span className="font-medium text-foreground">AbacatePay</span>.
            </>
          ) : (
            <>
              Payments processed in partnership with{" "}
              <span className="font-medium text-foreground">AbacatePay</span>.
            </>
          )}
        </p>
      </div>
    </section>
  )
}
