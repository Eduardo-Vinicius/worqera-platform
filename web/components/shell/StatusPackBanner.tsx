"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { MessageCircle, QrCode } from "lucide-react"
import { getShopCurrentV1 } from "@/lib/apiV1"
import { ENABLE_WA_ME } from "@/lib/featureFlags"

/**
 * Soft CTA: Status Pack (consulta + Zap) — productized Loop do Cliente.
 * Hidden while ENABLE_WA_ME is false.
 */
export function StatusPackBanner() {
  const [show, setShow] = useState(false)
  const [slug, setSlug] = useState("")

  useEffect(() => {
    if (!ENABLE_WA_ME) {
      setShow(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        if (localStorage.getItem("wq-status-pack-banner-dismiss") === "1") return
        const shop = await getShopCurrentV1()
        const doc = shop?.shop || shop
        const waOn = Boolean(doc?.notifications?.whatsapp?.enabled)
        if (cancelled) return
        setSlug(String(doc?.slug || ""))
        setShow(!waOn)
      } catch {
        // ignore
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!ENABLE_WA_ME || !show) return null

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-[var(--wq-brand)]/30 bg-[var(--wq-brand-soft)]/50 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--wq-brand)]">
          Status Pack
        </p>
        <p className="mt-0.5 text-sm font-semibold text-[var(--wq-text)]">
          Ative o pacote “cliente para de ligar”
        </p>
        <p className="mt-0.5 text-xs text-[var(--wq-text-muted)]">
          Etiqueta + QR + consulta pública
          {slug ? ` (/p/${slug}/código?t=…)` : ""} + WhatsApp no create/move/pronto.
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Link
          href="/settings/empresa"
          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--wq-brand)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--wq-brand-deep)]"
        >
          <MessageCircle className="h-4 w-4" />
          Ativar WhatsApp
        </Link>
        <Link
          href="/pedidos/novo"
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--wq-border)] bg-[var(--wq-surface)] px-3 py-2 text-sm font-medium text-[var(--wq-text)]"
        >
          <QrCode className="h-4 w-4" />
          Criar + etiqueta
        </Link>
        <button
          type="button"
          className="rounded-xl px-2 py-2 text-xs text-[var(--wq-text-muted)] hover:underline"
          onClick={() => {
            try {
              localStorage.setItem("wq-status-pack-banner-dismiss", "1")
            } catch {}
            setShow(false)
          }}
        >
          Depois
        </button>
      </div>
    </section>
  )
}
