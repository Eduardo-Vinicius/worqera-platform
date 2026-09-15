"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/landing/language-provider"
import { ArrowRight } from "lucide-react"
import { WorqeraLogo } from "@/components/brand/WorqeraLogo"

export function FinalCtaSection() {
  const { locale, t } = useLanguage()
  const pt = locale === "pt"

  return (
    <section className="pb-20 lg:pb-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-border bg-card px-6 py-12 text-center shadow-sm sm:px-12 sm:py-16">
          <WorqeraLogo className="mx-auto mb-6 h-11 w-11" />
          <h2 className="lp-brand mb-3 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {t.finalCta.headline}
          </h2>
          <p className="mx-auto mb-8 max-w-lg text-muted-foreground">{t.finalCta.subheadline}</p>

          <div className="mb-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="glow-primary rounded-xl bg-primary px-8 hover:bg-secondary"
            >
              <Link href="/signup">
                {pt ? "Criar conta grátis" : "Create free account"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-xl border-border bg-background hover:bg-muted"
            >
              <Link href="/login">{pt ? "Entrar" : "Sign in"}</Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground sm:text-sm">
            {pt ? "7 dias grátis · Sem cartão · AbacatePay" : "7 days free · No card · AbacatePay"}
          </p>
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          {pt
            ? "Com A Casa do Tênis, Sapataria Paulista e Axisbyte"
            : "With A Casa do Tênis, Sapataria Paulista and Axisbyte"}
        </p>
      </div>
    </section>
  )
}
