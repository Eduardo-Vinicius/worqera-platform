"use client"

import { useState } from "react"
import { useLanguage } from "@/components/landing/language-provider"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export function FaqSection() {
  const { t } = useLanguage()
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="scroll-mt-24 border-t border-[var(--border)] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="lp-display text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
          {t.faq.title}
        </h2>

        <ul className="mt-10 divide-y divide-[var(--border)] border-y border-[var(--border)]">
          {t.faq.items.map((item, index) => {
            const isOpen = open === index
            return (
              <li key={item.q}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 py-5 text-left"
                  onClick={() => setOpen(isOpen ? null : index)}
                  aria-expanded={isOpen}
                >
                  <span className="text-base font-medium text-[var(--ink)] sm:text-lg">{item.q}</span>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 shrink-0 text-[var(--muted-foreground)] transition-transform",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>
                {isOpen ? (
                  <p className="pb-5 pr-8 text-sm leading-relaxed text-[var(--muted-foreground)] sm:text-[15px]">
                    {item.a}
                  </p>
                ) : null}
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
