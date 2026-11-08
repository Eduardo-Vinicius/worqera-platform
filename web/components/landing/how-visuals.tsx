"use client"

import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import { LayoutGroup, m, useInView, type Variants } from "motion/react"
import { BadgeCheck, CheckCircle2, MessageCircle, Printer } from "lucide-react"
import { useLanguage } from "@/components/landing/language-provider"
import { RollNumber } from "@/components/landing/fx/roll-number"
import { cn } from "@/lib/utils"

const EASE = [0.22, 1, 0.36, 1] as const

const list: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } } }
const row: Variants = { hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: EASE } } }

/** A fixed QR-looking glyph: three finder squares and a deterministic dot field. */
export function QrGlyph({ className }: { className?: string }) {
  const size = 21
  const cells: Array<[number, number]> = []
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const finder = (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12)
      if (finder) continue
      if ((x * 7 + y * 13 + x * y) % 5 < 2) cells.push([x, y])
    }
  }
  const finder = (fx: number, fy: number) => (
    <g key={`${fx}-${fy}`}>
      <rect x={fx} y={fy} width={7} height={7} fill="none" stroke="currentColor" strokeWidth={1} />
      <rect x={fx + 2} y={fy + 2} width={3} height={3} fill="currentColor" />
    </g>
  )
  return (
    <svg viewBox={`-0.5 -0.5 ${size + 1} ${size + 1}`} className={className} aria-hidden>
      {finder(0, 0)}
      {finder(14, 0)}
      {finder(0, 14)}
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" />
      ))}
    </svg>
  )
}

function Frame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <m.div
      initial="hidden"
      whileInView="show"
      viewport={{ amount: 0.5 }}
      className={cn("relative h-full overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-lg)] sm:p-6", className)}
    >
      {children}
    </m.div>
  )
}

/** True a moment after the element is on screen, false again once it leaves. */
function useLater(ms: number) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.5 })
  const [later, setLater] = useState(false)
  useEffect(() => {
    if (!inView) return
    const timer = window.setTimeout(() => setLater(true), ms)
    return () => {
      window.clearTimeout(timer)
      setLater(false)
    }
  }, [inView, ms])
  return { ref, later }
}

export function EntryVisual() {
  const { t } = useLanguage()
  const v = t.how.visual
  const s = t.stage
  return (
    <Frame>
      <p className="text-[11px] font-semibold tracking-[0.14em] text-[var(--primary)] uppercase">{v.newOrder}</p>
      <m.dl variants={list} className="mt-3 space-y-2">
        {v.fields.map(([label, value]) => (
          <m.div key={label} variants={row} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--paper)] px-3 py-2">
            <dt className="text-xs text-[var(--muted-foreground)]">{label}</dt>
            <dd className="truncate text-sm font-semibold text-[var(--ink)]">{value}</dd>
          </m.div>
        ))}
      </m.dl>

      <div className="relative mt-5 flex flex-col items-center">
        <div className="relative z-10 flex h-9 w-56 items-center justify-between rounded-xl bg-[var(--band)] px-3 text-[var(--on-band)]">
          <Printer className="h-4 w-4 opacity-80" />
          <span className="h-1 w-24 rounded-full bg-black/60" />
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </div>
        <m.div
          variants={{ hidden: { y: -70, opacity: 0 }, show: { y: 0, opacity: 1, transition: { delay: 0.8, duration: 0.9, ease: EASE } } }}
          className="-mt-1 flex w-48 items-center gap-3 rounded-b-lg border border-t-0 border-[var(--border)] bg-white p-3 text-[#0f172a] shadow-md"
        >
          <QrGlyph className="h-14 w-14 shrink-0" />
          <div className="min-w-0">
            <p className="lp-mono text-sm font-bold">{s.code}</p>
            <p className="truncate text-[11px]">{s.customer}</p>
            <p className="truncate text-[10px] text-slate-500">{s.due}</p>
          </div>
        </m.div>
        <m.p
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { delay: 1.5 } } }}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--ready)]"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {v.printed}
        </m.p>
      </div>
    </Frame>
  )
}

export function ProductionVisual() {
  const { t } = useLanguage()
  const v = t.how.visual
  const { ref, later: moved } = useLater(900)
  const [a, b, mine, late] = v.cards
  const columns = [moved ? [a] : [a, mine], moved ? [mine, b] : [b], [late]]
  const group = useId()

  return (
    <div ref={ref} className="h-full">
      <LayoutGroup id={group}>
      <Frame>
        <div className="grid h-full grid-cols-3 gap-2">
          {v.cols.map((name, index) => (
            <div key={name} className="flex flex-col gap-2 rounded-2xl bg-[var(--mock-bg)] p-2">
              <p className="truncate px-1 pt-1 text-[10px] font-semibold tracking-[0.1em] text-[var(--muted-foreground)] uppercase">{name}</p>
              {columns[index].map((cardName) => {
                const isMine = cardName === mine
                const isLate = cardName === late
                return (
                  <m.div
                    key={cardName}
                    layoutId={cardName}
                    transition={{ type: "spring", stiffness: 260, damping: 26 }}
                    className={cn(
                      "rounded-xl border bg-[var(--surface)] p-2",
                      isMine && "border-[var(--primary)]/50 ring-2 ring-[var(--primary)]/20",
                      isLate && "lp-late-pulse border-[var(--late)]/50",
                      !isMine && !isLate && "border-[var(--border)]"
                    )}
                  >
                    <p className="truncate text-[11px] font-semibold text-[var(--ink)]">{cardName}</p>
                    {isLate ? (
                      <span className="mt-1 inline-block rounded-full bg-[color-mix(in_srgb,var(--late)_14%,transparent)] px-1.5 text-[10px] font-semibold text-[var(--late)]">
                        {v.late}
                      </span>
                    ) : (
                      <span className="mt-1.5 block h-1.5 w-3/4 rounded-full bg-[var(--muted)]" />
                    )}
                  </m.div>
                )
              })}
            </div>
          ))}
        </div>
      </Frame>
      </LayoutGroup>
    </div>
  )
}

export function ReadyVisual() {
  const { t } = useLanguage()
  const v = t.how.visual
  return (
    <Frame className="flex flex-col items-center justify-center bg-[radial-gradient(circle_at_50%_0%,var(--brand-soft),transparent_70%)]">
      <m.div
        variants={{ hidden: { y: -40, opacity: 0 }, show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 22, delay: 0.2 } } }}
        className="lp-glass flex w-full max-w-xs items-start gap-3 rounded-2xl border border-[var(--border)] p-3 shadow-lg"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--wa)] text-white">
          <MessageCircle className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-[var(--ink)]">{v.notify}</span>
          <span className="block text-xs text-[var(--muted-foreground)]">{v.notifySub}</span>
        </span>
      </m.div>
      <m.div
        variants={{ hidden: { scale: 0, opacity: 0 }, show: { scale: 1, opacity: 1, transition: { type: "spring", stiffness: 260, damping: 14, delay: 0.7 } } }}
        className="mt-8 flex h-20 w-20 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--ready)_16%,transparent)] text-[var(--ready)]"
      >
        <BadgeCheck className="h-10 w-10" />
      </m.div>
      <m.span
        variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { delay: 1.1 } } }}
        className="mt-6 rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-[var(--primary-foreground)]"
      >
        {v.track}
      </m.span>
    </Frame>
  )
}

export function DeliveryVisual() {
  const { t } = useLanguage()
  const v = t.how.visual
  const { ref, later: sold } = useLater(1400)
  return (
    <div ref={ref} className="h-full">
      <Frame>
        <p className="text-[11px] font-semibold tracking-[0.14em] text-[var(--primary)] uppercase">{v.receipt}</p>
        <m.ul variants={list} className="mt-4 space-y-2 border-b border-dashed border-[var(--border)] pb-4">
          {v.lines.map(([label, value]) => (
            <m.li key={label} variants={row} className="flex items-center justify-between text-sm">
              <span className="text-[var(--muted-foreground)]">{label}</span>
              <span className="font-semibold text-[var(--ink)]">{value}</span>
            </m.li>
          ))}
        </m.ul>
        <div className="mt-4 flex items-end justify-between">
          <span className="text-sm text-[var(--muted-foreground)]">{v.total}</span>
          <span className="lp-display text-3xl font-semibold text-[var(--ink)]">{v.totalValue}</span>
        </div>
        <m.div
          variants={{ hidden: { scale: 1.6, opacity: 0, rotate: -14 }, show: { scale: 1, opacity: 1, rotate: -8, transition: { delay: 0.8, type: "spring", stiffness: 300, damping: 16 } } }}
          className="mt-5 inline-flex items-center gap-1.5 rounded-lg border-2 border-[var(--ready)] px-3 py-1 text-sm font-bold tracking-wide text-[var(--ready)] uppercase"
        >
          <CheckCircle2 className="h-4 w-4" />
          {v.paid}
        </m.div>
        <div
          className={cn(
            "mt-5 flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition-colors duration-500",
            sold ? "border-[var(--ready)]/40 bg-[color-mix(in_srgb,var(--ready)_10%,transparent)]" : "border-[var(--border)]"
          )}
        >
          <span className="text-[var(--muted-foreground)]">{v.stock}</span>
          <RollNumber value={sold ? "17" : "18"} className="lp-display text-lg font-semibold text-[var(--ink)]" />
        </div>
      </Frame>
    </div>
  )
}

export const HOW_VISUALS = [EntryVisual, ProductionVisual, ReadyVisual, DeliveryVisual]
