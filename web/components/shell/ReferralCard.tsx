"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
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
    <section className="rounded-2xl border border-[var(--wq-brand)]/25 bg-[color-mix(in_srgb,var(--wq-brand)_8%,var(--wq-surface))] px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--wq-brand)]">
            <Gift className="h-3.5 w-3.5" />
            Indique e ganhe
          </p>
          <h3 className="mt-1 text-sm font-semibold text-[var(--wq-text)] sm:text-base">
            1 mês grátis quando a oficina indicada assinar
          </h3>
          <p className="mt-1 break-all font-mono text-xs text-[var(--wq-text-muted)]">{url}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 rounded-[10px]"
          onClick={copy}
        >
          <Copy className="mr-1.5 h-4 w-4" />
          Copiar link
        </Button>
      </div>
    </section>
  )
}
