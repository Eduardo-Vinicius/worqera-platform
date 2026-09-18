"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Check, ExternalLink, Monitor, Tv } from "lucide-react"
import { cn } from "@/lib/utils"

const TV_OPENED_KEY = "wq-tv-opened"

export function markTvOpened() {
  try {
    localStorage.setItem(TV_OPENED_KEY, "1")
    window.dispatchEvent(new Event("wq-tv-opened"))
  } catch {}
}

export function TvLaunchPanel({ className }: { className?: string }) {
  const [opened, setOpened] = useState(false)

  useEffect(() => {
    try {
      setOpened(localStorage.getItem(TV_OPENED_KEY) === "1")
    } catch {}
    const sync = () => {
      try {
        setOpened(localStorage.getItem(TV_OPENED_KEY) === "1")
      } catch {}
    }
    window.addEventListener("wq-tv-opened", sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener("wq-tv-opened", sync)
      window.removeEventListener("storage", sync)
    }
  }, [])

  const onOpen = () => markTvOpened()

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-[var(--wq-brand)]/35 bg-[color-mix(in_srgb,var(--wq-brand)_8%,var(--wq-surface))]",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[var(--wq-brand)]/20 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--wq-brand)]">
            Telas da oficina
          </p>
          <h2 className="mt-0.5 text-base font-semibold text-[var(--wq-text)]">Abrir TVs</h2>
          <p className="mt-0.5 text-xs text-[var(--wq-text-muted)]">
            Cliente = pedidos na sala · Oficina = filas por setor no chão
          </p>
        </div>
        {opened ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
            <Check className="h-3 w-3" />
            Já abriu
          </span>
        ) : (
          <span className="rounded-full bg-[var(--wq-brand)]/15 px-2 py-0.5 text-[11px] font-semibold text-[var(--wq-brand)]">
            Recomendado
          </span>
        )}
      </div>
      <div className="grid gap-2 p-3 sm:grid-cols-2 sm:p-4">
        <Link
          href="/tv"
          target="_blank"
          rel="noopener noreferrer"
          onClick={onOpen}
          className="flex items-start gap-3 rounded-xl border border-[var(--wq-border)] bg-[var(--wq-surface)] px-3.5 py-3 transition hover:border-[var(--wq-brand)]/50"
        >
          <span className="mt-0.5 rounded-lg bg-[var(--wq-brand-soft)] p-2 text-[var(--wq-brand)]">
            <Tv className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--wq-text)]">
              TV Cliente
              <ExternalLink className="h-3 w-3 text-[var(--wq-text-muted)]" />
            </span>
            <span className="mt-0.5 block text-xs text-[var(--wq-text-muted)]">
              Até 8 códigos por tela · gira sozinho
            </span>
          </span>
        </Link>
        <Link
          href="/tv-dashboard"
          target="_blank"
          rel="noopener noreferrer"
          onClick={onOpen}
          className="flex items-start gap-3 rounded-xl border border-[var(--wq-border)] bg-[var(--wq-surface)] px-3.5 py-3 transition hover:border-[var(--wq-brand)]/50"
        >
          <span className="mt-0.5 rounded-lg bg-[var(--wq-brand-soft)] p-2 text-[var(--wq-brand)]">
            <Monitor className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--wq-text)]">
              TV Oficina
              <ExternalLink className="h-3 w-3 text-[var(--wq-text-muted)]" />
            </span>
            <span className="mt-0.5 block text-xs text-[var(--wq-text-muted)]">
              Contagem por setor (filas do kanban)
            </span>
          </span>
        </Link>
      </div>
      <div className="border-t border-[var(--wq-brand)]/15 px-4 py-2 sm:px-5">
        <Link
          href="/settings/tv"
          className="text-xs font-medium text-[var(--wq-brand)] hover:underline"
        >
          Ajustar títulos e quantos pedidos por tela →
        </Link>
      </div>
    </section>
  )
}
