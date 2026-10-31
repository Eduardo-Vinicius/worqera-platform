"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { getSubscriptionV1 } from "@/lib/apiV1"
import { planOf } from "@/lib/plans"
import { X } from "lucide-react"

function daysLeft(iso?: string | null) {
  if (!iso) return null
  const end = new Date(iso).getTime()
  if (Number.isNaN(end)) return null
  return Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24))
}

type Tone = "info" | "urgent" | "locked" | "calm"

/** Trial, overdue and cancelled states, with one clear button to the plan page. */
export function TrialBanner() {
  const [message, setMessage] = useState<string | null>(null)
  const [action, setAction] = useState("Assinar")
  const [tone, setTone] = useState<Tone>("info")
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (localStorage.getItem("platformAdmin") === "1" && !localStorage.getItem("shopId")) return
        const res = await getSubscriptionV1()
        const sub = res?.subscription || res
        if (!sub || cancelled) return

        const status = String(sub.status || "")
        const left = daysLeft(sub.trialEndsAt)
        const planName = planOf(sub.planCode)?.name || "Worqera"
        const subscribed = sub.provider === "Asaas" && Boolean(sub.providerSubscriptionId)
        const dismissable = (next: Tone) => next === "info" || next === "calm"

        let next: { text: string; tone: Tone; action: string } | null = null
        if (status === "trialing" && left != null) {
          if (subscribed) {
            const due = sub.trialEndsAt ? new Date(sub.trialEndsAt).toLocaleDateString("pt-BR") : ""
            next = { text: `Assinatura do ${planName} feita · a primeira cobrança vence em ${due}.`, tone: "calm", action: "Ver plano" }
          } else if (left <= 0) {
            next = { text: `O teste do ${planName} terminou. Assine para continuar usando.`, tone: "locked", action: "Assinar agora" }
          } else if (left <= 2) {
            next = {
              text: `Teste do ${planName} · ${left === 1 ? "último dia" : "faltam 2 dias"}. Escolha a forma de pagamento para não parar.`,
              tone: "urgent",
              action: "Assinar",
            }
          } else {
            next = { text: `Teste do ${planName} · ${left} dias restantes.`, tone: "info", action: "Assinar" }
          }
        } else if (status === "past_due") {
          next = { text: "Pagamento em atraso. Pague a fatura para não bloquear a empresa.", tone: "urgent", action: "Pagar fatura" }
        } else if (status === "expired" || (status === "canceled" && !(sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) > new Date()))) {
          next = { text: "Assinatura inativa. Só o Plano e o login estão liberados.", tone: "locked", action: "Assinar" }
        }
        if (!next) return
        if (dismissable(next.tone) && sessionStorage.getItem("wq-trial-banner-dismissed") === "1") {
          setDismissed(true)
          return
        }
        setMessage(next.text)
        setTone(next.tone)
        setAction(next.action)
      } catch {
        // silent
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (dismissed || !message) return null

  const styles: Record<Tone, string> = {
    locked: "border-red-300 bg-red-100 text-red-950",
    urgent: "border-amber-400 bg-amber-100 text-amber-950",
    info: "border-[var(--wq-brand)]/20 bg-[var(--wq-brand-soft)] text-[var(--wq-text)]",
    calm: "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100",
  }

  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2 text-sm sm:gap-3 sm:px-4 md:px-6 ${styles[tone]}`}>
      <p className="min-w-0 flex-1 break-words font-medium">{message}</p>
      <div className="flex items-center gap-1">
        <Link
          href="/billing"
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            tone === "locked" ? "bg-red-700 text-white" : tone === "urgent" ? "bg-amber-600 text-white" : tone === "calm" ? "text-emerald-800 underline underline-offset-2 dark:text-emerald-200" : "bg-[var(--wq-brand)] text-white"
          }`}
        >
          {action}
        </Link>
        {tone === "info" || tone === "calm" ? (
          <button
            type="button"
            aria-label="Dispensar"
            className="rounded-lg p-1 opacity-70 hover:bg-white/50"
            onClick={() => {
              sessionStorage.setItem("wq-trial-banner-dismissed", "1")
              setDismissed(true)
            }}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  )
}
