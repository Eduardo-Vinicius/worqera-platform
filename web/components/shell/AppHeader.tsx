"use client"

import type { ReactNode } from "react"
import { ThemeToggle } from "./ThemeToggle"

export function AppHeader({
  title,
  subtitle,
  actions,
  showTheme = true,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
  showTheme?: boolean
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--wq-border)] bg-[color-mix(in_srgb,var(--wq-paper)_85%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-6 py-4 md:px-8">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight text-[var(--wq-text)]">
            {title}
          </h1>
          {subtitle ? <p className="mt-0.5 text-sm text-[var(--wq-text-muted)]">{subtitle}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          {showTheme ? <ThemeToggle compact /> : null}
        </div>
      </div>
    </header>
  )
}
