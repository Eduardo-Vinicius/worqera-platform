"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronDown, Copy, ExternalLink, PlayCircle, Settings2, Tv } from "lucide-react"
import { toast } from "sonner"
import { copyTvLink, markTvOpened, visibleScreens, type TvScreen } from "./tvScreens"
import { cn } from "@/lib/utils"

/** "Telas da loja" in the top bar of every page: open or copy the link of each TV dashboard. */
export function TvLauncher() {
  const [open, setOpen] = useState(false)
  const [screens, setScreens] = useState<TvScreen[]>([])
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setScreens(visibleScreens(localStorage.getItem("role") || ""))
  }, [])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  if (!screens.length) return null

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-semibold transition",
          open
            ? "border-[var(--wq-brand)] bg-[var(--wq-brand-soft)] text-[var(--wq-text)]"
            : "border-[var(--wq-border)] bg-[var(--wq-surface)] text-[var(--wq-text-muted)] hover:bg-[var(--wq-paper)] hover:text-[var(--wq-text)]"
        )}
        title="Telas da loja (TVs)"
      >
        <Tv className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Telas da loja</span>
        <ChevronDown className={cn("hidden h-3 w-3 transition sm:block", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-[min(92vw,22rem)] overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <p className="border-b border-[var(--wq-border)] px-4 py-2.5 text-xs text-[var(--wq-text-muted)]">
            Abra na TV da loja (navegador da TV) e entre com a conta da loja. Ou copie o link.
          </p>
          <ul className="divide-y divide-[var(--wq-border)]">
            {screens.map((s) => {
              const Icon = s.icon
              return (
                <li key={s.href} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--wq-brand-soft)] text-[var(--wq-brand)]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[var(--wq-text)]">{s.label}</span>
                    <span className="block text-[11px] leading-snug text-[var(--wq-text-muted)]">{s.hint}</span>
                  </span>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-[var(--wq-text-muted)] hover:bg-[var(--wq-paper)] hover:text-[var(--wq-text)]"
                    title="Copiar link"
                    aria-label={`Copiar link da ${s.label}`}
                    onClick={async () => {
                      const url = await copyTvLink(s.href)
                      toast.success(`Link copiado: ${url}`)
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <Link
                    href={s.href}
                    target="_blank"
                    onClick={() => {
                      markTvOpened()
                      setOpen(false)
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-[var(--wq-brand)] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[var(--wq-brand-deep)]"
                  >
                    Abrir
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </li>
              )
            })}
          </ul>
          <div className="flex items-center justify-between gap-2 border-t border-[var(--wq-border)] bg-[var(--wq-paper)] px-4 py-2.5 text-xs">
            <Link href="/tv?demo=1" target="_blank" className="inline-flex items-center gap-1 font-semibold text-[var(--wq-brand-text)] hover:underline" onClick={() => setOpen(false)}>
              <PlayCircle className="h-3.5 w-3.5" />
              Ver demonstração
            </Link>
            <Link href="/settings/tv" className="inline-flex items-center gap-1 text-[var(--wq-text-muted)] hover:text-[var(--wq-text)]" onClick={() => setOpen(false)}>
              <Settings2 className="h-3.5 w-3.5" />
              Configurar
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}
