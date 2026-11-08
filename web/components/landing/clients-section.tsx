"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, m, useReducedMotion, type PanInfo } from "motion/react"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { useLanguage } from "@/components/landing/language-provider"
import { Reveal } from "@/components/landing/fx/reveal"
import { cn } from "@/lib/utils"

const STORY_MS = 7000

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase()

/** Quote mark whose two strokes are drawn in. */
function DrawnQuote() {
  return (
    <svg viewBox="0 0 48 36" className="h-10 w-12 text-[var(--primary)]" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" aria-hidden>
      {["M18 4 C 8 8, 4 16, 6 30", "M40 4 C 30 8, 26 16, 28 30"].map((d, index) => (
        <m.path key={d} d={d} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: index * 0.15 }} />
      ))}
    </svg>
  )
}

/** Testimonials as stories: progress bars on top, autoplay, pause on hover, swipe on phones. */
export function ClientsSection() {
  const { locale, t } = useLanguage()
  const pt = locale === "pt"
  const stories = t.clients.stories
  const reduced = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const story = stories[index]

  useEffect(() => {
    if (paused || reduced || stories.length < 2) return
    const timer = window.setTimeout(() => setIndex((current) => (current + 1) % stories.length), STORY_MS)
    return () => window.clearTimeout(timer)
  }, [index, paused, reduced, stories.length])

  const go = (delta: number) => setIndex((current) => (current + delta + stories.length) % stories.length)
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60) go(1)
    else if (info.offset.x > 60) go(-1)
  }

  return (
    <section id="clientes" className="scroll-mt-24 border-t border-[var(--border)] py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="lp-display text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-[2.6rem]">{t.clients.title}</h2>
            <p className="mt-3 max-w-xl text-base text-[var(--muted-foreground)] sm:text-lg">{t.clients.subtitle}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label={pt ? "Anterior" : "Previous"}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] transition hover:border-[var(--primary)]"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label={pt ? "Próximo" : "Next"}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] transition hover:border-[var(--primary)]"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div
            className="relative mt-8 overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)]"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <div className="flex gap-1.5 px-5 pt-5 sm:px-10 sm:pt-8">
              {stories.map((item, i) => (
                <button
                  key={item.name}
                  type="button"
                  aria-label={item.company}
                  onClick={() => setIndex(i)}
                  className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--muted)]"
                >
                  {i < index ? <span className="block h-full w-full bg-[var(--primary)]" /> : null}
                  {i === index ? (
                    <m.span
                      key={`${index}-${paused}`}
                      className="block h-full origin-left bg-[var(--primary)]"
                      initial={{ scaleX: paused || reduced ? 1 : 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: paused || reduced ? 0 : STORY_MS / 1000, ease: "linear" }}
                    />
                  ) : null}
                </button>
              ))}
            </div>

            <m.div drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.2} onDragEnd={onDragEnd} className="cursor-grab px-5 pt-6 pb-8 active:cursor-grabbing sm:px-10 sm:pb-10">
              <AnimatePresence mode="wait">
                <m.div key={story.quote} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.35 }}>
                  <DrawnQuote />
                  <blockquote className="mt-4 max-w-4xl text-pretty text-xl leading-snug font-medium tracking-tight text-[var(--ink)] sm:text-[1.7rem]">
                    {story.quote.split(" ").map((word, i) => (
                      <m.span
                        key={`${word}-${i}`}
                        className="inline-block"
                        initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        transition={{ duration: 0.3, delay: 0.1 + i * 0.022 }}
                      >
                        {word}&nbsp;
                      </m.span>
                    ))}
                  </blockquote>
                  <div className="mt-8 flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-fuchsia-500 text-sm font-bold text-white">
                      {initials(story.name)}
                    </span>
                    <div>
                      <p className="font-semibold text-[var(--ink)]">{story.name}</p>
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
                  </div>
                </m.div>
              </AnimatePresence>
            </m.div>
          </div>
        </Reveal>

        <ul className="mt-6 grid gap-3 sm:grid-cols-3">
          {t.clients.items.map((client, i) => (
            <li key={client.name}>
              <button
                type="button"
                onClick={() => setIndex(stories.findIndex((s) => s.company === client.name) >= 0 ? stories.findIndex((s) => s.company === client.name) : i)}
                className={cn(
                  "h-full w-full rounded-2xl border px-4 py-3 text-left transition",
                  story.company === client.name
                    ? "border-[var(--primary)]/50 bg-[var(--brand-soft)]"
                    : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/40"
                )}
              >
                <p className="lp-display text-base font-semibold text-[var(--ink)]">{client.name}</p>
                <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--primary)] uppercase">{client.trade}</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--muted-foreground)]">{client.line}</p>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
