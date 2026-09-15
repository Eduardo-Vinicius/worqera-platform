"use client"

import { useLanguage } from "@/components/landing/language-provider"
import { Building2, Quote, Star } from "lucide-react"

export function ClientsSection() {
  const { t } = useLanguage()

  return (
    <section id="clientes" className="py-14 sm:py-16 lg:py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card/50 backdrop-blur-sm mb-6">
            <Star className="h-4 w-4 text-primary fill-primary" />
            <span className="text-sm text-muted-foreground">
              {t.clients.badge}
            </span>
          </div>
          <h2 className="lp-brand mb-3 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {t.clients.title}
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            {t.clients.subtitle}
          </p>
        </div>

        {/* Client logos grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-12 sm:mb-16">
          {t.clients.companies.map((company, index) => (
            <div
              key={index}
              className="group relative rounded-2xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-primary/25 sm:p-8"
            >
              <div className="flex flex-col items-center justify-center text-center gap-3">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Building2 className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-foreground mb-1">
                    {company.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {company.industry}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {t.clients.testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="relative p-6 sm:p-8 rounded-2xl border border-border bg-card/50 backdrop-blur-sm"
            >
              <Quote className="h-8 w-8 text-primary/20 mb-4" />
              <p className="text-sm sm:text-base text-foreground mb-6 leading-relaxed">
                "{testimonial.quote}"
              </p>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">
                    {testimonial.author.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {testimonial.author}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {testimonial.position} - {testimonial.company}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
