"use client"

import { useEffect, useState } from "react"
import { getShopCurrentV1 } from "@/lib/apiV1"
import { toast } from "sonner"
import { Copy, Gift } from "lucide-react"

export function ReferralCard() {
  const [code, setCode] = useState("")
  const [url, setUrl] = useState("")

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const shop = await getShopCurrentV1()
        const doc = shop?.shop || shop
        const partner = String(doc?.partnerCode || "").trim()
        if (!partner || cancelled) return
        const origin = typeof window !== "undefined" ? window.location.origin : "https://worqera.com"
        setCode(partner)
        setUrl(`${origin}/signup?ref=${encodeURIComponent(partner)}`)
      } catch {
        // optional
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!code || !url) return null

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Link de indicação copiado")
    } catch {
      toast.message(url)
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-[var(--wq-border)] bg-[var(--wq-surface)] px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--wq-text)]">
            <Gift className="h-3.5 w-3.5 text-[var(--wq-brand)]" />
            Indique e ganhe
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-[var(--wq-text-muted)]">
            1 mês grátis quando a oficina indicada assinar
          </p>
        </div>
        <button
          type="button"
          onClick={copy}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-[var(--wq-brand)] hover:bg-[var(--wq-paper)]"
        >
          <Copy className="h-3 w-3" />
          Copiar
        </button>
      </div>
    </div>
  )
}
