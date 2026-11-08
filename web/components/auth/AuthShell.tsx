"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { WorqeraLogo } from "@/components/brand/WorqeraLogo"
import "@/components/landing/landing.css"

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Worqera"
const CHIPS = ["Sem cartão", "Pronto em minutos", "Cancele quando quiser"]

function Aurora() {
  return (
    <div className="lp-aurora" aria-hidden>
      <div className="lp-blob lp-blob-a" />
      <div className="lp-blob lp-blob-b" />
      <div className="lp-blob lp-blob-c" />
    </div>
  )
}

function BrandMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <Link href="/" className="relative flex items-center gap-2.5">
      <WorqeraLogo className={className} />
      <span className="lp-display text-lg font-semibold text-[var(--ink)]">{APP_NAME}</span>
    </Link>
  )
}

/** Static kanban slice — no LiveStage, just the look of a queue. */
function QueueMock() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        <span className="flex gap-1" aria-hidden>
          <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
          <span className="h-2 w-2 rounded-full bg-[#febc2e]" />
          <span className="h-2 w-2 rounded-full bg-[#28c840]" />
        </span>
        <span className="lp-mono truncate text-[11px] text-[var(--muted-foreground)]">app.worqera.com/kanban</span>
      </div>
      <div className="grid grid-cols-3 gap-2 bg-[var(--mock-bg)] p-2.5">
        {[
          { name: "Recebido", cards: ["#0412"] },
          { name: "Produção", cards: ["#0048", "#0409"] },
          { name: "Pronto", cards: ["#0390"] },
        ].map((col) => (
          <div key={col.name} className="min-h-[140px] rounded-xl bg-[var(--mock-col)] p-2">
            <p className="truncate px-0.5 text-[10px] font-semibold tracking-[0.1em] text-[var(--muted-foreground)] uppercase">
              {col.name}
            </p>
            {col.cards.map((code) => (
              <div
                key={code}
                className={`mt-2 rounded-lg border bg-[var(--surface)] p-2 ${code === "#0048" ? "border-[var(--primary)]/50 ring-2 ring-[var(--primary)]/20" : "border-[var(--border)]"}`}
              >
                <p className="lp-mono text-[11px] font-semibold text-[var(--primary)]">{code}</p>
                <span className="mt-1.5 block h-1.5 w-3/4 rounded-full bg-[var(--muted)]" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

const field =
  "h-12 rounded-xl border-[var(--border)] bg-[var(--paper)] text-[var(--ink)] placeholder:text-[var(--muted-foreground)] focus-visible:ring-[var(--primary)]"

/** Shared look with the marketing site. `aside` is the brand column (login only). */
export function AuthShell({
  children,
  aside = false,
}: {
  children: ReactNode
  aside?: boolean
}) {
  return (
    <div className="lp relative min-h-screen w-full overflow-x-clip bg-[var(--paper)] text-[var(--ink)] antialiased">
      {aside ? (
        <div className="grid min-h-screen w-full grid-cols-1 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <aside className="lp-hero-wash relative hidden min-w-0 overflow-hidden border-r border-[var(--border)] lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-14">
            <Aurora />
            <BrandMark className="h-9 w-9" />
            <div className="relative max-w-md space-y-5">
              <h2 className="lp-display text-balance text-4xl leading-[1.08] font-semibold tracking-tight xl:text-[2.75rem]">
                Do balcão à entrega,{" "}
                <span className="lp-gradient-text">cada pedido no lugar certo.</span>
              </h2>
              <p className="max-w-sm text-base leading-relaxed text-[var(--muted-foreground)]">
                Kanban por setor, cliente avisado sozinho, 7 dias grátis sem cartão.
              </p>
              <ul className="flex flex-wrap gap-2">
                {CHIPS.map((chip) => (
                  <li
                    key={chip}
                    className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--ink)]"
                  >
                    {chip}
                  </li>
                ))}
              </ul>
              <div className="hidden xl:block">
                <QueueMock />
              </div>
            </div>
            <p className="relative text-xs text-[var(--muted-foreground)]">
              © {new Date().getFullYear()} {APP_NAME}. Todos os direitos reservados.
            </p>
          </aside>
          <div className="relative flex min-w-0 w-full max-w-[100vw] flex-col items-center justify-center px-5 py-10 sm:px-10">
            <Aurora />
            <div className="relative mb-8 flex w-full max-w-sm min-w-0 items-center gap-2.5 lg:hidden">
              <BrandMark />
            </div>
            <div className="relative w-full max-w-sm min-w-0 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-lg)] sm:p-8">
              {children}
            </div>
          </div>
        </div>
      ) : (
        <div className="relative flex min-h-screen w-full flex-col items-center justify-center px-5 py-12">
          <Aurora />
          <div className="relative mb-8">
            <BrandMark className="h-9 w-9" />
          </div>
          <div className="relative w-full max-w-sm min-w-0 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-lg)] sm:p-8">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

export { field as authFieldClass }
