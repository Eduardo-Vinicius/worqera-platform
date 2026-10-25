"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { WorqeraLogo } from "@/components/brand/WorqeraLogo"
import { useLanguage } from "@/components/landing/language-provider"
import { Menu, Moon, Sun, X } from "lucide-react"
import { useState } from "react"

export function Header({ dark, onToggleTheme }: { dark: boolean; onToggleTheme: () => void }) {
  const { locale, setLocale, t } = useLanguage()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    { label: t.nav.product, href: "/#produto" },
    { label: t.nav.features, href: "/recursos" },
    { label: t.nav.clients, href: "/#clientes" },
    { label: t.nav.trades, href: "/#ramos" },
    { label: t.nav.pricing, href: "/#pricing" },
  ]

  return (
    <header className="fixed top-0 right-0 left-0 z-50 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--paper)_92%,transparent)] backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between sm:h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <WorqeraLogo className="h-7 w-7" />
            <span className="lp-display text-lg font-semibold text-[var(--ink)]">Worqera</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--ink)]"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleTheme}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)]"
              aria-label={dark ? (locale === "pt" ? "Modo claro" : "Light mode") : locale === "pt" ? "Modo escuro" : "Dark mode"}
            >
              {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => setLocale(locale === "pt" ? "en" : "pt")}
              className="hidden rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--ink)] sm:inline-flex"
            >
              {locale.toUpperCase()}
            </button>

            <Button
              asChild
              variant="ghost"
              className="hidden text-[var(--muted-foreground)] hover:bg-transparent hover:text-[var(--ink)] md:inline-flex"
            >
              <Link href="/login">{locale === "pt" ? "Entrar" : "Sign in"}</Link>
            </Button>

            <Button asChild className="lp-cta hidden h-9 rounded-md px-4 text-sm sm:inline-flex">
              <Link href="/signup">{locale === "pt" ? "Testar grátis" : "Try free"}</Link>
            </Button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-md p-2 text-[var(--ink)] md:hidden"
              aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen ? (
          <div className="border-t border-[var(--border)] py-4 md:hidden">
            <nav className="flex flex-col gap-3">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-[var(--muted-foreground)] hover:text-[var(--ink)]"
                >
                  {item.label}
                </a>
              ))}
              <div className="flex gap-2 pt-2">
                <Button asChild variant="outline" className="flex-1 rounded-md border-[var(--border)]">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    {locale === "pt" ? "Entrar" : "Sign in"}
                  </Link>
                </Button>
                <Button asChild className="lp-cta flex-1 rounded-md">
                  <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                    {locale === "pt" ? "Testar grátis" : "Try free"}
                  </Link>
                </Button>
              </div>
            </nav>
          </div>
        ) : null}
      </div>
    </header>
  )
}
