"use client"

import { useLanguage } from "@/components/landing/language-provider"
import { Shield, Lock, Database, CheckCircle2, FileCheck, Cloud, Server, Key } from "lucide-react"

export function SecuritySection() {
  const { t } = useLanguage()

  const iconMap = {
    shield: Shield,
    lock: Lock,
    database: Database,
    fileCheck: FileCheck,
    cloud: Cloud,
    server: Server,
    key: Key,
  }

  return (
    <section id="security" className="py-20 lg:py-32 relative overflow-hidden bg-muted/30">
      <div className="absolute top-0 right-0 w-[300px] h-[300px] lg:w-[600px] lg:h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-12 lg:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Shield className="h-4 w-4" />
            {t.security.badge}
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 text-balance">
            {t.security.title}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t.security.subtitle}
          </p>
        </div>

        {/* Main Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {t.security.features.map((feature, index) => {
            const Icon = iconMap[feature.icon as keyof typeof iconMap] || Shield
            return (
              <div
                key={index}
                className="group relative p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                <div className="relative">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Compliance Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
          {t.security.compliance.map((item, index) => (
            <div
              key={index}
              className="p-6 rounded-2xl bg-gradient-to-br from-card to-primary/5 border border-primary/20 backdrop-blur-sm"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                  <ul className="space-y-2">
                    {item.items.map((listItem, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <span>{listItem}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Technical Specs */}
        <div className="max-w-4xl mx-auto">
          <div className="p-8 rounded-2xl bg-card border border-border backdrop-blur-sm">
            <h3 className="text-xl font-semibold text-foreground mb-6 text-center">
              {t.security.techTitle}
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {t.security.techSpecs.map((spec, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                  <div>
                    <div className="font-medium text-sm text-foreground">{spec.label}</div>
                    <div className="text-xs text-muted-foreground">{spec.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
