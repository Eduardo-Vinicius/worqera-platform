import Link from "next/link"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  secondary,
  className,
  icon,
}: {
  title: string
  description?: string
  actionHref?: string
  actionLabel?: string
  secondary?: ReactNode
  className?: string
  icon?: ReactNode
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--wq-border)] bg-[var(--wq-surface)] px-4 py-10 text-center sm:px-8 sm:py-14",
        className
      )}
    >
      {icon ? <div className="mb-4 text-[var(--wq-brand)]">{icon}</div> : null}
      <h3 className="text-base font-semibold text-[var(--wq-text)] sm:text-lg">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--wq-text-muted)]">
          {description}
        </p>
      ) : null}
      {actionHref && actionLabel ? (
        <Button asChild className="mt-5 rounded-xl">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
      {secondary ? <div className="mt-3">{secondary}</div> : null}
    </div>
  )
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-14 animate-pulse rounded-xl border border-[var(--wq-border)] bg-[var(--wq-surface)]"
        />
      ))}
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="space-y-4 p-4 sm:p-6" aria-busy>
      <div className="h-8 w-40 animate-pulse rounded-lg bg-[var(--wq-border)]" />
      <div className="h-4 w-64 max-w-full animate-pulse rounded bg-[var(--wq-border)]/70" />
      <ListSkeleton rows={6} />
    </div>
  )
}
