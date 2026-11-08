"use client"

import Link from "next/link"
import { useEffect, useState, type ReactNode } from "react"
import { AnimatePresence, m, useReducedMotion } from "motion/react"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/landing/language-provider"
import { LiveStage } from "@/components/landing/live-stage"
import { Magnetic } from "@/components/landing/fx/magnetic"

const EASE = [0.22, 1, 0.36, 1] as const

/** The moving purple, pink and teal light behind the hero, over a fading dot grid. */
export function Aurora() {
  return (
    <div className="lp-aurora" aria-hidden>
      <div className="lp-blob lp-blob-a" />
      <div className="lp-blob lp-blob-b" />
      <div className="lp-blob lp-blob-c" />
    </div>
  )
}

/** Cycles through words, each one sliding up into place. */
export function RotatingWord({ words, every = 2400 }: { words: string[]; every?: number }) {
  const [index, setIndex] = useState(0)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced || words.length < 2) return
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % words.length), every)
    return () => window.clearInterval(timer)
  }, [reduced, words.length, every])

  return (
    <m.span layout className="relative inline-flex overflow-hidden align-bottom" transition={{ duration: 0.35, ease: EASE }}>
      <AnimatePresence mode="popLayout" initial={false}>
        <m.span
          key={words[index]}
          className="inline-block whitespace-nowrap font-semibold text-[var(--primary)]"
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
        >
          {words[index]}
        </m.span>
      </AnimatePresence>
    </m.span>
  )
}

/** A check drawn stroke by stroke, then its label. */
export function CheckBadge({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)]">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--ready)_16%,transparent)] text-[var(--ready)]">
        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <m.path
            d="M3.5 8.5 6.5 11.5 12.5 4.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.6 + delay, ease: "easeOut" }}
          />
        </svg>
      </span>
      {children}
    </span>
  )
}

/** Underline that draws itself under the highlighted half of the headline. */
function DrawnUnderline() {
  return (
    <svg aria-hidden viewBox="0 0 300 12" preserveAspectRatio="none" className="absolute -bottom-1 left-0 h-3 w-full text-[var(--primary)]/60">
      <m.path
        d="M2 9 C 60 3, 140 3, 298 7"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, delay: 0.5, ease: EASE }}
      />
    </svg>
  )
}

/** Top of the home: the promise, the trades it serves and the live stage of one order. */
export function HeroSection() {
  const { t } = useLanguage()

  return (
    <section className="relative -mt-16 overflow-hidden pt-16">
      <Aurora />
      <div className="relative mx-auto max-w-6xl px-4 pt-12 pb-10 sm:px-6 sm:pt-16 lg:pt-20">
        <div className="mx-auto max-w-5xl text-center">
          <p className="lp-animate-in lp-glass mx-auto inline-flex max-w-full items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-[13px] text-[var(--muted-foreground)] sm:text-sm">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="lp-live-dot absolute inline-flex h-full w-full rounded-full bg-[var(--ready)]" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--ready)]" />
            </span>
            <span>{t.hero.kickerFor}</span>
            <RotatingWord words={t.hero.kickerWords} />
            <span className="hidden sm:inline">{t.hero.kickerRest}</span>
          </p>

          <h1 className="lp-display mx-auto mt-6 max-w-5xl text-balance text-[2.6rem] leading-[1.02] font-semibold text-[var(--ink)] sm:text-6xl lg:text-[4.2rem]">
            <span className="lp-animate-in block" style={{ animationDelay: "0.05s" }}>
              {t.hero.headlineA}
            </span>
            <span className="lp-animate-in relative inline-block" style={{ animationDelay: "0.15s" }}>
              <span className="lp-gradient-text">{t.hero.headlineB}</span>
              <DrawnUnderline />
            </span>
          </h1>

          <p
            className="lp-animate-in mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-[var(--muted-foreground)] sm:text-lg"
            style={{ animationDelay: "0.25s" }}
          >
            {t.hero.sub}
          </p>

          <div
            className="lp-animate-in mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center"
            style={{ animationDelay: "0.35s" }}
          >
            <Magnetic>
              <Button asChild size="lg" className="lp-cta lp-shine h-12 w-full rounded-full px-8 text-base font-semibold sm:w-auto">
                <Link href="/signup">
                  {t.hero.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </Magnetic>
            <Magnetic strength={4}>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="lp-glass h-12 w-full rounded-full border-[var(--border)] px-8 text-base font-medium text-[var(--ink)] hover:bg-[var(--surface)] sm:w-auto"
              >
                <a href="#pricing">{t.hero.secondary}</a>
              </Button>
            </Magnetic>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {t.hero.badges.map((badge, index) => (
              <CheckBadge key={badge} delay={index * 0.15}>
                {badge}
              </CheckBadge>
            ))}
          </div>
        </div>

        <div className="lp-animate-in-delay mx-auto mt-14 max-w-6xl" style={{ animationDelay: "0.45s" }}>
          <LiveStage />
        </div>
      </div>
    </section>
  )
}
