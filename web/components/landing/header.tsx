"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { WorqeraLogo } from "@/components/brand/WorqeraLogo"
import { useLanguage } from "@/components/landing/language-provider"
import { Menu, X } from "lucide-react"
import { useState } from "react"

export function Header() {
  const { locale, setLocale, t } = useLanguage()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    { label: t.nav.product, href: "#solution" },
    { label: locale === "pt" ? "Quem somos" : "About", href: "#about" },
    { label: t.nav.howItWorks, href: "#how-it-works" },
    { label: t.nav.pricing, href: "#pricing" },
    { label: t.nav.faq, href: "#faq" },
  ]

  return (
    <header className="fixed top-0 right-0 left-0 z-50 border-b border-border/80 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between lg:h-[4.25rem]">
          <Link href="/" className="flex items-center gap-2.5">
            <WorqeraLogo className="h-8 w-8" />
            <span className="lp-brand text-lg font-semibold tracking-tight text-foreground">Worqera</span>
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setLocale(locale === "pt" ? "en" : "pt")}
              className="hidden rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground sm:inline-flex"
            >
              {locale.toUpperCase()}
            </button>

            <Button
              asChild
              variant="ghost"
              className="hidden text-muted-foreground hover:bg-muted hover:text-foreground sm:inline-flex"
            >
              <Link href="/login">{locale === "pt" ? "Entrar" : "Sign in"}</Link>
            </Button>

            <Button
              asChild
              className="hidden rounded-xl bg-primary text-primary-foreground hover:bg-secondary sm:inline-flex"
            >
              <Link href="/signup">{locale === "pt" ? "Começar grátis" : "Start free"}</Link>
            </Button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-2 text-foreground lg:hidden"
              aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen ? (
          <div className="border-t border-border py-4 lg:hidden">
            <nav className="flex flex-col gap-3">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </a>
              ))}
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-foreground"
              >
                {locale === "pt" ? "Entrar" : "Sign in"}
              </Link>
              <Button asChild className="mt-1 w-full rounded-xl bg-primary hover:bg-secondary">
                <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                  {locale === "pt" ? "Começar grátis" : "Start free"}
                </Link>
              </Button>
            </nav>
          </div>
        ) : null}
      </div>
    </header>
  )
}
