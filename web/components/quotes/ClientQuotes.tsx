"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { HandCoins } from "lucide-react"
import { listQuotesV1, type Quote } from "@/lib/apiV1"
import { cn } from "@/lib/utils"
import { STAGE_LABEL, brl, followUpLabel, stageTone } from "./quoteUi"

export function ClientQuotes({ clientId }: { clientId: string }) {
  const [quotes, setQuotes] = useState<Quote[] | null>(null)

  useEffect(() => {
    if (!clientId) return
    const role = String(localStorage.getItem("role") || "").toLowerCase()
    if (role === "sector") return
    listQuotesV1({ view: "all", clientId })
      .then((res) => setQuotes(res.quotes || []))
      .catch(() => setQuotes([]))
  }, [clientId])

  if (!quotes || quotes.length === 0) return null

  return (
    <section className="mt-6 rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
      <header className="flex items-center gap-2 border-b border-[var(--wq-border)] px-4 py-3">
        <HandCoins className="h-4 w-4 text-[var(--wq-brand)]" />
        <h2 className="text-sm font-semibold">Orçamentos</h2>
        <span className="text-xs text-[var(--wq-text-muted)]">{quotes.length}</span>
      </header>
      <ul className="divide-y divide-[var(--wq-border)]">
        {quotes.map((q) => (
          <li key={q.id}>
            <Link
              href={`/orcamentos?open=${encodeURIComponent(q.id)}`}
              className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-[var(--wq-paper)]"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{q.what || "Orçamento"}</span>
                <span className="block text-xs text-[var(--wq-text-muted)]">
                  {q.reasonLabel || "Sem motivo"}
                  {q.stage !== "won" && q.stage !== "lost" ? ` · ${followUpLabel(q)}` : ""}
                </span>
              </span>
              <span className="tabular-nums">{q.value ? brl(q.value) : ""}</span>
              <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", stageTone(q.stage))}>
                {STAGE_LABEL[q.stage]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
