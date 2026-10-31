"use client"

import Link from "next/link"
import type { AiQuota } from "@/lib/apiV1"
import { cn } from "@/lib/utils"

export const WORQERA_AI_CONTACT =
  "https://wa.me/5511985591053?text=" + encodeURIComponent("Olá! Quero mais usos de IA na minha empresa.")

export function resetLabel(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "long", timeZone: "America/Sao_Paulo" })
}

/**
 * Says plainly when the month's AI uses are almost or fully gone.
 * Shows nothing while there is room, unless `always` (Plano page).
 */
export function AiQuotaNotice({
  quota,
  always = false,
  className,
}: {
  quota: AiQuota | null | undefined
  always?: boolean
  className?: string
}) {
  if (!quota) return null
  if (quota.blocked) {
    return (
      <div className={cn("rounded-xl border border-amber-300/70 bg-amber-50 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200", className)}>
        <p className="font-semibold">Limite de IA do mês atingido</p>
        <p className="mt-0.5">
          A empresa usou os {quota.limit.toLocaleString("pt-BR")} usos de IA deste mês. Até {resetLabel(quota.resetsAt)}, os textos
          saem prontos, sem IA.{" "}
          <Link href="/billing" className="font-semibold underline">
            Ver planos com mais IA
          </Link>{" "}
          ou{" "}
          <a href={WORQERA_AI_CONTACT} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
            fale com a Worqera
          </a>
          .
        </p>
      </div>
    )
  }
  if (quota.nearLimit) {
    return (
      <p className={cn("text-xs text-amber-800 dark:text-amber-300", className)}>
        Restam {quota.left.toLocaleString("pt-BR")} de {quota.limit.toLocaleString("pt-BR")} usos de IA este mês.{" "}
        <Link href="/billing" className="underline">
          Ver planos
        </Link>
      </p>
    )
  }
  if (!always) return null
  return (
    <p className={cn("text-xs text-[var(--wq-text-muted)]", className)}>
      IA: {quota.used.toLocaleString("pt-BR")} de {quota.limit.toLocaleString("pt-BR")} usos este mês · renova em{" "}
      {resetLabel(quota.resetsAt)}
    </p>
  )
}
