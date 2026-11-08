import type { CSSProperties, ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Endless horizontal strip. The content is rendered twice so the loop has no seam; hover pauses it. */
export function Marquee({
  children,
  reverse = false,
  seconds = 40,
  className,
}: {
  children: ReactNode
  reverse?: boolean
  seconds?: number
  className?: string
}) {
  return (
    <div className={cn("lp-marquee group", className)} style={{ "--lp-marquee-s": `${seconds}s` } as CSSProperties}>
      <div className={cn("lp-marquee-track", reverse && "lp-marquee-reverse")}>
        <div className="lp-marquee-set">{children}</div>
        <div className="lp-marquee-set" aria-hidden inert>
          {children}
        </div>
      </div>
    </div>
  )
}
