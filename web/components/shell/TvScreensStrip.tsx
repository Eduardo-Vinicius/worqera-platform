"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ExternalLink, PlayCircle } from "lucide-react"
import { markTvOpened, visibleScreens, type TvScreen } from "./tvScreens"

/** Home: the shop's TV dashboards, one tap away. */
export function TvScreensStrip() {
  const [screens, setScreens] = useState<TvScreen[]>([])

  useEffect(() => {
    setScreens(visibleScreens(localStorage.getItem("role") || ""))
  }, [])

  if (!screens.length) return null

  return (
    <section className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-3 sm:p-4" aria-label="Telas da loja">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--wq-text-muted)]">Telas da loja</p>
        <Link href="/tv?demo=1" target="_blank" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--wq-brand-text)] hover:underline">
          <PlayCircle className="h-3.5 w-3.5" />
          Ver demonstração
        </Link>
      </div>
      <div className={`grid gap-2 ${screens.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {screens.map((s) => {
          const Icon = s.icon
          return (
            <Link
              key={s.href}
              href={s.href}
              target="_blank"
              onClick={markTvOpened}
              className="group flex items-center gap-3 rounded-xl border border-[var(--wq-border)] bg-[var(--wq-paper)] px-3 py-2.5 transition hover:-translate-y-0.5 hover:border-[var(--wq-brand)]/50 hover:shadow-md"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--wq-ink)] text-white">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[var(--wq-text)]">{s.label}</span>
                <span className="block truncate text-xs text-[var(--wq-text-muted)]">{s.hint}</span>
              </span>
              <ExternalLink className="h-4 w-4 shrink-0 text-[var(--wq-text-muted)] transition group-hover:text-[var(--wq-brand)]" />
            </Link>
          )
        })}
      </div>
    </section>
  )
}
