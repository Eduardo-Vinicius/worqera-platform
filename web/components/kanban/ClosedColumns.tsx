"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronsLeft, ChevronsRight, HandCoins, PackageCheck, Star } from "lucide-react"
import { getKanbanClosedV1, type ClosedCard } from "@/lib/apiV1"
import { formatBRL } from "@/lib/orderMoney"
import { cn } from "@/lib/utils"

export type ClosedKind = "delivered" | "refused"
type Kind = ClosedKind

export const CLOSED_META: Record<Kind, { title: string; icon: typeof PackageCheck; tone: string; rail: string; empty: string; all: string }> = {
  delivered: {
    title: "Entregues",
    icon: PackageCheck,
    tone: "text-emerald-700 dark:text-emerald-400",
    rail: "border-emerald-200 bg-emerald-50/70 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30",
    empty: "Nenhuma entrega no período.",
    all: "/pedidos?status=delivered",
  },
  refused: {
    title: "Recusados",
    icon: HandCoins,
    tone: "text-rose-700 dark:text-rose-400",
    rail: "border-rose-200 bg-rose-50/70 hover:bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30",
    empty: "Ninguém recusou no período.",
    all: "/pedidos?refused=1",
  },
}

const STAGE_LABEL: Record<string, string> = {
  new: "Novo",
  contact: "Em contato",
  followup: "Retorno",
  won: "Recuperado",
  lost: "Perdido",
}

function when(iso: string) {
  const d = new Date(iso)
  const days = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (days <= 0) return "hoje"
  if (days === 1) return "ontem"
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

function Rail({ kind, count, onOpen }: { kind: Kind; count: number; onOpen: () => void }) {
  const meta = CLOSED_META[kind]
  const Icon = meta.icon
  return (
    <button
      type="button"
      onClick={onOpen}
      title={`Ver ${meta.title.toLowerCase()}`}
      className={cn(
        "flex h-full min-h-[calc(100dvh-14rem)] w-14 shrink-0 flex-col items-center gap-3 rounded-2xl border py-3 transition md:min-h-[calc(100vh-11rem)]",
        meta.rail
      )}
    >
      <ChevronsLeft className={cn("h-4 w-4", meta.tone)} />
      <Icon className={cn("h-4 w-4", meta.tone)} />
      <span className={cn("font-mono text-sm font-bold", meta.tone)}>{count}</span>
      <span className={cn("text-xs font-semibold uppercase tracking-[0.18em] [writing-mode:vertical-rl]", meta.tone)}>{meta.title}</span>
    </button>
  )
}

/** One closed list. `compact` fills the phone screen instead of a fixed board column. */
export function ClosedColumn({
  kind,
  cards,
  days,
  onDays,
  onClose,
  onOpenOrder,
  compact = false,
}: {
  kind: Kind
  cards: ClosedCard[]
  days: number
  onDays: (days: number) => void
  onClose?: () => void
  onOpenOrder: (card: ClosedCard) => void
  compact?: boolean
}) {
  const meta = CLOSED_META[kind]
  const Icon = meta.icon
  const money = cards.reduce((sum, c) => sum + (Number(c.total) || 0), 0)
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border bg-[var(--wq-paper)]/60",
        compact
          ? "min-h-0 w-full flex-1"
          : "h-full min-h-[calc(100dvh-14rem)] w-[300px] shrink-0 md:min-h-[calc(100vh-11rem)]",
        kind === "delivered" ? "border-emerald-200 dark:border-emerald-900" : "border-rose-200 dark:border-rose-900"
      )}
    >
      <div className="border-b border-[var(--wq-border)] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", meta.tone)} />
          <span className={cn("flex-1 text-sm font-semibold", meta.tone)}>{meta.title}</span>
          <span className="rounded-md border border-[var(--wq-border)] px-1.5 font-mono text-[11px]">{cards.length}</span>
          {onClose ? (
            <button type="button" onClick={onClose} className="rounded-md p-1 text-[var(--wq-text-muted)] hover:bg-[var(--wq-surface)]" aria-label="Recolher">
              <ChevronsRight className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <div className="flex gap-1">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onDays(d)}
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
                  days === d ? "bg-[var(--wq-text)] text-[var(--wq-surface)]" : "text-[var(--wq-text-muted)] hover:text-[var(--wq-text)]"
                )}
              >
                {d}d
              </button>
            ))}
          </div>
          {money > 0 ? <span className="font-mono text-xs text-[var(--wq-text-muted)]">{formatBRL(money)}</span> : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
        {cards.length === 0 ? <p className="px-2 py-8 text-center text-xs text-[var(--wq-text-muted)]">{meta.empty}</p> : null}
        {cards.map((c) => (
          <div key={c.id} className="rounded-xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-3 text-sm shadow-sm">
            <button type="button" onClick={() => onOpenOrder(c)} className="block w-full text-left">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-semibold text-[var(--wq-text-muted)]">#{c.code}</span>
                <span className="text-[11px] text-[var(--wq-text-muted)]">{when(c.at)}</span>
              </div>
              <p className="mt-0.5 truncate font-semibold text-[var(--wq-text)]">{c.clientName || "Cliente"}</p>
              {c.summary ? <p className="truncate text-xs text-[var(--wq-text-muted)]">{c.summary}</p> : null}
            </button>
            <div className="mt-2 flex flex-wrap items-center gap-1">
              {kind === "refused" && c.reasonLabel ? (
                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                  {c.reasonLabel}
                </span>
              ) : null}
              {kind === "refused" && c.quoteStage ? (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    c.quoteStage === "won"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-[var(--wq-brand-soft)] text-[var(--wq-brand-text)]"
                  )}
                >
                  {STAGE_LABEL[c.quoteStage] || c.quoteStage}
                  {c.followUpAt && c.quoteStage !== "won" && c.quoteStage !== "lost"
                    ? ` · ${new Date(c.followUpAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`
                    : ""}
                </span>
              ) : null}
              {kind === "delivered" && c.feedbackScore ? (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                  <Star className="h-3 w-3" /> {c.feedbackScore}
                </span>
              ) : null}
              {c.total != null && c.total > 0 ? (
                <span className="ml-auto font-mono text-xs text-[var(--wq-text-muted)]">{formatBRL(c.total)}</span>
              ) : null}
            </div>
            {kind === "refused" && c.quoteId ? (
              <Link
                href={`/orcamentos?open=${encodeURIComponent(c.quoteId)}`}
                className="mt-2 block rounded-lg border border-[var(--wq-brand)]/30 py-1.5 text-center text-xs font-semibold text-[var(--wq-brand)] hover:bg-[var(--wq-brand-soft)]"
              >
                Abrir no Orçamentos
              </Link>
            ) : null}
          </div>
        ))}
      </div>
      <Link href={meta.all} className="border-t border-[var(--wq-border)] py-2 text-center text-xs font-medium text-[var(--wq-text-muted)] hover:bg-[var(--wq-surface)]">
        Ver todos em Pedidos
      </Link>
    </div>
  )
}

const STORE_KEY = "wq-kanban-closed-open"

export type ClosedState = {
  data: { delivered: ClosedCard[]; refused: ClosedCard[] } | null
  days: number
  setDays: (days: number) => void
}

/** Loads delivered and refused orders once for the board (desktop rails and phone chips share it). */
export function useClosedOrders(refreshKey: number, enabled: boolean): ClosedState {
  const [days, setDays] = useState(14)
  const [data, setData] = useState<ClosedState["data"]>(null)
  useEffect(() => {
    if (!enabled) return
    getKanbanClosedV1(days)
      .then((res) => setData({ delivered: res.delivered || [], refused: res.refused || [] }))
      .catch(() => setData(null))
  }, [days, refreshKey, enabled])
  return { data, days, setDays }
}

/** Delivered and refused orders at the end of the board. Collapsed rails, expand to look back. */
export function ClosedColumns({ closed, onOpenOrder }: { closed: ClosedState; onOpenOrder: (card: ClosedCard) => void }) {
  const { data, days, setDays } = closed
  const [open, setOpen] = useState<Record<Kind, boolean>>({ delivered: false, refused: false })

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "{}")
      setOpen({ delivered: Boolean(saved.delivered), refused: Boolean(saved.refused) })
    } catch {}
  }, [])

  const toggle = (kind: Kind, value: boolean) => {
    setOpen((prev) => {
      const next = { ...prev, [kind]: value }
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(next))
      } catch {}
      return next
    })
  }

  if (!data) return null
  return (
    <>
      {(["delivered", "refused"] as Kind[]).map((kind) =>
        open[kind] ? (
          <ClosedColumn
            key={kind}
            kind={kind}
            cards={data[kind]}
            days={days}
            onDays={setDays}
            onClose={() => toggle(kind, false)}
            onOpenOrder={onOpenOrder}
          />
        ) : (
          <Rail key={kind} kind={kind} count={data[kind].length} onOpen={() => toggle(kind, true)} />
        )
      )}
    </>
  )
}
