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
  const [urgent, setUrgent] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (localStorage.getItem("platformAdmin") === "1" && !localStorage.getItem("shopId")) {
          return
        }
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
        setUrgent(Boolean(status === "trialing" && left != null && left <= 7))

        if (!isLocked && left != null && left > 7 && sessionStorage.getItem("wq-trial-banner-dismissed") === "1") {
          setDismissed(true)
          return
        }

        if (status === "trialing" && left != null) {
          if (left <= 0) {
            setMessage("Trial expirado — o sistema está bloqueado até assinar.")
          } else if (left === 1) {
            setMessage(
              "Atenção: seu trial Worqera acaba amanhã. Assine agora para não perder o acesso à oficina."
            )
          } else if (left <= 7) {
            setMessage(
              `Atenção: seu trial Worqera expira em ${left} dias. Regularize a assinatura para continuar usando o sistema sem interrupção.`
            )
          } else {
            setMessage(`Trial ativo · ${left} dias restantes · depois é preciso assinar para continuar.`)
          }
          setHref("/billing")
        } else if (status === "expired" || status === "canceled" || status === "past_due") {
          setMessage("Assinatura inativa. Só billing e login estão liberados.")
          setHref("/billing")
        }
      } catch {
        // silent
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (dismissed || !message) return null

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2.5 text-sm sm:gap-3 sm:px-4 md:px-6 ${
        locked
          ? "border-red-300 bg-red-100 text-red-950"
          : urgent
            ? "border-amber-400 bg-amber-100 text-amber-950"
            : "border-[var(--wq-brand)]/20 bg-[var(--wq-brand-soft)] text-[var(--wq-text)]"
      }`}
    >
      <p className="min-w-0 flex-1 break-words font-medium">
        {message}{" "}
        <Link
          href={href}
          className={`font-bold underline underline-offset-2 ${
            locked ? "text-red-800" : urgent ? "text-amber-900" : "text-[var(--wq-brand)]"
          }`}
        >
          Ir para Billing →
        </Link>
      </p>
      {!locked && !urgent && (
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
