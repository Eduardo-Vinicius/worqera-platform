"use client"

import { useEffect, useState } from "react"
import { ArrowRight, ScanSearch } from "lucide-react"
import { getClientInsightV1, type ClientInsight } from "@/lib/apiV1"
import { cn } from "@/lib/utils"

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })

function tagTone(tag: string) {
  if (/^Deve|reclamou|Sumido|Passou da hora/i.test(tag)) return "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
  if (/fiel|Ama/i.test(tag)) return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
  return "bg-[var(--wq-paper)] text-[var(--wq-text-muted)]"
}

/** Who this customer is, in one look, and the next move with them. */
export function ClientInsightCard({ clientId }: { clientId: string }) {
  const [data, setData] = useState<ClientInsight | null>(null)

  useEffect(() => {
    if (!clientId) return
    getClientInsightV1(clientId)
      .then((res) => setData(res.insight))
      .catch(() => setData(null))
  }, [clientId])

  if (!data) return null
  const n = data.numbers
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--wq-brand)_8%,var(--wq-surface)),var(--wq-surface)_60%)]">
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--wq-brand)] text-white">
          <ScanSearch className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--wq-text-muted)]">
            Raio-X do cliente
            {data.ai ? <span className="rounded-full bg-[var(--wq-brand)] px-1.5 py-0.5 text-[9px] font-bold text-white">IA</span> : null}
          </p>
          <p className="mt-1 text-[15px] font-medium leading-snug text-[var(--wq-text)]">{data.summary}</p>
          <p className="mt-2 flex items-start gap-1.5 text-sm font-semibold text-[var(--wq-brand)]">
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0" /> {data.next}
          </p>
          {n.tags.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {n.tags.map((t) => (
                <span key={t} className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", tagTone(t))}>
                  {t}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      {n.visits ? (
        <div className="grid grid-cols-2 gap-px border-t border-[var(--wq-border)] bg-[var(--wq-border)] sm:grid-cols-4">
          {[
            { label: "Pedidos", value: String(n.visits) },
            { label: "Gasto total", value: brl(n.spent) },
            { label: "Ticket médio", value: brl(n.avgTicket) },
            { label: n.avgGap ? `Volta a cada ~${n.avgGap} dias` : "Último pedido", value: n.daysSinceLast != null ? `há ${n.daysSinceLast}d` : "—" },
          ].map((c) => (
            <div key={c.label} className="bg-[var(--wq-surface)] px-4 py-2.5">
              <p className="font-[family-name:var(--font-display)] text-lg font-semibold tabular-nums">{c.value}</p>
              <p className="text-[11px] text-[var(--wq-text-muted)]">{c.label}</p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}
