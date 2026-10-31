"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { BadgeDollarSign, ChevronDown, Loader2, MessageCircle, RefreshCw } from "lucide-react"
import { getReceivablesV1, type AiQuota, type ReceivableItem, type Receivables } from "@/lib/apiV1"
import { cn } from "@/lib/utils"
import { AiQuotaNotice } from "./AiQuotaNotice"

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const LEVEL: Record<ReceivableItem["level"], { label: string; tone: string }> = {
  ready: { label: "Pronto", tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
  soft: { label: "Até 7 dias", tone: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300" },
  firm: { label: "8 a 30 dias", tone: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
  late: { label: "+30 dias", tone: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" },
}

/** Who owes the shop, how old it is and in which order to collect. AI writes the plan (within the plan quota). */
export function ReceivablesCard() {
  const [data, setData] = useState<Receivables | null>(null)
  const [quota, setQuota] = useState<AiQuota | null>(null)
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(false)

  const load = (refresh = false) => {
    setBusy(true)
    getReceivablesV1(refresh)
      .then((res) => {
        setData(res.receivables)
        setQuota(res.aiQuota)
      })
      .catch(() => setHidden(true))
      .finally(() => setBusy(false))
  }

  useEffect(() => load(), [])

  if (hidden || !data) return null
  const items = open ? data.items : data.items.slice(0, 5)
  const agingTotal = data.aging.upTo7 + data.aging.upTo30 + data.aging.over30 || 1

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
      <div className="flex items-start gap-3 px-4 pt-4 sm:px-5">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
          <BadgeDollarSign className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--wq-text-muted)]">
            Cobrança inteligente
            {data.ai ? <span className="rounded-full bg-[var(--wq-brand)] px-1.5 py-0.5 text-[9px] font-bold text-white">IA</span> : null}
          </p>
          <p className="mt-1 text-[15px] font-medium leading-snug text-[var(--wq-text)] sm:text-base">{data.headline}</p>
          {data.plan.length ? (
            <ol className="mt-2 space-y-1 text-sm text-[var(--wq-text-muted)]">
              {data.plan.map((p, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-semibold text-[var(--wq-text)]">{i + 1}.</span>
                  {p}
                </li>
              ))}
            </ol>
          ) : null}
          <AiQuotaNotice quota={quota} className="mt-2" />
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={busy}
          className="rounded-lg p-1.5 text-[var(--wq-text-muted)] hover:bg-[var(--wq-paper)]"
          aria-label="Atualizar"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </button>
      </div>

      {data.total > 0.009 ? (
        <>
          <div className="mt-4 grid grid-cols-3 gap-px border-y border-[var(--wq-border)] bg-[var(--wq-border)]">
            {[
              { label: "A receber", value: data.total },
              { label: `Entregues sem pagar (${data.buckets.deliveredCount})`, value: data.buckets.delivered, warn: true },
              { label: `Prontos com saldo (${data.buckets.readyCount})`, value: data.buckets.ready },
            ].map((c) => (
              <div key={c.label} className="bg-[var(--wq-surface)] px-4 py-2.5">
                <p className={cn("font-[family-name:var(--font-display)] text-lg font-semibold tabular-nums", c.warn && c.value > 0 && "text-amber-600")}>
                  {brl(c.value)}
                </p>
                <p className="text-[11px] text-[var(--wq-text-muted)]">{c.label}</p>
              </div>
            ))}
          </div>

          {data.atRisk > 0 ? (
            <div className="px-4 pt-3 sm:px-5">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">Idade do que já foi entregue</p>
              <div className="flex h-2.5 overflow-hidden rounded-full bg-[var(--wq-paper)]">
                <span className="bg-sky-400" style={{ width: `${(data.aging.upTo7 / agingTotal) * 100}%` }} />
                <span className="bg-amber-400" style={{ width: `${(data.aging.upTo30 / agingTotal) * 100}%` }} />
                <span className="bg-rose-500" style={{ width: `${(data.aging.over30 / agingTotal) * 100}%` }} />
              </div>
              <p className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-[var(--wq-text-muted)]">
                <span>Até 7 dias {brl(data.aging.upTo7)}</span>
                <span>8–30 dias {brl(data.aging.upTo30)}</span>
                <span className="font-semibold text-rose-600">+30 dias {brl(data.aging.over30)}</span>
              </p>
            </div>
          ) : null}

          <ul className="mt-3 divide-y divide-[var(--wq-border)] border-t border-[var(--wq-border)]">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                <Link href={`/pedidos?q=${encodeURIComponent(item.code)}`} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--wq-text)]">
                    #{item.code} · {item.clientName || "Cliente"}
                  </p>
                  <p className="flex items-center gap-2 text-xs text-[var(--wq-text-muted)]">
                    <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", LEVEL[item.level].tone)}>{LEVEL[item.level].label}</span>
                    {item.stage === "delivered" ? `entregue há ${item.days} dia${item.days === 1 ? "" : "s"}` : "esperando retirada"}
                  </p>
                </Link>
                <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">{brl(item.value)}</span>
                {item.waUrl ? (
                  <a
                    href={item.waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={item.text}
                    className="inline-flex shrink-0 items-center gap-1 rounded-[10px] border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> Cobrar
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
          {data.items.length > 5 ? (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex w-full items-center justify-center gap-1 border-t border-[var(--wq-border)] py-2 text-xs font-medium text-[var(--wq-text-muted)] hover:bg-[var(--wq-paper)]"
            >
              {open ? "Mostrar menos" : `Ver todos os ${data.items.length}`}
              <ChevronDown className={cn("h-3.5 w-3.5 transition", open && "rotate-180")} />
            </button>
          ) : null}
        </>
      ) : (
        <div className="h-4" />
      )}
    </section>
  )
}
