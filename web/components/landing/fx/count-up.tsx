"use client"

import { animate, useInView, useReducedMotion } from "motion/react"
import { useEffect, useRef, useState } from "react"

/** Splits "R$ 450 mil+" into "R$ ", 450 and " mil+". Thousands separators ("6.000", "6,000") are kept. */
function parse(value: string) {
  const match = value.match(/^(\D*?)(\d[\d.,]*)(.*)$/)
  if (!match) return null
  const [, prefix, digits, suffix] = match
  const sep = /\d[.,]\d{3}$/.test(digits) ? digits.replace(/\d/g, "").charAt(0) : ""
  const target = Number(sep ? digits.split(sep).join("") : digits)
  if (!Number.isFinite(target)) return null
  return { prefix, suffix, target, sep }
}

const group = (n: number, sep: string) => (sep ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, sep) : String(n))

/** Counts from zero to the number in `value` the first time it shows up. */
export function CountUp({ value, delay = 0, duration = 1.4 }: { value: string; delay?: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: "0px 0px -40px 0px" })
  const reduced = useReducedMotion()
  const parsed = parse(value)
  const [shown, setShown] = useState<number | null>(null)

  useEffect(() => {
    if (parsed && !reduced && !inView) setShown(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!parsed || !inView || reduced) return
    const controls = animate(0, parsed.target, {
      duration,
      delay,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setShown(Math.round(v)),
    })
    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduced, value])

  if (!parsed) return <span ref={ref}>{value}</span>
  const n = shown == null || reduced ? parsed.target : shown
  return (
    <span ref={ref}>
      <span className="sr-only">{value}</span>
      <span aria-hidden>
        {parsed.prefix}
        {group(n, parsed.sep)}
        {parsed.suffix}
      </span>
    </span>
  )
}
