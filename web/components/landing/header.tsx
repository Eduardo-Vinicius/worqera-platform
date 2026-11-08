"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { AnimatePresence, m } from "motion/react"
import { ArrowRight, Menu, Moon, Sun, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WorqeraLogo } from "@/components/brand/WorqeraLogo"
import { useLanguage } from "@/components/landing/language-provider"
import { useLpTheme } from "@/components/landing/use-lp-theme"
import { cn } from "@/lib/utils"

const SECTIONS = ["produto", "como-funciona", "ramos", "pricing", "faq"] as const

/** Which home section is in the middle of the screen. */
function useActiveSection(enabled: boolean) {
  const [active, setActive] = useState<string | null>(null)
  useEffect(() => {
    if (!enabled) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id)
      },
      { rootMargin: "-45% 0px -50% 0px" }
    )
    for (const id of SECTIONS) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [enabled])
  return active
}

export function Header() {
  const { locale, setLocale, t } = useLanguage()
  const { dark, toggleTheme } = useLpTheme()
  const home = usePathname() === "/"
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const active = useActiveSection(home)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  const anchor = (id: string) => (home ? `#${id}` : `/#${id}`)
  const navItems = [
    { id: "produto", label: t.nav.product, href: anchor("produto") },
    { id: "como-funciona", label: t.nav.how, href: anchor("como-funciona") },
    { id: "ramos", label: t.nav.trades, href: anchor("ramos") },
    { id: "pricing", label: t.nav.pricing, href: anchor("pricing") },
    { id: "faq", label: t.nav.faq, href: anchor("faq") },
    { id: "recursos", label: t.nav.features, href: "/recursos" },
  ]

  return (
    <>
      <header className="sticky top-0 z-50 h-16">
        <div
          className={cn(
            "mx-auto flex items-center justify-between border transition-all duration-300 ease-out",
            scrolled
              ? "lp-glass mt-2 h-12 max-w-5xl rounded-2xl border-[var(--border)] px-3 shadow-[0_18px_50px_-30px_rgba(49,16,102,0.55)] sm:px-4"
              : "mt-0 h-16 max-w-6xl rounded-none border-transparent px-4 sm:px-6"
          )}
        >
          <Link href="/" className="flex items-center gap-2.5" aria-label="Worqera">
            <WorqeraLogo className="h-7 w-7" />
            <span className="lp-display text-lg font-semibold text-[var(--ink)]">Worqera</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => {
              const isActive = active === item.id
              return (
                <a
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "relative isolate rounded-full px-3 py-1.5 text-sm transition-colors",
                    isActive ? "text-[var(--ink)]" : "text-[var(--muted-foreground)] hover:text-[var(--ink)]"
                  )}
                >
                  {isActive ? (
                    <m.span
                      layoutId="lp-nav-pill"
                      className="absolute inset-0 -z-10 rounded-full bg-[var(--brand-soft)]"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  ) : null}
                  {item.label}
                </a>
              )
            })}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] transition hover:border-[var(--primary)]"
              aria-label={dark ? t.nav.light : t.nav.dark}
            >
              <AnimatePresence mode="wait" initial={false}>
                <m.span
                  key={dark ? "sun" : "moon"}
                  initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.2 }}
                >
                  {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                </m.span>
              </AnimatePresence>
            </button>
            <button
              type="button"
              onClick={() => setLocale(locale === "pt" ? "en" : "pt")}
              className="hidden h-8 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--ink)] sm:inline-flex sm:items-center"
            >
              {locale === "pt" ? "EN" : "PT"}
            </button>
            <Button
              asChild
              variant="ghost"
              className="hidden h-9 text-[var(--muted-foreground)] hover:bg-transparent hover:text-[var(--ink)] md:inline-flex"
            >
              <Link href="/login">{t.nav.signIn}</Link>
            </Button>
            <Button asChild className="lp-cta lp-shine hidden h-9 rounded-full px-4 text-sm sm:inline-flex">
              <Link href="/signup">{t.nav.tryFree}</Link>
            </Button>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-full p-2 text-[var(--ink)] lg:hidden"
              aria-label={t.nav.openMenu}
              aria-expanded={open}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open ? (
          <m.div
            key="menu"
            className="lp-glass fixed inset-0 z-[80] flex flex-col lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex h-16 items-center justify-between px-4">
              <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-2.5">
                <WorqeraLogo className="h-7 w-7" />
                <span className="lp-display text-lg font-semibold text-[var(--ink)]">Worqera</span>
              </Link>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 text-[var(--ink)]" aria-label={t.nav.closeMenu}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <m.nav
              className="flex flex-1 flex-col gap-1 overflow-y-auto px-6 pt-6"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } } }}
            >
              {navItems.map((item) => (
                <m.a
                  key={item.id}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
                  className="lp-display flex items-center justify-between border-b border-[var(--border)] py-4 text-2xl font-semibold text-[var(--ink)]"
                >
                  {item.label}
                  <ArrowRight className="h-5 w-5 text-[var(--muted-foreground)]" />
                </m.a>
              ))}
              <m.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }} className="flex gap-2 pt-6">
                <button
                  type="button"
                  onClick={() => setLocale(locale === "pt" ? "en" : "pt")}
                  className="rounded-full border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted-foreground)]"
                >
                  {locale === "pt" ? "English" : "Português"}
                </button>
              </m.div>
            </m.nav>
            <div className="grid grid-cols-2 gap-2 border-t border-[var(--border)] px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Button asChild variant="outline" className="h-12 rounded-full border-[var(--border)] bg-[var(--surface)] text-[var(--ink)]">
                <Link href="/login" onClick={() => setOpen(false)}>
                  {t.nav.signIn}
                </Link>
              </Button>
              <Button asChild className="lp-cta h-12 rounded-full">
                <Link href="/signup" onClick={() => setOpen(false)}>
                  {t.nav.tryFree}
                </Link>
              </Button>
            </div>
          </m.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
