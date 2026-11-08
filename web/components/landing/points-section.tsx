"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { AnimatePresence, m, useInView } from "motion/react"
import { ArrowRight, ArrowUpRight, Bell, HandCoins, KanbanSquare, Wallet } from "lucide-react"
import { useLanguage } from "@/components/landing/language-provider"
import { Reveal, RevealGroup, RevealItem } from "@/components/landing/fx/reveal"
import { Spotlight } from "@/components/landing/fx/spotlight"
import { cn } from "@/lib/utils"

const ICONS = [KanbanSquare, Bell, HandCoins, Wallet]
const SPRING = { type: "spring", stiffness: 420, damping: 32 } as const

/** Big two-state switch: without Worqera / with Worqera. */
export function BeforeAfterSwitch({ on, onChange, off: offLabel, onLabel }: { on: boolean; onChange: (v: boolean) => void; off: string; onLabel: string }) {
  return (
    <div className="inline-grid grid-cols-2 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1 shadow-sm" role="radiogroup">
      {[false, true].map((value) => {
        const selected = on === value
        return (
          <button
            key={String(value)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(value)}
            className={cn(
              "relative isolate rounded-full px-4 py-2 text-sm font-semibold transition-colors sm:px-6",
              selected ? (value ? "text-[var(--primary-foreground)]" : "text-[var(--ink)]") : "text-[var(--muted-foreground)] hover:text-[var(--ink)]"
            )}
          >
            {selected ? (
              <m.span
                layoutId="lp-ba-thumb"
                transition={SPRING}
                className={cn("absolute inset-0 -z-10 rounded-full", value ? "bg-[var(--primary)]" : "bg-[var(--muted)]")}
              />
            ) : null}
            {value ? onLabel : offLabel}
          </button>
        )
      })}
    </div>
  )
}

/** An X that turns into a check, each stroke drawn in. */
export function StatusMark({ ok }: { ok: boolean }) {
  return (
    <span
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors duration-500",
        ok ? "bg-[color-mix(in_srgb,var(--ready)_16%,transparent)] text-[var(--ready)]" : "bg-[color-mix(in_srgb,var(--late)_12%,transparent)] text-[var(--late)]"
      )}
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        <AnimatePresence mode="wait" initial={false}>
          {ok ? (
            <m.path key="ok" d="M3.5 8.5 6.5 11.5 12.5 4.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} />
          ) : (
            <m.path key="no" d="M4.5 4.5 11.5 11.5 M11.5 4.5 4.5 11.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} />
          )}
        </AnimatePresence>
      </svg>
    </span>
  )
}

/** Why use it: each pain of the shop before, flipping to what it looks like with Worqera. */
export function PointsSection() {
  const { t } = useLanguage()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const [on, setOn] = useState(false)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!inView || touched) return
    const timer = window.setTimeout(() => setOn(true), 900)
    return () => window.clearTimeout(timer)
  }, [inView, touched])

  const change = (value: boolean) => {
    setTouched(true)
    setOn(value)
  }

  return (
    <section id="produto" className="scroll-mt-24 border-t border-[var(--border)] py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--primary)] uppercase">{t.points.eyebrow}</p>
            <h2 className="lp-display mt-3 text-balance text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-[2.6rem] sm:leading-[1.08]">
              {t.points.title}
            </h2>
          </div>
          <BeforeAfterSwitch on={on} onChange={change} off={t.points.off} onLabel={t.points.on} />
        </Reveal>

        <div ref={ref}>
          <RevealGroup as="ol" className="mt-10 grid gap-4 md:grid-cols-2">
            {t.points.items.map((point, index) => {
              const Icon = ICONS[index] || KanbanSquare
              return (
                <RevealItem key={point.title}>
                  <Spotlight className="h-full rounded-2xl">
                    <div
                      style={{ transitionDelay: `${index * 80}ms` }}
                      className={cn(
                        "flex h-full flex-col overflow-hidden rounded-2xl border transition-colors duration-500",
                        on
                          ? "border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_5%,var(--surface))]"
                          : "border-[var(--border)] bg-[var(--surface)]"
                      )}
                    >
                      <div className="flex items-center justify-between gap-3 px-6 pt-6">
                        <span className="flex items-center gap-3">
                          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--primary)]">
                            <Icon className="h-5 w-5" />
                          </span>
                          <h3 className="lp-display text-xl font-semibold text-[var(--ink)]">{point.title}</h3>
                        </span>
                        <StatusMark ok={on} />
                      </div>

                      <div className="relative min-h-[112px] flex-1 px-6 pt-4">
                        <AnimatePresence mode="wait" initial={false}>
                          <m.p
                            key={on ? "after" : "before"}
                            initial={{ opacity: 0, filter: "blur(6px)", y: 6 }}
                            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                            exit={{ opacity: 0, filter: "blur(6px)", y: -6 }}
                            transition={{ duration: 0.35, delay: index * 0.06 }}
                            className={cn("text-[15px] leading-relaxed", on ? "text-[var(--ink)]" : "text-[var(--muted-foreground)]")}
                          >
                            <span className={cn("font-semibold", on ? "text-[var(--primary)]" : "text-[var(--late)]")}>
                              {on ? t.points.after : t.points.before}:{" "}
                            </span>
                            {on ? point.desc : point.before}
                          </m.p>
                        </AnimatePresence>
                      </div>

                      <Link
                        href={point.href}
                        className="group mt-5 flex items-center justify-between border-t border-[var(--border)] px-6 py-3 text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--primary)]"
                      >
                        <span>{point.proof}</span>
                        <span className="inline-flex items-center gap-1 font-semibold">
                          {t.points.see}
                          <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </span>
                      </Link>
                    </div>
                  </Spotlight>
                </RevealItem>
              )
            })}
          </RevealGroup>
        </div>

        <Link href="/recursos" className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--primary)] hover:underline">
          {t.points.all}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}
