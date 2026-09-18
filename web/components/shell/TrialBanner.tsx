"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { getSubscriptionV1 } from "@/lib/apiV1"
import { X } from "lucide-react"

function daysLeft(iso?: string | null) {
  if (!iso) return null
  const end = new Date(iso).getTime()
  if (Number.isNaN(end)) return null
  return Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24))
}

export function TrialBanner() {
  const [message, setMessage] = useState<string | null>(null)
  const [href, setHref] = useState("/billing")
  const [dismissed, setDismissed] = useState(false)
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await getSubscriptionV1()
        const sub = res?.subscription || res
        if (!sub || cancelled) return

        const status = String(sub.status || "")
        const left = daysLeft(sub.trialEndsAt)
        const isLocked =
          status === "expired" ||
          status === "canceled" ||
          status === "past_due" ||
          (status === "trialing" && left != null && left <= 0)

        setLocked(isLocked)

        if (!isLocked && sessionStorage.getItem("wq-trial-banner-dismissed") === "1") {
          setDismissed(true)
          return
        }

        if (status === "trialing" && left != null) {
          if (left <= 0) {
            setMessage("Trial expirado — o sistema está bloqueado até assinar.")
          } else if (left <= 3) {
            setMessage(`Trial acaba em ${left} dia${left === 1 ? "" : "s"}.`)
          } else {
            setMessage(`Trial ativo · ${left} dias restantes`)
          }
          setHref("/billing")
        } else if (status === "expired" || status === "canceled" || status === "past_due") {
          setMessage("Assinatura inativa. Só billing e login estão liberados.")
          setHref("/billing")
        }
      } catch {
        // silent — banner is optional
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (dismissed || !message) return null

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2 text-sm sm:gap-3 sm:px-4 sm:py-2.5 md:px-6 ${
        locked
          ? "border-red-200 bg-red-50 text-red-950"
          : "border-[var(--wq-brand)]/20 bg-[var(--wq-brand-soft)] text-[var(--wq-text)]"
      }`}
    >
      <p className="min-w-0 flex-1 break-words">
        {message}{" "}
        <Link
          href={href}
          className={`font-semibold underline-offset-2 hover:underline ${
            locked ? "text-red-700" : "text-[var(--wq-brand)]"
          }`}
        >
          Regularizar →
        </Link>
      </p>
      {!locked && (
        <button
          type="button"
          aria-label="Dispensar"
          className="rounded-lg p-1 text-[var(--wq-text-muted)] hover:bg-white/50"
          onClick={() => {
            sessionStorage.setItem("wq-trial-banner-dismissed", "1")
            setDismissed(true)
          }}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
