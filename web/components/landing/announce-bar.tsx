"use client"

import Link from "next/link"
import { ArrowRight, X } from "lucide-react"
import { useLanguage } from "@/components/landing/language-provider"

/** Thin offer strip above the header. Closing it is remembered; `LpThemeScript` hides it before paint. */
export function AnnounceBar() {
  const { t } = useLanguage()

  const close = () => {
    try {
      localStorage.setItem("wq-lp-announce", "closed")
    } catch {}
    document.documentElement.dataset.lpAnnounce = "closed"
  }

  return (
    <div className="lp-announce relative overflow-hidden bg-[var(--band)] text-[var(--on-band)]">
      <div className="lp-announce-text mx-auto flex h-9 max-w-6xl items-center justify-center gap-3 px-10 text-[13px]">
        <p className="truncate">
          <span className="font-semibold">
            {t.announce.lead}
            <span className="lp-glint">{t.announce.glint}</span>
          </span>
          <span className="text-[var(--on-band)]/75">{t.announce.rest}</span>
        </p>
        <Link
          href="/signup"
          className="hidden shrink-0 items-center gap-1 font-semibold text-[#c4b5fd] hover:text-white sm:inline-flex"
        >
          {t.announce.cta}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <button
        type="button"
        onClick={close}
        aria-label={t.announce.close}
        className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-[var(--on-band)]/60 hover:text-white"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
