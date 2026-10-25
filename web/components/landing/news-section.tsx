"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useLanguage } from "@/components/landing/language-provider"
import { FeatureMock } from "@/components/landing/feature-page"
import { getFeature, type FeatureSlug } from "@/components/landing/features-data"

const NEW_FEATURES: FeatureSlug[] = ["orcamentos", "produtos", "whatsapp", "ia"]

/** Spotlight for the latest features: CRM, WhatsApp and AI. */
export function NewsSection() {
  const { locale } = useLanguage()
  const pt = locale === "pt"

  return (
    <section className="bg-[var(--band)] py-16 text-[var(--on-band)] sm:py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--on-band)]/60 uppercase">
          {pt ? "Novo na Worqera" : "New on Worqera"}
        </p>
        <h2 className="lp-display mt-3 max-w-3xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          {pt ? "A fila agora também vende, avisa e pensa junto." : "The queue now sells, notifies and thinks with you."}
        </h2>
        <p className="mt-3 max-w-2xl text-base text-[var(--on-band)]/70 sm:text-lg">
          {pt
            ? "O cliente que não fechou volta para a lista de ligar. O produto da loja entra no mesmo pedido do serviço. A mensagem sai pronta no WhatsApp. A IA resume o dia e escreve com você."
            : "The customer who did not close goes back on the call list. Shop products go on the same order as the service. The message goes out ready on WhatsApp. AI sums up the day and writes with you."}
        </p>

        <ul className="mt-12 grid gap-x-8 gap-y-12 md:grid-cols-2">
          {NEW_FEATURES.map((slug) => {
            const feature = getFeature(slug, locale)
            return (
              <li key={slug} className="flex min-w-0 flex-col">
                <FeatureMock feature={feature} />
                <p className="mt-5 text-[10px] font-semibold tracking-[0.14em] text-[var(--on-band)]/60 uppercase">{feature.plan}</p>
                <p className="lp-display mt-1 text-2xl font-semibold">{feature.name}</p>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--on-band)]/70">{feature.short}</p>
                <Link
                  href={`/recursos/${slug}`}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-white hover:underline"
                >
                  {pt ? "Como funciona" : "How it works"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
