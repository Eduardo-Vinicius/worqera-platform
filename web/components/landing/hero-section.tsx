"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/landing/language-provider"
import { ArrowRight } from "lucide-react"

function ProductBoard({ pt }: { pt: boolean }) {
  const cols: Array<{
    name: string
    cards: Array<{ code: string; meta: string; ready?: boolean }>
  }> = pt
    ? [
        {
          name: "Recebido",
          cards: [
            { code: "0041", meta: "2 pares" },
            { code: "0043", meta: "Prioridade" },
          ],
        },
        {
          name: "Oficina",
          cards: [
            { code: "0038", meta: "Em andamento" },
            { code: "0035", meta: "Cola" },
          ],
        },
        {
          name: "Pronto",
          cards: [{ code: "0032", meta: "Retirada", ready: true }],
        },
      ]
    : [
        {
          name: "Intake",
          cards: [
            { code: "0041", meta: "2 pairs" },
            { code: "0043", meta: "Priority" },
          ],
        },
        {
          name: "Workshop",
          cards: [
            { code: "0038", meta: "In progress" },
            { code: "0035", meta: "Glue" },
          ],
        },
        {
          name: "Ready",
          cards: [{ code: "0032", meta: "Pickup", ready: true }],
        },
      ]

  return (
    <div className="w-full border-y border-[var(--border)] bg-[var(--ink)] text-white sm:border sm:border-[var(--border)] sm:rounded-sm">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
        <p className="text-[11px] font-medium tracking-[0.16em] text-white/50 uppercase">
          {pt ? "Kanban · ao vivo" : "Kanban · live"}
        </p>
        <p className="lp-mono text-xs text-white/40">worqera</p>
      </div>
      <div className="grid grid-cols-3 gap-px bg-white/10">
        {cols.map((col) => (
          <div key={col.name} className="min-w-0 bg-[var(--ink)] p-3 sm:p-4">
            <p className="mb-3 truncate text-[10px] font-semibold tracking-[0.14em] text-white/45 uppercase sm:text-[11px]">
              {col.name}
            </p>
            <div className="space-y-2">
              {col.cards.map((card) => (
                <div
                  key={card.code}
                  className={`rounded-sm border px-2.5 py-2 ${
                    card.ready
                      ? "border-[var(--ready)]/40 bg-[var(--ready)]/10"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <p className="lp-mono text-sm font-medium tracking-tight">{card.code}</p>
                  <p className="mt-0.5 text-[11px] text-white/50">{card.meta}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function HeroSection() {
  const { locale, t } = useLanguage()
  const pt = locale === "pt"

  return (
    <section className="relative overflow-hidden pt-14 sm:pt-16">
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-10 sm:px-6 sm:pb-14 sm:pt-16 lg:pt-20">
        <div className="lp-animate-in mx-auto max-w-3xl text-center">
          <p className="lp-display mb-5 text-sm font-semibold tracking-[0.28em] text-[var(--primary)] uppercase">
            {t.hero.brand}
          </p>
          <h1 className="lp-display text-balance text-4xl font-semibold leading-[1.05] text-[var(--ink)] sm:text-5xl lg:text-[3.5rem]">
            {t.hero.headline}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-[var(--muted-foreground)] sm:text-lg">
            {t.hero.sub}
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="lp-cta h-12 rounded-md px-8 text-base font-medium">
              <Link href="/signup">
                {t.hero.cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 rounded-md border-[var(--border)] bg-[var(--surface)] px-8 text-base font-medium text-[var(--ink)] hover:bg-[var(--muted)]"
            >
              <Link href="/login">{t.hero.secondary}</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-[var(--muted-foreground)]">{t.hero.note}</p>
        </div>
      </div>

      <div className="lp-animate-in-delay mx-auto max-w-6xl px-0 sm:px-6">
        <ProductBoard pt={pt} />
      </div>
    </section>
  )
}
