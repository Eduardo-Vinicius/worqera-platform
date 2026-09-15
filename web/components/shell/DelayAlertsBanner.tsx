"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { listDelayAlertsV1, sendDelayDigestV1 } from "@/lib/apiV1"
import { toast } from "sonner"
import { X } from "lucide-react"

function isOwner() {
  if (typeof window === "undefined") return false
  const role = String(localStorage.getItem("role") || "").toLowerCase()
  return role === "owner"
}

export function DelayAlertsBanner() {
  const [total, setTotal] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const [sending, setSending] = useState(false)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    setAllowed(isOwner())
  }, [])

  useEffect(() => {
    if (!allowed) return
    let cancelled = false
    ;(async () => {
      try {
        if (sessionStorage.getItem("wq-delay-banner-dismissed") === "1") {
          if (!cancelled) setDismissed(true)
          return
        }
        const res = await listDelayAlertsV1()
        if (!cancelled) setTotal(Number(res?.total) || 0)
      } catch {
        // optional banner
      }
    })()
    return () => {
      cancelled = true
    }
  }, [allowed])

  if (!allowed || dismissed || total <= 0) return null

  const sendDigest = async () => {
    setSending(true)
    try {
      const res = await sendDelayDigestV1()
      toast.success(
        res.sent > 0
          ? `Digest enviado (${res.sent} destinatário${res.sent === 1 ? "" : "s"})`
          : "Nenhum e-mail enviado"
      )
    } catch (err: any) {
      toast.error(err?.message || "Falha ao enviar digest")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-amber-200/80 bg-amber-50 px-4 py-2.5 text-sm text-amber-950 md:px-6">
      <p className="min-w-0">
        {total} pedido{total === 1 ? "" : "s"} em atraso.{" "}
        <Link
          href="/admin/metrics"
          className="font-semibold text-amber-800 underline-offset-2 hover:underline"
        >
          Ver métricas →
        </Link>
      </p>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          disabled={sending}
          onClick={sendDigest}
          className="rounded-lg px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-white/60 disabled:opacity-60"
        >
          {sending ? "Enviando…" : "Enviar digest"}
        </button>
        <button
          type="button"
          aria-label="Dispensar"
          className="rounded-lg p-1 text-amber-700/70 hover:bg-white/50"
          onClick={() => {
            sessionStorage.setItem("wq-delay-banner-dismissed", "1")
            setDismissed(true)
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
