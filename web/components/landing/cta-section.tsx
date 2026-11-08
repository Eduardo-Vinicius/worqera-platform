"use client"

import Link from "next/link"
import { useRef, type CSSProperties } from "react"
import { m, useScroll, useTransform, type MotionValue } from "motion/react"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/landing/language-provider"
import { Magnetic } from "@/components/landing/fx/magnetic"
import { WA_MESSAGES, waLink } from "@/components/landing/contact"

/** Where each floating order card sits, how much it tilts and how fast it drifts with the scroll. */
const CARDS = [
  { className: "top-8 left-[6%]", rot: "-6deg", speed: 60 },
  { className: "bottom-10 left-[12%]", rot: "4deg", speed: 110 },
  { className: "top-12 right-[22%]", rot: "5deg", speed: 80 },
  { className: "bottom-8 right-[30%]", rot: "-3deg", speed: 140 },
]

function FloatingCard({ label, rot, speed, className, progress, index }: { label: string; rot: string; speed: number; className: string; progress: MotionValue<number>; index: number }) {
  const x = useTransform(progress, [0, 1], [-speed / 2, speed])
  return (
    <m.div style={{ x }} className={`absolute hidden md:block ${className}`} aria-hidden>
      <div
        className="lp-float rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white backdrop-blur-md"
        style={{ "--lp-rot": rot, animationDelay: `${index * 0.7}s` } as CSSProperties}
      >
        <span className="mb-1 block h-1 w-6 rounded-full bg-white/60" />
        {label}
      </div>
    </m.div>
  )
}

/** Last push before the footer: a purple panel with order cards drifting toward "Delivered". */
export function CtaSection() {
  const { locale, t } = useLanguage()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] })

  return (
    <section ref={ref} className="px-4 py-16 sm:px-6 sm:py-24">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#4f0fa6_0%,#7d26de_45%,#c026d3_100%)] px-6 py-16 text-center text-white shadow-[0_40px_100px_-40px_rgba(125,38,222,0.9)] sm:px-10 sm:py-20">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.22),transparent_40%),radial-gradient(circle_at_90%_90%,rgba(45,212,191,0.35),transparent_45%)]" />
        {t.cta.cards.map((label, index) => (
          <FloatingCard key={label} label={label} index={index} progress={scrollYProgress} {...CARDS[index % CARDS.length]} />
        ))}
        <div aria-hidden className="absolute top-1/2 right-[5%] hidden -translate-y-1/2 flex-col items-center gap-2 rounded-2xl border border-white/25 bg-white/15 px-4 py-5 backdrop-blur-md lg:flex">
          <CheckCircle2 className="h-6 w-6 text-emerald-300" />
          <span className="text-xs font-bold tracking-[0.14em] uppercase">{t.cta.delivered}</span>
        </div>

        <div className="relative mx-auto max-w-2xl">
          <h2 className="lp-display text-balance text-4xl font-semibold tracking-tight sm:text-5xl">{t.cta.title}</h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/80 sm:text-lg">{t.cta.sub}</p>
          <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Magnetic>
              <Button asChild size="lg" className="lp-shine h-12 w-full rounded-full bg-white px-8 text-base font-semibold text-[#4f0fa6] hover:bg-white/90 sm:w-auto">
                <Link href="/signup">
                  {t.cta.primary}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </Magnetic>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 rounded-full border-white/40 bg-white/10 px-8 text-base font-medium text-white hover:bg-white/20 hover:text-white"
            >
              <a href={waLink(WA_MESSAGES.meet[locale])} target="_blank" rel="noopener noreferrer">
                {t.cta.secondary}
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
