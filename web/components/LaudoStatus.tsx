"use client"

import { cn } from "@/lib/utils"

export type LastOrderEmail = {
  at: string
  kind: string
  kindLabel: string
  to: string
  status: "sent" | "skipped" | "failed"
  reason: string
  error: string
}

const REASON: Record<string, string> = {
  "smtp-off": "e-mail desligado no servidor",
  "no-recipient": "pedido sem e-mail",
  "awaiting-price": "esperando o preço",
  "awaiting-photos": "esperando as fotos",
  "pdf-failed": "o PDF não gerou",
  failed: "erro no envio",
}

/** Last laudo/"pronto" e-mail of the order, so the counter knows if the client got it. */
export function LaudoStatus({ last }: { last?: LastOrderEmail | null }) {
  if (!last) return null
  const when = new Date(last.at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
  const what = last.kind === "ready" ? "Aviso de pronto" : "Laudo"
  const text =
    last.status === "sent"
      ? `${what} enviado para ${last.to} · ${when}`
      : last.status === "failed"
        ? `${what} não chegou a sair (${when}): ${last.error || REASON[last.reason] || "erro no envio"}`
        : `${what} não enviado (${when}): ${REASON[last.reason] || last.reason || "sem motivo"}`
  return (
    <p
      className={cn(
        "text-xs",
        last.status === "sent" ? "text-emerald-700 dark:text-emerald-300" : last.status === "failed" ? "text-[var(--wq-danger)]" : "text-[var(--wq-text-muted)]"
      )}
    >
      {text}
    </p>
  )
}
