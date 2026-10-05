"use client"

import { useEffect, useState } from "react"
import { refreshRuntimeConfig, runtimeSnapshot } from "@/lib/runtimeFlags"

const SEAL_LABEL: Record<string, string> = {
  verificado: "Verificado",
  destaque: "Destaque",
  parceiro: "Parceiro",
}

export function PlatformNoticeBanner() {
  const [notice, setNotice] = useState<{ id: string; title: string; body: string; intervalHours: number } | null>(
    null
  )

  useEffect(() => {
    const pick = () => {
      const list = runtimeSnapshot()?.notices || []
      const now = Date.now()
      const next = list.find((item) => {
        const raw = localStorage.getItem(`wq-notice-dismiss:${item.id}`)
        if (!raw) return true
        if (raw === "forever") return false
        const at = Number(raw)
        if (!Number.isFinite(at)) return true
        const hours = Number(item.intervalHours) || 0
        if (hours <= 0) return false
        return now - at >= hours * 60 * 60 * 1000
      })
      setNotice(
        next
          ? {
              id: next.id,
              title: next.title,
              body: next.body || "",
              intervalHours: Number(next.intervalHours) || 0,
            }
          : null
      )
    }
    pick()
    void refreshRuntimeConfig()
    const onFocus = () => {
      void refreshRuntimeConfig()
    }
    window.addEventListener("wq-runtime-config", pick)
    window.addEventListener("focus", onFocus)
    return () => {
      window.removeEventListener("wq-runtime-config", pick)
      window.removeEventListener("focus", onFocus)
    }
  }, [])

  if (!notice) return null

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--wq-brand)]/30 bg-[var(--wq-brand-soft)] px-3 py-2.5 text-sm text-[var(--wq-text)] sm:px-4">
      <div className="min-w-0">
        <p className="font-semibold">{notice.title}</p>
        {notice.body ? <p className="mt-0.5 text-[var(--wq-text-muted)]">{notice.body}</p> : null}
      </div>
      <button
        type="button"
        className="shrink-0 rounded-lg border border-[var(--wq-border)] bg-[var(--wq-surface)] px-2.5 py-1 text-xs font-medium"
        onClick={() => {
          const hours = notice.intervalHours
          localStorage.setItem(
            `wq-notice-dismiss:${notice.id}`,
            hours > 0 ? String(Date.now()) : "forever"
          )
          setNotice(null)
        }}
      >
        Fechar
      </button>
    </div>
  )
}

export function sealLabel(seal?: string | null) {
  return SEAL_LABEL[String(seal || "")] || ""
}
