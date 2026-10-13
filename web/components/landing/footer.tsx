"use client"

import Link from "next/link"
import { WorqeraLogo } from "@/components/brand/WorqeraLogo"
import { useLanguage } from "@/components/landing/language-provider"
import { MessageCircle } from "lucide-react"

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
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 sm:px-6 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-3">
          <WorqeraLogo className="mt-0.5 h-7 w-7" />
          <div>
            <p className="lp-display text-lg font-semibold text-[var(--ink)]">Worqera</p>
            <p className="mt-1 max-w-xs text-sm text-[var(--muted-foreground)]">{t.footer.tagline}</p>
            <p className="mt-3 text-xs text-[var(--muted-foreground)]">{t.pricing.trust}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-5 text-sm text-[var(--muted-foreground)]">
          <Link href="/signup" className="hover:text-[var(--ink)]">
            {locale === "pt" ? "Testar grátis" : "Try free"}
          </Link>
          <Link href="/login" className="hover:text-[var(--ink)]">
            {locale === "pt" ? "Entrar" : "Sign in"}
          </Link>
          <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--ink)]">
            WhatsApp
          </a>
        </div>

        <p className="text-xs text-[var(--muted-foreground)]">
          © {new Date().getFullYear()} Worqera. {t.footer.rights}
        </p>
      </div>
    </footer>
  )
}
