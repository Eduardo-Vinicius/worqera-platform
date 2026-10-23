"use client"

import "./landing.css"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/landing/header"
import { Footer, WhatsAppFab } from "@/components/landing/footer"
import { useLanguage } from "@/components/landing/language-provider"
import { getTradePage, TRADE_SLUGS, type TradeSlug } from "@/components/landing/trades-data"
import { useEffect, useState } from "react"

export function TradeLanding({ slug }: { slug: TradeSlug }) {
  const { locale, t } = useLanguage()
  const page = getTradePage(slug, locale)
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(localStorage.getItem("wq-lp-theme") === "dark")
  }, [])

  const toggleTheme = () => {
    setDark((current) => {
      const next = !current
      localStorage.setItem("wq-lp-theme", next ? "dark" : "light")
      return next
    })
  }

  const story =
    slug === "sapataria"
      ? t.clients.stories.find((row) => row.company === "Casa do Tênis")
      : undefined

  return (
    <div className={dark ? "lp lp-dark min-h-screen overflow-x-hidden antialiased" : "lp min-h-screen overflow-x-hidden antialiased"}>
      <Header dark={dark} onToggleTheme={toggleTheme} />
      <main className="pt-14 sm:pt-16">
        <section className="lp-hero-wash border-b border-[var(--border)]">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--primary)] uppercase">{page.kicker}</p>
            <h1 className="lp-display mt-3 max-w-3xl text-balance text-4xl font-semibold leading-[1.05] text-[var(--ink)] sm:text-5xl">
              {page.headline}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--muted-foreground)] sm:text-lg">{page.lead}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="lp-cta h-12 rounded-md px-8 text-base">
                <Link href="/signup">
                  {page.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <p className="text-sm text-[var(--muted-foreground)]">{page.ctaNote}</p>
            </div>
          </div>
        </section>

        <section className="border-b border-[var(--border)] py-16 sm:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <h2 className="lp-display text-3xl font-semibold tracking-tight text-[var(--ink)]">{page.problemTitle}</h2>
            <ul className="space-y-5">
              {page.problem.map((line) => (
                <li key={line} className="border-t border-[var(--border)] pt-5 text-base leading-relaxed text-[var(--muted-foreground)]">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-b border-[var(--border)] py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="lp-display text-3xl font-semibold tracking-tight text-[var(--ink)]">{page.stepsTitle}</h2>
            <ol className="mt-10 grid gap-8 sm:grid-cols-2">
              {page.steps.map((step) => (
                <li key={step.n}>
                  <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--primary)] uppercase">{step.n}</p>
                  <p className="lp-display mt-2 text-2xl font-semibold tracking-tight text-[var(--ink)]">{step.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">{step.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="bg-[var(--band)] py-16 text-[var(--on-band)] sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="lp-display text-3xl font-semibold tracking-tight">{page.sectorsTitle}</h2>
            <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {page.sectors.map((sector) => (
                <li key={sector.name} className="border-t border-white/15 pt-4">
                  <p className="lp-display text-xl font-semibold">{sector.name}</p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--on-band)]/65">{sector.desc}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-b border-[var(--border)] py-16 sm:py-20">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-2">
            <div>
              <h2 className="lp-display text-3xl font-semibold tracking-tight text-[var(--ink)]">{page.customerTitle}</h2>
              <p className="mt-4 text-base leading-relaxed text-[var(--muted-foreground)]">{page.customer}</p>
            </div>
            <div>
              <h2 className="lp-display text-3xl font-semibold tracking-tight text-[var(--ink)]">{page.companyTitle}</h2>
              <p className="mt-4 text-base leading-relaxed text-[var(--muted-foreground)]">{page.company}</p>
            </div>
          </div>
        </section>

        {story ? (
          <section className="border-b border-[var(--border)] py-16 sm:py-20">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <p className="lp-display text-5xl leading-none text-[var(--primary)]" aria-hidden>
                “
              </p>
              <blockquote className="mt-4 max-w-3xl text-pretty text-xl font-medium leading-snug text-[var(--ink)] sm:text-2xl">
                {story.quote}
              </blockquote>
              <p className="mt-6 font-semibold text-[var(--ink)]">{story.name}</p>
              <p className="text-sm text-[var(--muted-foreground)]">
                {story.role},{" "}
                {story.href ? (
                  <a href={story.href} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
                    {story.company}
                  </a>
                ) : (
                  story.company
                )}
                {story.place ? ` · ${story.place}` : ""}
              </p>
            </div>
          </section>
        ) : null}

        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="lp-display text-3xl font-semibold tracking-tight text-[var(--ink)]">{t.trades.title}</h2>
              <Button asChild className="lp-cta h-11 w-fit rounded-md px-6">
                <Link href="/signup">
                  {page.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <ul className="mt-10 grid gap-3 sm:grid-cols-3">
              {TRADE_SLUGS.filter((item) => item !== slug).map((item) => {
                const other = getTradePage(item, locale)
                return (
                  <li key={item}>
                    <Link
                      href={`/${item}`}
                      className="block border border-[var(--border)] bg-[var(--surface)] px-4 py-4 hover:border-[var(--primary)]/40"
                    >
                      <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--primary)] uppercase">{other.trade}</p>
                      <p className="lp-display mt-1 text-lg font-semibold text-[var(--ink)]">{other.item}</p>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppFab />
    </div>
  )
}
