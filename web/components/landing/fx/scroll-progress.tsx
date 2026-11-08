"use client"

import { m, useScroll, useSpring } from "motion/react"

/** Thin brand bar at the very top that fills as the page scrolls. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 })
  return (
    <m.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[70] h-[2px] origin-left bg-gradient-to-r from-[var(--primary)] via-fuchsia-400 to-[var(--action)]"
      style={{ scaleX }}
    />
  )
}
