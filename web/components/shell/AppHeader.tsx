"use client"

import type { ReactNode } from "react"
import { ThemeToggle } from "./ThemeToggle"
import { SystemOkBadge } from "./SystemOkBadge"
import { cn } from "@/lib/utils"

export function AppHeader({
  title,
  subtitle,
  actions,
  showTheme = true,
  showHealth = true,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
  showTheme?: boolean
  showHealth?: boolean
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--wq-border)] bg-[color-mix(in_srgb,var(--wq-paper)_85%,transparent)] backdrop-blur-md">
      <div
        className={cn(
          "mx-auto flex max-w-[1320px] flex-col gap-3 px-3 py-3 sm:px-5 sm:py-4 md:flex-row md:items-center md:justify-between md:gap-4 md:px-8"
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-semibold tracking-tight text-[var(--wq-text)] sm:text-2xl">
              {title}
            </h1>
            {showHealth ? <SystemOkBadge className="hidden sm:inline-flex" /> : null}
          </div>
          {subtitle ? (
            <p className="mt-0.5 line-clamp-2 break-words text-sm text-[var(--wq-text-muted)]">
              {subtitle}
            </p>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2 md:shrink-0 md:justify-end">
          {showHealth ? <SystemOkBadge className="sm:hidden" /> : null}
          {actions}
          {showTheme ? <ThemeToggle compact /> : null}
        </div>
      </div>
    </header>
  )
}
