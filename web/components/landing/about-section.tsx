"use client"

import Link from "next/link"
import { useLanguage } from "@/components/landing/language-provider"

export function AboutSection() {
  const { locale } = useLanguage()
  const pt = locale === "pt"

  return (
    <section id="about" className="scroll-mt-24 border-y border-border bg-card py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-sm font-medium text-primary">{pt ? "Quem somos" : "About us"}</p>
          <h2 className="lp-brand mb-4 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {pt ? "Um produto Axisbyte" : "An Axisbyte product"}
          </h2>
          <p className="mb-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {pt
              ? "A Worqera organiza a operação de oficinas e negócios de serviço — do atendimento à entrega. Trabalhamos perto de quem usa no dia a dia, com parceiros como A Casa do Tênis e Sapataria Paulista."
              : "Worqera organizes operations for workshops and service businesses — from intake to delivery. We stay close to daily users, with partners like A Casa do Tênis and Sapataria Paulista."}
          </p>
          <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
            {pt
              ? "Assinatura via AbacatePay — cobrança pensada para o mercado brasileiro."
              : "Subscriptions via AbacatePay — billing built for the Brazilian market."}
          </p>
          <Link
            href="/signup"
            className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {pt ? "Criar conta e testar grátis →" : "Create an account and try free →"}
          </Link>
        </div>
      </div>
    </section>
  )
}
