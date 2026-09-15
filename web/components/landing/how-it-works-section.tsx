"use client"

import { useLanguage } from "@/components/landing/language-provider"

export function HowItWorksSection() {
  const { t } = useLanguage()

  return (
    <section id="how-it-works" className="scroll-mt-24 py-16 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center sm:mb-16">
          <h2 className="lp-brand mb-3 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {t.howItWorks.title}
          </h2>
          <p className="text-muted-foreground">{t.howItWorks.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 lg:gap-10">
          {t.howItWorks.steps.map((step, index) => (
            <div key={index} className="relative text-center">
              {index < t.howItWorks.steps.length - 1 ? (
                <div className="absolute top-7 left-[58%] hidden h-px w-[84%] bg-border md:block" />
              ) : null}

              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card text-lg font-semibold text-primary shadow-sm sm:mb-5 sm:h-16 sm:w-16 sm:text-xl">
                {step.number}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="mx-auto max-w-xs text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
