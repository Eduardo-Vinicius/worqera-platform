"use client"

import { useEffect, useState } from "react"
import { m } from "motion/react"
import { cn } from "@/lib/utils"

/** Fixed side index on wide screens; the section in the middle of the screen is highlighted. */
export function SectionIndex({ items }: { items: Array<{ id: string; label: string }> }) {
  const [active, setActive] = useState(items[0]?.id)
  const ids = items.map((item) => item.id).join(" ")

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id)
      },
      { rootMargin: "-45% 0px -50% 0px" }
    )
    for (const id of ids.split(" ")) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [ids])

  return (
    <nav aria-label="Índice" className="fixed top-1/2 right-5 z-30 hidden -translate-y-1/2 xl:block">
      <ul className="lp-glass space-y-1 rounded-2xl border border-[var(--border)] p-2 shadow-[var(--shadow-lg)]">
        {items.map((item) => {
          const isActive = active === item.id
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={cn(
                  "relative isolate flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors",
                  isActive ? "text-[var(--primary)]" : "text-[var(--muted-foreground)] hover:text-[var(--ink)]"
                )}
              >
                {isActive ? <m.span layoutId="lp-index-pill" className="absolute inset-0 -z-10 rounded-xl bg-[var(--brand-soft)]" /> : null}
                <span className={cn("h-1.5 w-1.5 rounded-full", isActive ? "bg-[var(--primary)]" : "bg-[var(--border)]")} />
                {item.label}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
