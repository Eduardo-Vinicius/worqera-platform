"use client"

import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { AnimatePresence, LazyMotion, MotionConfig, domAnimation, m, useReducedMotion } from "motion/react"
import { WorqeraLogo } from "@/components/brand/WorqeraLogo"
import "@/components/landing/landing.css"

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Worqera"
const EASE = [0.22, 1, 0.36, 1] as const
const TRADES = ["sapataria", "lavanderia", "oficina", "atelier", "gráfica", "marcenaria", "ótica"]
const BEATS = ["O pedido entra na fila.", "O setor puxa o próximo.", "O cliente recebe o aviso."]
const CHIPS = ["Kanban por setor", "Cliente avisado sozinho", "Pix, boleto ou cartão", "7 dias grátis"]

function BrandMark({
  light = false,
  className = "h-9 w-9",
}: {
  light?: boolean
  className?: string
}) {
  return (
    <Link href="/" className="relative flex items-center gap-2.5">
      <WorqeraLogo className={className} />
      <span className={`lp-display text-lg font-semibold ${light ? "text-white" : "text-[var(--ink)]"}`}>
        {APP_NAME}
      </span>
    </Link>
  )
}

function RotatingTrade({ words }: { words: string[] }) {
  const [index, setIndex] = useState(0)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced || words.length < 2) return
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % words.length), 2400)
    return () => window.clearInterval(timer)
  }, [reduced, words.length])

  return (
    <span className="relative inline-flex h-[1.15em] min-w-[11ch] overflow-hidden align-bottom">
      <AnimatePresence mode="popLayout" initial={false}>
        <m.span
          key={words[index]}
          className="inline-block whitespace-nowrap font-semibold text-[#c4a0ff]"
          initial={reduced ? false : { y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduced ? undefined : { y: "-100%", opacity: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
        >
          {words[index]}
        </m.span>
      </AnimatePresence>
    </span>
  )
}

function LiveBeat() {
  const [index, setIndex] = useState(0)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % BEATS.length), 2800)
    return () => window.clearInterval(timer)
  }, [reduced])

  return (
    <p className="flex items-center gap-2.5 text-[13px] text-[#b7b3c4]">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="lp-live-dot absolute inline-flex h-full w-full rounded-full bg-[#2dd4bf]" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#2dd4bf]" />
      </span>
      <span className="overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <m.span
            key={BEATS[index]}
            className="block"
            initial={reduced ? false : { y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduced ? undefined : { y: -10, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            {BEATS[index]}
          </m.span>
        </AnimatePresence>
      </span>
    </p>
  )
}

function DrawnUnderline() {
  return (
    <svg aria-hidden viewBox="0 0 300 12" preserveAspectRatio="none" className="absolute -bottom-1 left-0 h-3 w-full text-[#7d26de]/80">
      <m.path
        d="M2 9 C 60 3, 140 3, 298 7"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, delay: 0.45, ease: EASE }}
      />
    </svg>
  )
}

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: EASE },
})

const field =
  "h-11 rounded-xl border-[var(--border)] bg-white text-[var(--ink)] placeholder:text-[var(--muted-foreground)] focus-visible:ring-[var(--primary)]"

/** Split escuro + formulário. Movimento da home, sem blur e sem mock de kanban. */
export function AuthShell({
  children,
  aside = false,
}: {
  children: ReactNode
  aside?: boolean
}) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <div className="lp min-h-screen bg-[var(--paper)] text-[var(--ink)] antialiased">
          {aside ? (
            <div className="flex min-h-screen">
              <aside className="lp-auth-panel relative hidden shrink-0 flex-col justify-between overflow-hidden p-10 lg:flex lg:w-[44%] xl:w-[40%] xl:p-14">
                <div className="lp-auth-grid" aria-hidden />
                <m.div {...fade(0)}>
                  <BrandMark light className="h-9 w-9" />
                </m.div>
                <div className="relative max-w-sm space-y-6">
                  <m.p className="flex items-baseline gap-1.5 text-[13px] text-[#9d9da1]" {...fade(0.08)}>
                    <span>Para</span>
                    <RotatingTrade words={TRADES} />
                    <span className="text-[#6f6a80]">· fila de pedidos</span>
                  </m.p>
                  <m.h2
                    className="lp-display text-4xl font-medium leading-[1.12] tracking-tight text-white xl:text-[2.65rem]"
                    {...fade(0.16)}
                  >
                    Gestão moderna
                    <br />
                    <span className="relative inline-block text-[#c4a0ff]">
                      para sua empresa.
                      <DrawnUnderline />
                    </span>
                  </m.h2>
                  <m.p className="text-[15px] leading-relaxed text-[#9d9da1]" {...fade(0.24)}>
                    Kanban por setores, pedidos, clientes e métricas — o painel da rotina.
                  </m.p>
                  <m.div {...fade(0.32)}>
                    <LiveBeat />
                  </m.div>
                  <m.ul className="flex flex-wrap gap-2" {...fade(0.4)}>
                    {CHIPS.map((chip) => (
                      <li key={chip} className="rounded-full bg-[#7d26de]/20 px-3 py-1 text-xs font-medium text-[#d4b4ff]">
                        {chip}
                      </li>
                    ))}
                  </m.ul>
                </div>
                <m.p className="relative text-xs text-[#5c5670]" {...fade(0.48)}>
                  © {new Date().getFullYear()} {APP_NAME}. Todos os direitos reservados.
                </m.p>
              </aside>

              <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-5 py-12 sm:px-10">
                <m.div className="mb-8 flex w-full max-w-[400px] lg:hidden" {...fade(0)}>
                  <BrandMark />
                </m.div>
                <m.div className="w-full max-w-[400px]" {...fade(0.12)}>
                  {children}
                </m.div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-screen flex-col items-center justify-center px-5 py-12">
              <m.div {...fade(0)}>
                <BrandMark className="h-9 w-9" />
              </m.div>
              <m.div
                className="mt-8 w-full max-w-[400px] rounded-2xl border border-[var(--border)] bg-white p-6 sm:p-8"
                {...fade(0.1)}
              >
                {children}
              </m.div>
            </div>
          )}
        </div>
      </MotionConfig>
    </LazyMotion>
  )
}

export { field as authFieldClass }
