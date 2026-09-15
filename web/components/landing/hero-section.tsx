"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/landing/language-provider"
import { ArrowRight, Building2 } from "lucide-react"

export function HeroSection() {
  const { locale, t } = useLanguage()
  const pt = locale === "pt"

  return (
    <section className="relative overflow-hidden pb-20 pt-28 lg:pb-28 lg:pt-36">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="lp-brand mb-5 text-sm font-semibold tracking-[0.2em] text-primary uppercase">
            Worqera
          </p>

          <h1 className="lp-brand mb-5 text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            {pt ? (
              <>
                Gestão de pedidos
                <span className="block text-primary">para oficinas de serviço</span>
              </>
            ) : (
              <>
                Order management
                <span className="block text-primary">for service workshops</span>
              </>
            )}
          </h1>

          <p className="mx-auto mb-10 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            {pt
              ? "Kanban por setores, rastreio para o cliente e equipe alinhada — sem planilha e sem perder pedido. Teste grátis em minutos."
              : "Sector kanban, customer tracking, and an aligned team — no spreadsheets, no lost orders. Try free in minutes."}
          </p>

          <div className="mb-3 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Button
              asChild
              size="lg"
              className="glow-primary h-12 w-full rounded-xl bg-primary px-8 text-base font-medium text-primary-foreground hover:bg-secondary sm:w-auto"
            >
              <Link href="/signup">
                {pt ? "Começar grátis" : "Start free"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 w-full rounded-xl border-border bg-card px-8 text-base font-medium text-foreground hover:border-primary/30 hover:bg-muted/60 sm:w-auto"
            >
              <Link href="/login">{pt ? "Entrar" : "Sign in"}</Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground sm:text-sm">
            {pt ? "7 dias grátis · Sem cartão · Cancele quando quiser" : "7 days free · No card · Cancel anytime"}
          </p>

          <div className="mx-auto mt-14 max-w-lg">
            <div className="lp-hairline mb-8 w-full" />
            <p className="mb-5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {t.hero.trustedBy}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {[
                { name: "A Casa do Tênis", icon: true },
                { name: "Sapataria Paulista", icon: true },
                { name: "Axisbyte", icon: false },
              ].map((company) => (
                <div key={company.name} className="flex items-center gap-2 text-muted-foreground">
                  {!company.icon ? <Building2 className="h-4 w-4 text-primary/70" /> : null}
                  <span className="text-sm font-medium text-foreground/80">{company.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
