"use client"

import type { ReactNode } from "react"
import { AppHeader } from "@/components/shell/AppHeader"
import { cn } from "@/lib/utils"

/** Shell of a Worqera admin screen: header plus the centered content column. */
export function AdminPage({
  title,
  subtitle,
  actions,
  width = "max-w-[1600px]",
  children,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
  width?: string
  children: ReactNode
}) {
  return (
    <div className="-mx-2.5 -mt-3 sm:-mx-5 sm:-mt-5 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-6">
      <AppHeader title={title} subtitle={subtitle} showInbox={false} showOrderJump={false} actions={actions} />
      <div className={cn("mx-auto w-full space-y-4 px-2.5 py-4 sm:px-5 md:px-6 lg:px-8", width)}>{children}</div>
    </div>
  )
}

export function AdminPanel({ title, hint, action, children, className }: { title: string; hint?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]", className)}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--wq-border)] px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          {hint ? <p className="text-xs text-[var(--wq-text-muted)]">{hint}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}

export const CLIENT_LABEL: Record<string, string> = { web: "Site", android: "App Android", ios: "App iOS", admin: "Admin", api: "API" }

export const when = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"
