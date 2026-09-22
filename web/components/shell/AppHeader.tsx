"use client"

import type { ReactNode } from "react"
import { Search } from "lucide-react"
import { ThemeToggle } from "./ThemeToggle"
import { SystemOkBadge } from "./SystemOkBadge"
import { FeedbackBell } from "./FeedbackBell"
import { cn } from "@/lib/utils"

export function AppHeader({
  title,
  subtitle,
  actions,
  showTheme = true,
  showHealth = true,
  showInbox = true,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
  showTheme?: boolean
  showHealth?: boolean
  showInbox?: boolean
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--wq-border)] bg-[color-mix(in_srgb,var(--wq-paper)_85%,transparent)] backdrop-blur-md">
      <div
        className={cn(
          "mx-auto flex w-full max-w-[1600px] flex-col gap-2.5 px-2.5 py-2.5 sm:gap-3 sm:px-5 sm:py-4 md:flex-row md:items-center md:justify-between md:gap-4 md:px-6 lg:px-8"
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-semibold tracking-tight text-[var(--wq-text)] sm:text-2xl">
              {title}
            </h1>
            {showHealth ? <SystemOkBadge className="hidden sm:inline-flex" /> : null}
          </div>
          {subtitle ? (
            <p className="mt-0.5 line-clamp-2 break-words text-xs text-[var(--wq-text-muted)] sm:text-sm">
              {subtitle}
            </p>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2 md:shrink-0 md:justify-end">
          {showHealth ? <SystemOkBadge className="sm:hidden" /> : null}
          <button
            type="button"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[var(--wq-border)] bg-[var(--wq-surface)] px-2.5 py-2 text-xs text-[var(--wq-text-muted)] hover:bg-[var(--wq-paper)] hover:text-[var(--wq-text)]"
            title="Buscar pedido (⌘K)"
            onClick={() => window.dispatchEvent(new Event("wq-open-order-jump"))}
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Pedido</span>
            <kbd className="hidden rounded border border-[var(--wq-border)] px-1 font-mono text-[10px] md:inline">
              ⌘K
            </kbd>
          </button>
          {showInbox ? <FeedbackBell /> : null}
          {actions}
          {showTheme ? <ThemeToggle compact /> : null}
        </div>
      </div>
    </header>
  )
}
