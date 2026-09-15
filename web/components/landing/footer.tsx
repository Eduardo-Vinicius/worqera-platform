"use client"

import Link from "next/link"
import { WorqeraLogo } from "@/components/brand/WorqeraLogo"
import { useLanguage } from "@/components/landing/language-provider"

const WHATSAPP =
  "https://wa.me/5511985591053?text=" +
  encodeURIComponent("Olá! Gostaria de saber mais sobre a Worqera.")

export function Footer() {
  const { locale, t } = useLanguage()

  return (
    <footer className="border-t border-border bg-card py-10 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-3">
            <WorqeraLogo className="h-8 w-8" />
            <div>
              <span className="lp-brand text-lg font-semibold tracking-tight text-foreground">Worqera</span>
              <p className="text-sm text-muted-foreground">
                {locale === "pt"
                  ? "Gestão de pedidos para oficinas"
                  : "Order management for workshops"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
            <Link href="/signup" className="hover:text-foreground">
              {locale === "pt" ? "Testar grátis" : "Try free"}
            </Link>
            <Link href="/login" className="hover:text-foreground">
              {locale === "pt" ? "Entrar" : "Sign in"}
            </Link>
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
              WhatsApp
            </a>
          </div>

          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Worqera. {t.footer.rights}
          </p>
        </div>
      </div>
    </footer>
  )
}
