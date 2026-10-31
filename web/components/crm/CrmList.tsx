"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Cake, Loader2, MessageCircle } from "lucide-react"
import { getCrmListV1, type CrmRow, type CrmSegment } from "@/lib/apiV1"
import { cn } from "@/lib/utils"
import { birthdayLabel, birthdayWhen, brl, sinceLabel } from "./crmUi"

const RANGES = [
  { id: "today", label: "Hoje" },
  { id: "week", label: "7 dias" },
  { id: "month", label: "30 dias" },
] as const

const DAYS = [60, 90, 180, 365] as const

const EMPTY: Record<string, string> = {
  birthdays: "Ninguém faz aniversário nesse período. Peça a data no próximo atendimento: é o melhor motivo para chamar o cliente.",
  inactive: "Ninguém sumido nesse período. Ótimo sinal!",
  recurring: "Ainda ninguém voltou duas vezes. Os recorrentes aparecem aqui.",
  new: "Nenhum cliente novo nos últimos 30 dias.",
}

/** One CRM segment with the ready WhatsApp message for each client. */
export function CrmList({ segment }: { segment: CrmSegment }) {
  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("week")
  const [days, setDays] = useState<(typeof DAYS)[number]>(90)
  const [rows, setRows] = useState<CrmRow[] | null>(null)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    setRows(null)
    getCrmListV1({ segment, range: segment === "birthdays" ? range : undefined, days: segment === "inactive" ? days : undefined })
      .then((res) => {
        if (cancelled) return
        setRows(res.items)
        setTotal(res.total)
        setError("")
      })
      .catch((err) => !cancelled && setError(err?.message || "Não carregou"))
    return () => {
      cancelled = true
    }
  }, [segment, range, days])

  const filters =
    segment === "birthdays" ? (
      <div className="grid grid-cols-3 rounded-lg border border-[var(--wq-border)] bg-[var(--wq-surface)] p-0.5 sm:inline-grid">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRange(r.id)}
            className={cn("rounded-md px-3 py-1.5 text-xs font-semibold", range === r.id ? "bg-[var(--wq-brand)] text-white" : "text-[var(--wq-text-muted)]")}
          >
            {r.label}
          </button>
        ))}
      </div>
    ) : segment === "inactive" ? (
      <div className="grid grid-cols-4 rounded-lg border border-[var(--wq-border)] bg-[var(--wq-surface)] p-0.5 sm:inline-grid">
        {DAYS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDays(d)}
            className={cn("rounded-md px-3 py-1.5 text-xs font-semibold", days === d ? "bg-[var(--wq-brand)] text-white" : "text-[var(--wq-text-muted)]")}
          >
            {d === 365 ? "1 ano" : `${d}+ dias`}
          </button>
        ))}
      </div>
    ) : null

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--wq-text-muted)]">
          {rows ? `${total} cliente${total === 1 ? "" : "s"}` : "Carregando…"}
          {segment === "inactive" ? " · os que mais gastaram primeiro" : segment === "recurring" ? " · quem mais voltou primeiro" : ""}
        </p>
        {filters}
      </div>

      {error ? (
        <p className="py-8 text-center text-sm text-[var(--wq-danger)]">{error}</p>
      ) : !rows ? (
        <div className="flex items-center justify-center py-12 text-sm text-[var(--wq-text-muted)]">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando
        </div>
      ) : !rows.length ? (
        <p className="rounded-2xl border border-dashed border-[var(--wq-border)] px-4 py-10 text-center text-sm text-[var(--wq-text-muted)]">
          {EMPTY[segment] || "Nenhum cliente aqui."}
        </p>
      ) : (
        <ul className="divide-y divide-[var(--wq-border)] overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:gap-3 sm:px-4">
              <Link href={`/clientes/${r.id}`} className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-semibold">
                  <span className="truncate">{r.name}</span>
                  {segment === "birthdays" && r.birthdayIn === 0 ? <Cake className="h-4 w-4 shrink-0 text-rose-500" /> : null}
                </p>
                <p className="text-xs text-[var(--wq-text-muted)] [overflow-wrap:anywhere]">
                  {[
                    segment === "birthdays"
                      ? `${birthdayWhen(r.birthdayIn)} · ${birthdayLabel(r.birthday)}${r.age ? ` · faz ${r.age} anos` : ""}`
                      : sinceLabel(r.daysSince),
                    `${r.orders} pedido${r.orders === 1 ? "" : "s"}`,
                    r.spent != null && r.orders ? `${brl(r.spent)} no total` : "",
                    r.openOrders ? `${r.openOrders} em andamento` : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {r.tags.length ? (
                  <span className="mt-1 flex flex-wrap gap-1">
                    {r.tags.map((t) => (
                      <span key={t} className="rounded-full bg-[var(--wq-paper)] px-2 py-0.5 text-[11px] text-[var(--wq-text-muted)]">
                        {t}
                      </span>
                    ))}
                  </span>
                ) : null}
              </Link>
              {r.whatsapp ? (
                <a
                  href={r.whatsapp.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[10px] bg-[#25D366] px-3 text-sm font-semibold text-[#073018] hover:bg-[#1ebe5d]"
                  title={r.whatsapp.text}
                >
                  <MessageCircle className="h-4 w-4" />
                  {segment === "birthdays" ? "Dar parabéns" : segment === "inactive" ? "Chamar de volta" : "Agradecer"}
                </a>
              ) : r.phone ? null : (
                <span className="text-xs text-[var(--wq-text-muted)]">Sem telefone</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
