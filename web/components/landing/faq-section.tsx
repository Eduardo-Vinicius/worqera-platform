"use client"

import { useState } from "react"
import { AnimatePresence, m } from "motion/react"
import { MessageCircle, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/landing/language-provider"
import { Reveal, RevealGroup, RevealItem } from "@/components/landing/fx/reveal"
import { WA_MESSAGES, waLink } from "@/components/landing/contact"

export function FaqSection() {
  const { locale, t } = useLanguage()
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="scroll-mt-24 border-t border-[var(--border)] py-16 sm:py-24">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <Reveal>
          <h2 className="lp-display text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-[2.6rem]">{t.faq.title}</h2>
          <div className="mt-8 hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 lg:block">
            <p className="lp-display text-xl font-semibold text-[var(--ink)]">{t.faq.more.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">{t.faq.more.sub}</p>
            <Button asChild className="lp-wa mt-5 h-11 rounded-full px-5 font-semibold">
              <a href={waLink(WA_MESSAGES.doubt[locale])} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" />
                {t.faq.more.cta}
              </a>
            </Button>
          </div>
        </Reveal>

        <div>
          <RevealGroup stagger={0.05} className="space-y-2">
            {t.faq.items.map((item, index) => {
              const isOpen = open === index
              return (
                <RevealItem
                  key={item.q}
                  className={`rounded-2xl border transition-colors duration-300 ${isOpen ? "border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] bg-[var(--surface)]" : "border-[var(--border)] bg-[var(--surface)]/60"}`}
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                    onClick={() => setOpen(isOpen ? null : index)}
                    aria-expanded={isOpen}
                  >
                    <span className="text-base font-medium text-[var(--ink)]">{item.q}</span>
                    <m.span
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 24 }}
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${isOpen ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "bg-[var(--muted)] text-[var(--ink)]"}`}
                    >
                      <Plus className="h-4 w-4" />
                    </m.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen ? (
                      <m.div
                        key="answer"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="px-5 pr-14 pb-5 text-sm leading-relaxed text-[var(--muted-foreground)] sm:text-[15px]">{item.a}</p>
                      </m.div>
                    ) : null}
                  </AnimatePresence>
                </RevealItem>
              )
            })}
          </RevealGroup>

          <div className="mt-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 lg:hidden">
            <p className="lp-display text-lg font-semibold text-[var(--ink)]">{t.faq.more.title}</p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">{t.faq.more.sub}</p>
            <Button asChild className="lp-wa mt-4 h-11 w-full rounded-full font-semibold">
              <a href={waLink(WA_MESSAGES.doubt[locale])} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" />
                {t.faq.more.cta}
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
