"use client"

import { useRef, useState, type UIEvent } from "react"
import { AnimatePresence, m, useMotionValueEvent, useScroll, useSpring } from "motion/react"
import { useLanguage } from "@/components/landing/language-provider"
import { Reveal } from "@/components/landing/fx/reveal"
import { HOW_VISUALS } from "@/components/landing/how-visuals"
import { cn } from "@/lib/utils"

/**
 * The life of one order in four steps. On desktop the steps scroll by on the left while the
 * screen on the right stays put and changes with the step; on phones it is a swipeable row.
 */
export function HowSection() {
  const { t } = useLanguage()
  const steps = t.how.steps
  const track = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [slide, setSlide] = useState(0)

  const { scrollYProgress } = useScroll({ target: track, offset: ["start 55%", "end 55%"] })
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 30 })
  useMotionValueEvent(scrollYProgress, "change", (value) => {
    setActive(Math.min(steps.length - 1, Math.max(0, Math.floor(value * steps.length))))
  })

  const onSwipe = (event: UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget
    const width = el.firstElementChild instanceof HTMLElement ? el.firstElementChild.offsetWidth + 16 : el.clientWidth
    setSlide(Math.round(el.scrollLeft / width))
  }

  const Visual = HOW_VISUALS[active]

  return (
    <section id="como-funciona" className="scroll-mt-24 border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--muted)_45%,transparent)] py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--primary)] uppercase">{t.how.eyebrow}</p>
          <h2 className="lp-display mt-3 max-w-2xl text-balance text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-[2.6rem] sm:leading-[1.08]">
            {t.how.title}
          </h2>
        </Reveal>

        <div ref={track} className="relative mt-8 hidden gap-16 lg:grid lg:grid-cols-2">
          <div className="relative">
            <span className="absolute top-0 bottom-0 left-[19px] w-0.5 rounded-full bg-[var(--border)]" aria-hidden />
            <m.span className="absolute top-0 bottom-0 left-[19px] w-0.5 origin-top rounded-full bg-[var(--primary)]" style={{ scaleY: fill }} aria-hidden />
            {steps.map((step, index) => (
              <div key={step.title} className="flex min-h-[58vh] items-center">
                <div className={cn("relative flex gap-5 transition-opacity duration-500", index === active ? "opacity-100" : "opacity-35")}>
                  <span
                    className={cn(
                      "lp-display relative z-[1] flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-base font-semibold transition-colors duration-500",
                      index <= active
                        ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)]"
                    )}
                  >
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="lp-display text-3xl font-semibold tracking-tight text-[var(--ink)]">{step.title}</h3>
                    <p className="mt-3 max-w-md text-base leading-relaxed text-[var(--muted-foreground)]">{step.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div>
            <div className="sticky top-[calc(50vh_-_220px)] h-[440px]">
              <AnimatePresence mode="wait">
                <m.div
                  key={active}
                  className="h-full"
                  initial={{ opacity: 0, y: 24, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -24, scale: 0.98 }}
                  transition={{ duration: 0.35 }}
                >
                  <Visual />
                </m.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="lg:hidden">
          <div onScroll={onSwipe} className="-mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
            {steps.map((step, index) => {
              const StepVisual = HOW_VISUALS[index]
              return (
                <article key={step.title} className="w-[85%] shrink-0 snap-center sm:w-[60%]">
                  <div className="h-[380px]">
                    <StepVisual />
                  </div>
                  <div className="mt-4 flex gap-3">
                    <span className="lp-display flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-semibold text-[var(--primary-foreground)]">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="lp-display text-xl font-semibold text-[var(--ink)]">{step.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-[var(--muted-foreground)]">{step.desc}</p>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
          <div className="mt-4 flex justify-center gap-1.5" aria-hidden>
            {steps.map((step, index) => (
              <span key={step.title} className={cn("h-1.5 rounded-full transition-all duration-300", index === slide ? "w-6 bg-[var(--primary)]" : "w-1.5 bg-[var(--border)]")} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
