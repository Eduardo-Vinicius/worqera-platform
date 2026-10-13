"use client"

import { useEffect, useState } from "react"
import { useLanguage } from "@/components/landing/language-provider"
import { cn } from "@/lib/utils"

export function DayReel() {
  const { locale, t } = useLanguage()
  const scenes = t.day.scenes
  const [index, setIndex] = useState(0)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const apply = () => setReduced(media.matches)
    apply()
    media.addEventListener("change", apply)
    return () => media.removeEventListener("change", apply)
  }, [])

  useEffect(() => {
    if (reduced) return
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % scenes.length)
    }, 2600)
    return () => window.clearInterval(timer)
  }, [reduced, scenes.length])

  const scene = scenes[index]

  return (
    <section className="border-t border-[var(--border)] py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="lp-display text-balance text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
            {t.day.title}
          </h2>
          <p className="mt-3 text-base text-[var(--muted-foreground)] sm:text-lg">{t.day.subtitle}</p>
        </div>

        <div className="mt-10 grid items-stretch gap-4 lg:grid-cols-[240px_1fr] lg:gap-6">
          <ol className="grid grid-cols-5 gap-2 lg:grid-cols-1">
            {scenes.map((item, itemIndex) => {
              const active = itemIndex === index
              return (
                <li key={item.time}>
                  <button
                    type="button"
                    onClick={() => setIndex(itemIndex)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border px-2 py-2 text-left transition-colors lg:px-3 lg:py-3",
                      active
                        ? "border-[var(--ink)] bg-[var(--surface)]"
                        : "border-transparent bg-transparent hover:bg-[var(--surface)]"
                    )}
                  >
                    <span className="lp-mono text-[11px] text-[var(--muted-foreground)] lg:text-xs">{item.time}</span>
                    <span className={cn("hidden truncate text-sm font-medium lg:inline", active ? "text-[var(--ink)]" : "text-[var(--muted-foreground)]")}>
                      {item.title}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>

          <article key={reduced ? "still" : scene.time} className="lp-day-card flex min-h-[280px] flex-col justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
            <div>
              <p className="lp-mono text-xs text-[var(--muted-foreground)]">{scene.time}</p>
              <h3 className="lp-display mt-3 text-3xl font-semibold tracking-tight text-[var(--ink)]">{scene.title}</h3>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-[var(--muted-foreground)]">{scene.line}</p>
            </div>
            <DayStage index={index} pt={locale === "pt"} />
            <p className="mt-6 text-sm font-medium text-[var(--ink)]">{scene.gain}</p>
          </article>
        </div>
      </div>
    </section>
  )
}

function DayStage({ index, pt }: { index: number; pt: boolean }) {
  if (index === 0) {
    return (
      <div className="mt-8 inline-flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--paper)] px-4 py-3">
        <span className="lp-mono text-lg font-medium">#0048</span>
        <span className="text-sm text-[var(--muted-foreground)]">{pt ? "Recebido · Ana" : "Received · Ana"}</span>
      </div>
    )
  }
  if (index === 1) {
    return (
      <div className="mt-8 grid max-w-sm grid-cols-2 gap-2">
        <div className="rounded-xl border border-dashed border-[var(--border)] px-3 py-3 text-xs text-[var(--muted-foreground)]">
          {pt ? "Recebido" : "Received"}
        </div>
        <div className="rounded-xl border border-[var(--ink)] bg-[var(--ink)] px-3 py-3 text-sm font-medium text-white">
          {pt ? "Produção · #0048" : "Production · #0048"}
        </div>
      </div>
    )
  }
  if (index === 2) {
    return (
      <div className="mt-8 flex items-end justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--paper)] px-4 py-3">
        <div>
          <p className="text-sm font-medium text-[var(--ink)]">{pt ? "Palmilha esportiva" : "Sport insole"}</p>
          <p className="text-xs text-[var(--muted-foreground)]">{pt ? "Reservada no pedido" : "Reserved on the order"}</p>
        </div>
        <p className="lp-display text-3xl font-semibold">18 → 17</p>
      </div>
    )
  }
  if (index === 3) {
    return (
      <div className="mt-8 max-w-sm rounded-xl border border-[var(--border)] bg-[var(--paper)] px-4 py-3">
        <p className="text-[11px] text-[var(--muted-foreground)]">ana@cliente.com</p>
        <p className="mt-1 text-sm font-medium text-[var(--ink)]">{pt ? "Seu pedido está pronto" : "Your order is ready"}</p>
      </div>
    )
  }
  return (
    <div className="mt-8 inline-flex items-center gap-3 rounded-xl bg-[var(--ink)] px-4 py-3 text-white">
      <span className="lp-mono text-lg">#0048</span>
      <span className="text-sm">{pt ? "Entregue" : "Delivered"}</span>
    </div>
  )
}
