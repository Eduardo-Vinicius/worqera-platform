"use client"

import { useEffect, useState } from "react"
import { Mail } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/landing/language-provider"

const LAST = 4

export function FlowFilm() {
  const { t } = useLanguage()
  const film = t.film
  const [step, setStep] = useState(0)
  const [jump, setJump] = useState(false)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const apply = () => {
      setReduced(media.matches)
      if (media.matches) setStep(3)
    }
    apply()
    media.addEventListener("change", apply)
    return () => media.removeEventListener("change", apply)
  }, [])

  useEffect(() => {
    if (reduced) return
    const timer = window.setInterval(() => {
      setStep((current) => {
        if (current >= LAST) {
          setJump(true)
          return 0
        }
        setJump(false)
        return current + 1
      })
    }, 1900)
    return () => window.clearInterval(timer)
  }, [reduced])

  const column = step >= 4 ? 3 : step >= 2 ? 2 : step
  const mailed = step >= 3
  const delivered = step === 4
  const onHand = delivered ? film.stockAfter : film.stockBefore

  return (
    <figure className="relative overflow-hidden border-y border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] sm:rounded-2xl sm:border sm:shadow-[0_24px_60px_-36px_rgba(18,18,18,0.45)]">
      <figcaption className="sr-only">{film.beats[step]}</figcaption>
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="lp-live-dot absolute inline-flex h-full w-full rounded-full bg-[var(--ready)]" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--ready)]" />
          </span>
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--muted-foreground)] uppercase">
            {film.live}
          </p>
        </div>
        <p className="lp-mono text-xs text-[var(--muted-foreground)]">{film.code}</p>
      </div>

      <div className="px-4 pt-4 sm:hidden">
        <div className="grid grid-cols-4 gap-1.5">
          {film.cols.map((name, index) => (
            <div key={name}>
              <div className={cn("h-1 rounded-full", index <= column ? "bg-[var(--ink)]" : "bg-[var(--muted)]")} />
              <p
                className={cn(
                  "mt-2 truncate text-[10px] font-semibold tracking-[0.08em] uppercase",
                  index === column ? "text-[var(--ink)]" : "text-[var(--muted-foreground)]"
                )}
              >
                {name}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="hidden grid-cols-4 border-b border-[var(--border)] sm:grid">
        {film.cols.map((name, index) => (
          <p
            key={name}
            className={cn(
              "px-4 py-3 text-[11px] font-semibold tracking-[0.14em] uppercase",
              index === column ? "text-[var(--ink)]" : "text-[var(--muted-foreground)]"
            )}
          >
            {name}
          </p>
        ))}
      </div>

      <div className="relative h-[168px] bg-[var(--paper)] sm:h-[156px]">
        <div className="pointer-events-none absolute inset-0 hidden grid-cols-4 sm:grid">
          {film.cols.map((name) => (
            <div key={name} className="border-r border-[var(--border)] last:border-r-0" />
          ))}
        </div>
        <article
          className={cn("lp-film-card absolute top-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 shadow-[0_10px_30px_-18px_rgba(18,18,18,0.55)]", jump && "lp-film-card-jump")}
          style={{ ["--lp-col" as string]: String(column) }}
        >
          <div className="mb-2 h-1 w-8 rounded-full bg-[var(--primary)]" />
          <p className="lp-mono text-sm font-medium">{film.code.replace("#", "")}</p>
          <p className="mt-0.5 truncate text-sm font-medium">{film.item}</p>
          <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">{film.origin}</p>
        </article>
      </div>

      <div className="grid gap-3 border-t border-[var(--border)] px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center sm:px-5">
        <p className="text-sm text-[var(--ink)]" aria-live="polite">
          {film.beats[step]}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs transition-colors",
              delivered
                ? "border-[var(--ready)]/30 bg-[var(--ready)]/10 text-[var(--ink)]"
                : "border-[var(--border)] text-[var(--muted-foreground)]"
            )}
          >
            {film.stockItem} · {onHand}
          </p>
          <p
            className={cn(
              "inline-flex items-center gap-1.5 overflow-hidden rounded-full border text-xs whitespace-nowrap transition-all duration-500",
              mailed
                ? "max-w-56 border-[var(--ink)] bg-[var(--ink)] px-2.5 py-1 text-white opacity-100"
                : "max-w-0 border-transparent px-0 py-1 opacity-0"
            )}
            aria-hidden={!mailed}
          >
            <Mail className="h-3.5 w-3.5" />
            {film.email}
          </p>
        </div>
      </div>
    </figure>
  )
}
