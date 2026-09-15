"use client"

import { useLanguage } from "@/components/landing/language-provider"
import { Check } from "lucide-react"

export function SolutionSection() {
  const { t } = useLanguage()

  return (
    <section id="solution" className="py-20 lg:py-32 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <h2 className="lp-brand text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground mb-6 text-balance">
              {t.solution.title}
            </h2>
            <p className="text-lg text-muted-foreground mb-8">{t.solution.subtitle}</p>

            <ul className="space-y-4">
              {t.solution.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            <div className="aspect-[4/3] rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex h-full items-center justify-center rounded-xl bg-muted/70">
                <div className="w-full max-w-sm px-4 text-center">
                  <div className="mb-4 flex justify-center gap-2">
                    <div className="h-2.5 w-16 rounded-full bg-primary/30" />
                    <div className="h-2.5 w-16 rounded-full bg-primary/15" />
                    <div className="h-2.5 w-16 rounded-full bg-border" />
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-14 rounded-lg border border-border bg-card shadow-sm" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
