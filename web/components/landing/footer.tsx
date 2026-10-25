"use client"

import Link from "next/link"
import { WorqeraLogo } from "@/components/brand/WorqeraLogo"
import { useLanguage } from "@/components/landing/language-provider"
import { MessageCircle } from "lucide-react"
import { getFeature, type FeatureSlug } from "@/components/landing/features-data"

const FOOTER_FEATURES: FeatureSlug[] = ["kanban", "orcamentos", "whatsapp", "financeiro", "ia"]

const WHATSAPP =
  "https://wa.me/5511985591053?text=" +
  encodeURIComponent("Olá! Gostaria de saber mais sobre a Worqera.")

export function WhatsAppFab() {
  const { locale } = useLanguage()
  return (
    <a
      href={WHATSAPP}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp"
      className="lp-wa fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 inline-flex h-12 items-center gap-2 rounded-full px-3.5 text-sm font-semibold"
    >
      <MessageCircle className="h-5 w-5" strokeWidth={2} />
      <span className="pr-0.5">{locale === "pt" ? "Falar" : "Chat"}</span>
    </a>
  )
}

export function Footer() {
  const { locale, t } = useLanguage()

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)] py-10 sm:py-12">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex items-start gap-3">
          <WorqeraLogo className="mt-0.5 h-7 w-7" />
          <div>
            <p className="lp-display text-lg font-semibold text-[var(--ink)]">Worqera</p>
            <p className="mt-1 max-w-xs text-sm text-[var(--muted-foreground)]">{t.footer.tagline}</p>
            <p className="mt-3 text-xs text-[var(--muted-foreground)]">{t.pricing.trust}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-12 gap-y-6 text-sm text-[var(--muted-foreground)] sm:grid-cols-3 sm:gap-x-16">
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-[var(--ink)] uppercase">
              {locale === "pt" ? "Recursos" : "Features"}
            </p>
            <Link href="/recursos" className="hover:text-[var(--ink)]">
              {locale === "pt" ? "Todos os recursos" : "All features"}
            </Link>
            {FOOTER_FEATURES.map((slug) => (
              <Link key={slug} href={`/recursos/${slug}`} className="hover:text-[var(--ink)]">
                {getFeature(slug, locale).name}
              </Link>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-[var(--ink)] uppercase">
              {locale === "pt" ? "Ramos" : "Trades"}
            </p>
            <Link href="/sapataria" className="hover:text-[var(--ink)]">
              {locale === "pt" ? "Sapataria" : "Footwear"}
            </Link>
            <Link href="/lavanderia" className="hover:text-[var(--ink)]">
              {locale === "pt" ? "Lavanderia" : "Laundry"}
            </Link>
            <Link href="/assistencia" className="hover:text-[var(--ink)]">
              {locale === "pt" ? "Assistência" : "Repair"}
            </Link>
            <Link href="/#ramos" className="hover:text-[var(--ink)]">
              {locale === "pt" ? "Todos os ramos" : "All trades"}
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-[var(--ink)] uppercase">Worqera</p>
            <Link href="/signup" className="hover:text-[var(--ink)]">
              {locale === "pt" ? "Testar grátis" : "Try free"}
            </Link>
            <Link href="/login" className="hover:text-[var(--ink)]">
              {locale === "pt" ? "Entrar" : "Sign in"}
            </Link>
            <Link href="/#pricing" className="hover:text-[var(--ink)]">
              {locale === "pt" ? "Preço" : "Pricing"}
            </Link>
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--ink)]">
              WhatsApp
            </a>
          </div>
        </div>

        <p className="border-t border-[var(--border)] pt-6 text-xs text-[var(--muted-foreground)] md:col-span-2">
          © {new Date().getFullYear()} Worqera. {t.footer.rights}
        </p>
      </div>
    </footer>
  )
}
