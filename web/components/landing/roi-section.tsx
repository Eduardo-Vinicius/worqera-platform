"use client"

import { useLanguage } from "@/components/landing/language-provider"
import { TrendingUp, Clock, AlertCircle, Users } from "lucide-react"

const icons = [TrendingUp, Clock, AlertCircle, Users]

export function RoiSection() {
  const { t } = useLanguage()

  return (
    <section className="border-y border-border bg-card py-16 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center sm:mb-14">
          <p className="mb-3 text-sm font-medium text-primary">{t.roi.badge}</p>
          <h2 className="lp-brand mb-3 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {t.roi.title}
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">{t.roi.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-4">
          {t.roi.metrics.map((metric, index) => {
            const Icon = icons[index]
            return (
              <div
                key={index}
                className="rounded-2xl border border-border bg-background p-6 shadow-sm sm:p-7"
              >
                <Icon className="mb-4 h-5 w-5 text-primary" />
                <p className="lp-brand mb-1 text-3xl font-semibold tracking-tight text-foreground">
                  {metric.value}
                  <span className="text-xl text-primary">{metric.unit}</span>
                </p>
                <h3 className="mb-1 text-sm font-semibold text-foreground">{metric.title}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">{metric.description}</p>
              </div>
            )
          })}
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground sm:text-sm">{t.roi.bottomText}</p>
      </div>
    </section>
  )
}
