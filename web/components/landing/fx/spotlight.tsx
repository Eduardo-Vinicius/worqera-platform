"use client"

import { useRef, type PointerEvent, type ReactNode } from "react"
import { cn } from "@/lib/utils"

/** A card with a soft glow that follows the pointer. */
export function Spotlight({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el || event.pointerType !== "mouse") return
    const rect = el.getBoundingClientRect()
    el.style.setProperty("--lp-mx", `${event.clientX - rect.left}px`)
    el.style.setProperty("--lp-my", `${event.clientY - rect.top}px`)
  }

  return (
    <div ref={ref} onPointerMove={onMove} className={cn("lp-spot", className)}>
      {children}
    </div>
  )
}
