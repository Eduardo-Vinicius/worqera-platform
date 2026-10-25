"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronDown, MessageCircle, PackageCheck } from "lucide-react"
import { toast } from "sonner"
import { getShelfV1, markShelfRemindedV1, type Shelf, type ShelfItem } from "@/lib/apiV1"
import { cn } from "@/lib/utils"

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

function daysLabel(days: number) {
  if (days <= 0) return "pronto hoje"
  if (days === 1) return "há 1 dia"
  return `há ${days} dias`
}

function remindedLabel(item: ShelfItem) {
  if (!item.reminders || !item.lastReminderAt) return ""
  const days = Math.floor((Date.now() - new Date(item.lastReminderAt).getTime()) / 86400000)
  const when = days <= 0 ? "hoje" : days === 1 ? "ontem" : `há ${days} dias`
  return item.reminders > 1 ? `lembrado ${item.reminders}x · último ${when}` : `lembrado ${when}`
}

/** Owner only: ready orders nobody picked up, and the money waiting on them. */
export function ShelfCard() {
  const [shelf, setShelf] = useState<Shelf | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (String(localStorage.getItem("role") || "").toLowerCase() !== "owner") return
    getShelfV1()
      .then(setShelf)
      .catch(() => setShelf(null))
  }, [])

  if (!shelf || shelf.summary.count === 0) return null
  const { summary, staleDays } = shelf
  const visible = open ? shelf.items : shelf.items.slice(0, 3)

  const remind = (item: ShelfItem) => {
    markShelfRemindedV1(item.id)
      .then((res) =>
        setShelf((s) =>
          s
            ? {
                ...s,
                items: s.items.map((it) =>
                  it.id === item.id ? { ...it, reminders: res.reminders, lastReminderAt: res.lastReminderAt } : it
                ),
              }
            : s
        )
      )
      .catch((err) => toast.error(err?.message || "Não foi possível registrar o lembrete"))
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
      <div className="flex items-start gap-3 px-4 pt-4 sm:px-5">
        <span
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white",
            summary.staleCount ? "bg-amber-500" : "bg-emerald-600"
          )}
        >
          <PackageCheck className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--wq-text-muted)]">
            Na prateleira · só você vê
          </p>
          <p className="mt-1 text-[15px] font-medium leading-snug text-[var(--wq-text)] sm:text-base">
            {summary.staleCount
              ? `${summary.staleCount} ${summary.staleCount === 1 ? "pedido pronto parado" : "pedidos prontos parados"} há ${staleDays}+ dias, com ${brl(summary.staleToCollect)} para receber.`
              : `${summary.count} ${summary.count === 1 ? "pedido pronto" : "pedidos prontos"} esperando o cliente buscar.`}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-px border-y border-[var(--wq-border)] bg-[var(--wq-border)]">
        {[
          { label: "Prontos", value: String(summary.count) },
          { label: `Parados ${staleDays}+ dias`, value: String(summary.staleCount), warn: summary.staleCount > 0 },
          { label: "A receber na retirada", value: brl(summary.toCollect) },
        ].map((c) => (
          <div key={c.label} className="bg-[var(--wq-surface)] px-4 py-2.5">
            <p
              className={cn(
                "font-[family-name:var(--font-display)] text-lg font-semibold tabular-nums sm:text-xl",
                c.warn && "text-amber-600 dark:text-amber-400"
              )}
            >
              {c.value}
            </p>
            <p className="text-[11px] text-[var(--wq-text-muted)]">{c.label}</p>
          </div>
        ))}
      </div>

      <ul className="divide-y divide-[var(--wq-border)]">
        {visible.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
            <Link href={`/pedidos?q=${encodeURIComponent(item.code)}`} className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--wq-text)]">
                #{item.code} · {item.clientName || "Cliente"}
              </p>
              <p className="truncate text-xs text-[var(--wq-text-muted)]">
                <span className={cn(item.stale && "font-semibold text-amber-700 dark:text-amber-400")}>
                  {daysLabel(item.days)}
                </span>
                {item.toCollect > 0 ? ` · ${brl(item.toCollect)}` : " · pago"}
                {remindedLabel(item) ? ` · ${remindedLabel(item)}` : ""}
              </p>
            </Link>
            {item.whatsapp ? (
              <a
                href={item.whatsapp.url}
                target="_blank"
                rel="noreferrer"
                onClick={() => remind(item)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-[10px] border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                {item.reminders ? "Lembrar de novo" : "Lembrar"}
              </a>
            ) : (
              <span className="shrink-0 text-[11px] text-[var(--wq-text-muted)]">sem telefone</span>
            )}
          </li>
        ))}
      </ul>

      {shelf.items.length > 3 ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-center gap-1 border-t border-[var(--wq-border)] py-2 text-xs font-medium text-[var(--wq-text-muted)] hover:bg-[var(--wq-paper)]"
        >
          {open ? "Mostrar menos" : `Ver todos os ${shelf.items.length}`}
          <ChevronDown className={cn("h-3.5 w-3.5 transition", open && "rotate-180")} />
        </button>
      ) : null}
    </section>
  )
}
