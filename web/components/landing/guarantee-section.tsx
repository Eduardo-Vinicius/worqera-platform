"use client"

import Link from "next/link"
import { useLanguage } from "@/components/landing/language-provider"
import { Shield, ArrowRight, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export function GuaranteeSection() {
  const { locale, t } = useLanguage()
  const pt = locale === "pt"

  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-8 shadow-sm sm:p-12">
          <div className="mb-6 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Shield className="h-7 w-7 text-primary" />
            </div>
          </div>

          <div className="mb-8 text-center">
            <h2 className="lp-brand mb-3 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {pt ? "7 dias grátis para validar na prática" : "7 free days to validate in practice"}
            </h2>
            <p className="mx-auto max-w-xl text-muted-foreground">
              {pt
                ? "Crie a conta, monte os setores e rode a operação. Se não fizer sentido, é só não continuar."
                : "Create an account, set up sectors, and run operations. If it doesn’t fit, simply don’t continue."}
            </p>
          </div>

          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            {t.guarantee.benefits.map((benefit, index) => (
              <div key={index} className="rounded-xl border border-border/80 bg-background p-4 text-center">
                <CheckCircle className="mx-auto mb-2 h-5 w-5 text-primary" />
                <h3 className="mb-1 text-sm font-semibold text-foreground">{benefit.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="rounded-xl bg-primary px-8 hover:bg-secondary">
              <Link href="/signup">
                {pt ? "Começar trial grátis" : "Start free trial"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              {pt ? "Sem cartão · Cancele quando quiser" : "No card · Cancel anytime"}
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
          {t.guarantee.trustIndicators.map((indicator, index) => (
            <div key={index} className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span>{indicator}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
