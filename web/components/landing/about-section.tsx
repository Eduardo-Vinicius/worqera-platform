"use client"

import { useLanguage } from "@/components/landing/language-provider"

/** Kept for potential reuse; not mounted on the conversion LP. */
export function AboutSection() {
  const { locale } = useLanguage()
  const pt = locale === "pt"

  return (
    <section id="about" className="py-14 sm:py-16">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <p className="lp-brand mb-3 text-sm font-semibold tracking-[0.2em] text-primary uppercase">Worqera</p>
        <h2 className="lp-brand mb-3 text-3xl font-semibold tracking-tight text-foreground">
          {pt ? "Feita para oficinas de serviço" : "Built for service workshops"}
        </h2>
        <p className="text-muted-foreground">
          {pt
            ? "Kanban por setores, rastreio e equipe alinhada — produto claro, rápido de adotar."
            : "Sector kanban, tracking, and an aligned team — clear product, quick to adopt."}
        </p>
      </div>
    </section>
  )
}
