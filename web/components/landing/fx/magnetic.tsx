"use client"

import { m, useMotionValue, useSpring } from "motion/react"
import type { PointerEvent, ReactNode } from "react"

/** Pulls its child a few pixels toward a mouse pointer. Touch is left alone. */
export function Magnetic({ children, strength = 6, className }: { children: ReactNode; strength?: number; className?: string }) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 260, damping: 18 })
  const sy = useSpring(y, { stiffness: 260, damping: 18 })

  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return
    const rect = event.currentTarget.getBoundingClientRect()
    x.set(((event.clientX - rect.left) / rect.width - 0.5) * strength * 2)
    y.set(((event.clientY - rect.top) / rect.height - 0.5) * strength * 2)
  }
  const reset = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <m.div className={className} style={{ x: sx, y: sy }} onPointerMove={onMove} onPointerLeave={reset}>
      {children}
    </m.div>
  )
}
