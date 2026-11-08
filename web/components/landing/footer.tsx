"use client"

import Link from "next/link"
import { useEffect, useState, type ReactNode } from "react"
import { AnimatePresence, m, useMotionValueEvent, useScroll } from "motion/react"
import { ArrowUp, MessageCircle, Moon, Sun, X } from "lucide-react"
import { WorqeraLogo } from "@/components/brand/WorqeraLogo"
import { useLanguage } from "@/components/landing/language-provider"
import { useLpTheme } from "@/components/landing/use-lp-theme"
import { getFeature, type FeatureSlug } from "@/components/landing/features-data"
import { getTradePage, TRADE_SLUGS } from "@/components/landing/trades-data"
import { WA_MESSAGES, waLink } from "@/components/landing/contact"

const FOOTER_FEATURES: FeatureSlug[] = ["kanban", "orcamentos", "whatsapp", "financeiro", "ia"]
const BUBBLE_KEY = "wq-lp-fab-bubble"

/** WhatsApp button that springs in after a third of the page, with a one-time hint per session. */
export function WhatsAppFab() {
  const { locale, t } = useLanguage()
  const { scrollYProgress } = useScroll()
  const [visible, setVisible] = useState(false)
  const [bubble, setBubble] = useState(false)

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    if (value > 0.3 && !visible) setVisible(true)
  })

  useEffect(() => {
    if (!visible) return
    try {
      if (sessionStorage.getItem(BUBBLE_KEY)) return
      sessionStorage.setItem(BUBBLE_KEY, "1")
    } catch {}
    const show = window.setTimeout(() => setBubble(true), 1200)
    const hide = window.setTimeout(() => setBubble(false), 7200)
    return () => {
      window.clearTimeout(show)
      window.clearTimeout(hide)
    }
  }, [visible])

  return (
    <AnimatePresence>
      {visible ? (
        <m.div
          className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex items-end gap-2"
          initial={{ opacity: 0, scale: 0.6, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6 }}
          transition={{ type: "spring", stiffness: 420, damping: 22 }}
        >
          <AnimatePresence>
            {bubble ? (
              <m.div
                className="mb-1.5 flex items-center gap-2 rounded-2xl rounded-br-sm border border-[var(--border)] bg-[var(--surface)] py-2 pr-2 pl-3 text-sm font-medium text-[var(--ink)] shadow-[var(--shadow-lg)]"
                initial={{ opacity: 0, x: 12, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 12, scale: 0.9 }}
              >
                {t.fab.bubble}
                <button type="button" onClick={() => setBubble(false)} aria-label={t.fab.close} className="rounded-full p-1 text-[var(--muted-foreground)] hover:text-[var(--ink)]">
                  <X className="h-3.5 w-3.5" />
                </button>
              </m.div>
            ) : null}
          </AnimatePresence>
          <a
            href={waLink(WA_MESSAGES.general[locale])}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp"
            className="lp-wa inline-flex h-12 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition hover:scale-105"
          >
            <MessageCircle className="h-5 w-5" strokeWidth={2} />
            <span className="pr-0.5">{t.fab.label}</span>
          </a>
        </m.div>
      ) : null}
    </AnimatePresence>
  )
}

function Col({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-[var(--ink)] uppercase">{title}</p>
      {children}
    </div>
  )
}

const LINK = "w-fit text-[var(--muted-foreground)] transition hover:text-[var(--ink)]"

export function Footer() {
  const { locale, setLocale, t } = useLanguage()
  const { dark, toggleTheme } = useLpTheme()
  const pt = locale === "pt"

  return (
    <footer className="relative border-t border-[var(--border)] bg-[var(--surface)] pt-14 pb-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,3fr)]">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <WorqeraLogo className="h-8 w-8" />
              <span className="lp-display text-xl font-semibold text-[var(--ink)]">Worqera</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-[var(--muted-foreground)]">{t.footer.tagline}</p>
            <p className="mt-3 text-xs text-[var(--muted-foreground)]">{t.pricing.trust}</p>
            <div className="mt-5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLocale(pt ? "en" : "pt")}
                className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--ink)]"
                aria-label={t.footer.language}
              >
                {pt ? "English" : "Português"}
              </button>
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--ink)]"
                aria-label={t.footer.theme}
              >
                {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                {dark ? t.nav.light : t.nav.dark}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-10 text-sm sm:grid-cols-4">
            <Col title={t.footer.product}>
              <Link href="/recursos" className={LINK}>
                {t.footer.allFeatures}
              </Link>
              {FOOTER_FEATURES.map((slug) => (
                <Link key={slug} href={`/recursos/${slug}`} className={LINK}>
                  {getFeature(slug, locale).name}
                </Link>
              ))}
              <Link href="/#pricing" className={LINK}>
                {t.nav.pricing}
              </Link>
            </Col>
            <Col title={t.footer.trades}>
              {TRADE_SLUGS.map((slug) => (
                <Link key={slug} href={`/${slug}`} className={LINK}>
                  {getTradePage(slug, locale).trade}
                </Link>
              ))}
            </Col>
            <Col title={t.footer.company}>
              <Link href="/signup" className={LINK}>
                {t.nav.tryFree}
              </Link>
              <Link href="/login" className={LINK}>
                {t.nav.signIn}
              </Link>
              <a href={waLink(WA_MESSAGES.general[locale])} target="_blank" rel="noopener noreferrer" className={LINK}>
                WhatsApp
              </a>
              <p className="text-[var(--muted-foreground)]">{t.footer.madeBy}</p>
            </Col>
            <Col title={t.footer.legal}>
              <Link href="/privacidade" className={LINK}>
                {t.footer.privacy}
              </Link>
              <Link href="/excluir-conta" className={LINK}>
                {t.footer.deleteAccount}
              </Link>
            </Col>
          </div>
        </div>

        <div className="mt-12 flex flex-col-reverse items-start justify-between gap-4 border-t border-[var(--border)] pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-[var(--muted-foreground)]">
            © {new Date().getFullYear()} Worqera. {t.footer.rights}
          </p>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="group inline-flex items-center gap-2 text-xs font-semibold text-[var(--muted-foreground)] hover:text-[var(--ink)]"
          >
            {t.footer.back}
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] transition group-hover:-translate-y-0.5 group-hover:border-[var(--primary)]">
              <ArrowUp className="h-3.5 w-3.5" />
            </span>
          </button>
        </div>
      </div>
    </footer>
  )
}
