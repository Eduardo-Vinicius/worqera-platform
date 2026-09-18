"use client"

import { useEffect, useState } from "react"
import { getApiHealthV1 } from "@/lib/apiV1"
import { cn } from "@/lib/utils"

export function SystemOkBadge({ className }: { className?: string }) {
  const [status, setStatus] = useState<"ok" | "down" | "checking">("checking")

  useEffect(() => {
    let cancelled = false
    const ping = async () => {
      const res = await getApiHealthV1()
      if (cancelled) return
      setStatus(res.ok && res.ready !== false ? "ok" : "down")
    }
    ping()
    const id = setInterval(ping, 60_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        status === "ok" && "border-emerald-200 bg-emerald-50 text-emerald-800",
        status === "down" && "border-amber-200 bg-amber-50 text-amber-900",
        status === "checking" && "border-[var(--wq-border)] text-[var(--wq-text-muted)]",
        className
      )}
      title={
        status === "ok"
          ? "API e Mongo respondendo"
          : status === "down"
            ? "API indisponível — verifique o servidor"
            : "Checando…"
      }
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "ok" && "bg-emerald-500",
          status === "down" && "bg-amber-500",
          status === "checking" && "bg-[var(--wq-text-muted)]"
        )}
      />
      {status === "ok" ? "Sistema ok" : status === "down" ? "Sistema" : "…"}
    </span>
  )
}
