"use client"

import { useLanguage } from "@/components/landing/language-provider"
import { MessageSquareWarning, Eye, Clock, AlertTriangle, Shuffle, FileQuestion, TrendingDown, Timer, Frown, BarChart3 } from "lucide-react"

const icons = [MessageSquareWarning, Eye, Clock, AlertTriangle, Shuffle, FileQuestion]
const costIcons = [TrendingDown, Timer, Frown, BarChart3]

export function ProblemSection() {
  const { t } = useLanguage()

  return (
    <section className="py-20 lg:py-32 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-16">
          <h2 className="lp-brand text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground mb-4 text-balance">
            {t.problem.title}
          </h2>
          <p className="text-lg text-muted-foreground">{t.problem.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
          {t.problem.items.map((item, index) => {
            const Icon = icons[index]
            return (
              <div
                key={index}
                className="p-6 rounded-2xl border border-border bg-card shadow-sm transition-colors hover:border-primary/25"
              >
                <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center mb-4">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            )
          })}
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            <h3 className="lp-brand text-2xl font-semibold text-foreground text-center mb-8">
              {t.problem.costTitle}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {t.problem.costs.map((cost, index) => {
                const Icon = costIcons[index]
                return (
                  <div key={index} className="text-center p-4">
                    <div className="inline-flex h-11 w-11 rounded-xl bg-muted items-center justify-center mb-3">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-sm font-semibold text-foreground mb-1">{cost.title}</p>
                    <p className="text-xs text-muted-foreground">{cost.description}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
