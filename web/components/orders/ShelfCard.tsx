"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Check, ChevronDown, Flag, Loader2, MessageCircle, PackageCheck } from "lucide-react"
import { toast } from "sonner"
import { getShelfV1, markShelfRemindedV1, setShelfCheckV1, type Shelf, type ShelfItem } from "@/lib/apiV1"
import { updateOrderService } from "@/lib/apiService"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { SHELF_EVENT, shelfModeFromHash, type ShelfMode } from "@/lib/shelfIntent"

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

/**
 * Owner only: ready orders nobody picked up, the money waiting on them, and the
 * ones worth checking at the counter ("Conferir") because they may already be gone.
 */
export function ShelfCard() {
  const [shelf, setShelf] = useState<Shelf | null>(null)
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<ShelfMode>("all")
  const [flash, setFlash] = useState(false)
  const [delivering, setDelivering] = useState<ShelfItem | null>(null)
  const [busy, setBusy] = useState("")
  const sectionRef = useRef<HTMLElement>(null)
  const pending = useRef<ShelfMode | null>(null)

  useEffect(() => {
    if (String(localStorage.getItem("role") || "").toLowerCase() !== "owner") return
    pending.current = shelfModeFromHash(window.location.hash)
    getShelfV1()
      .then(setShelf)
      .catch(() => setShelf(null))
  }, [])

  const reveal = useCallback((mode: ShelfMode) => {
    setFilter(mode)
    setOpen(mode !== "all")
    setFlash(true)
    window.setTimeout(() => setFlash(false), 1600)
    requestAnimationFrame(() => sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }))
  }, [])

  useEffect(() => {
    const onIntent = (e: Event) => {
      const mode = (e as CustomEvent<ShelfMode>).detail || "all"
      if (shelf) reveal(mode)
      else pending.current = mode
    }
    window.addEventListener(SHELF_EVENT, onIntent)
    return () => window.removeEventListener(SHELF_EVENT, onIntent)
  }, [shelf, reveal])

  useEffect(() => {
    if (!shelf || !pending.current) return
    const mode = pending.current
    pending.current = null
    reveal(mode)
  }, [shelf, reveal])

  if (!shelf || shelf.summary.count === 0) return null
  const { summary, staleDays } = shelf
  const toCheck = (it: ShelfItem) => Boolean(it.check) || it.maybeGone
  const list =
    filter === "check"
      ? shelf.items.filter(toCheck)
      : filter === "stale"
        ? shelf.items.filter((it) => it.stale).sort((a, b) => b.days - a.days)
        : shelf.items
  const visible = open ? list : list.slice(0, 3)
  const toggleFilter = (mode: ShelfMode) => {
    const next = filter === mode ? "all" : mode
    setFilter(next)
    setOpen(next !== "all")
  }

  const patchItem = (id: string, next: Partial<ShelfItem>) =>
    setShelf((s) => (s ? { ...s, items: s.items.map((it) => (it.id === id ? { ...it, ...next } : it)) } : s))

  const remind = (item: ShelfItem) => {
    markShelfRemindedV1(item.id)
      .then((res) => patchItem(item.id, { reminders: res.reminders, lastReminderAt: res.lastReminderAt }))
      .catch((err) => toast.error(err?.message || "Não foi possível registrar o lembrete"))
  }

  const toggleCheck = (item: ShelfItem) => {
    setBusy(`check-${item.id}`)
    setShelfCheckV1(item.id, !item.check)
      .then((res) => {
        patchItem(item.id, { check: res.check })
        toast.message(res.check ? `#${item.code} marcado para conferir no balcão` : `#${item.code} conferido: segue na prateleira`)
      })
      .catch((err) => toast.error(err?.message || "Não marcou"))
      .finally(() => setBusy(""))
  }

  const deliver = async (item: ShelfItem, paid: boolean) => {
    setBusy(`deliver-${item.id}`)
    try {
      await updateOrderService(item.id, {
        status: "delivered",
        deliveredAt: new Date().toISOString(),
        ...(paid && item.toCollect > 0 ? { pricing: { deposit: item.total, remaining: 0 } } : {}),
      })
      setShelf((s) => {
        if (!s) return s
        const items = s.items.filter((it) => it.id !== item.id)
        return {
          ...s,
          items,
          summary: {
            ...s.summary,
            count: items.length,
            toCollect: items.reduce((sum, it) => sum + it.toCollect, 0),
            staleCount: items.filter((it) => it.stale).length,
            staleToCollect: items.filter((it) => it.stale).reduce((sum, it) => sum + it.toCollect, 0),
            checkCount: items.filter(toCheck).length,
          },
        }
      })
      setDelivering(null)
      toast.success(
        paid || item.toCollect <= 0
          ? `#${item.code} finalizado como entregue`
          : `#${item.code} entregue · ${brl(item.toCollect)} ficou em Entregue sem pagar`
      )
    } catch (err: any) {
      toast.error(err?.message || "Não finalizou")
    } finally {
      setBusy("")
    }
  }

  return (
    <section
      ref={sectionRef}
      id="prateleira"
      className={cn(
        "scroll-mt-24 overflow-hidden rounded-2xl border bg-[var(--wq-surface)] transition-shadow duration-500",
        flash ? "border-amber-400 shadow-[0_0_0_4px_rgba(245,158,11,0.25)]" : "border-[var(--wq-border)]"
      )}
    >
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
          {summary.checkCount ? (
            <button
              type="button"
              onClick={() => toggleFilter("check")}
              className={cn(
                "mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition",
                filter === "check"
                  ? "border-sky-600 bg-sky-600 text-white"
                  : "border-sky-200 bg-sky-50 text-sky-900 hover:border-sky-400 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200"
              )}
            >
              <Flag className="h-3.5 w-3.5" />
              {summary.checkCount} para conferir: talvez já tenham saído
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-px border-y border-[var(--wq-border)] bg-[var(--wq-border)]">
        {[
          { label: "Prontos", value: String(summary.count), mode: "all" as ShelfMode },
          { label: `Parados ${staleDays}+ dias`, value: String(summary.staleCount), warn: summary.staleCount > 0, mode: "stale" as ShelfMode },
          { label: "A receber na retirada", value: brl(summary.toCollect), mode: null },
        ].map((c) => {
          const on = c.mode != null && c.mode !== "all" && filter === c.mode
          const body = (
            <>
              <p
                className={cn(
                  "font-[family-name:var(--font-display)] text-lg font-semibold tabular-nums sm:text-xl",
                  c.warn && "text-amber-600 dark:text-amber-400"
                )}
              >
                {c.value}
              </p>
              <p className="text-[11px] text-[var(--wq-text-muted)]">{c.label}</p>
            </>
          )
          return c.mode && (c.mode === "all" || Number(c.value) > 0) ? (
            <button
              key={c.label}
              type="button"
              onClick={() => (c.mode === "all" ? toggleFilter(filter) : toggleFilter(c.mode as ShelfMode))}
              className={cn(
                "bg-[var(--wq-surface)] px-4 py-2.5 text-left transition hover:bg-[var(--wq-paper)]",
                on && "bg-amber-50 shadow-[inset_0_-2px_0_0_#f59e0b] dark:bg-amber-950/30"
              )}
            >
              {body}
            </button>
          ) : (
            <div key={c.label} className="bg-[var(--wq-surface)] px-4 py-2.5">
              {body}
            </div>
          )
        })}
      </div>
      {filter !== "all" ? (
        <div className="flex items-center justify-between gap-2 border-b border-[var(--wq-border)] bg-[var(--wq-paper)] px-4 py-2 text-xs sm:px-5 animate-in fade-in slide-in-from-top-1 duration-300">
          <span className="font-medium text-[var(--wq-text)]">
            {filter === "stale"
              ? `${list.length} parados há ${staleDays}+ dias · o mais antigo primeiro · toque em Lembrar`
              : `${list.length} para conferir no balcão · talvez já tenham saído`}
          </span>
          <button type="button" className="font-semibold text-[var(--wq-brand-text)] hover:underline" onClick={() => toggleFilter(filter)}>
            Ver todos
          </button>
        </div>
      ) : null}

      <ul className="divide-y divide-[var(--wq-border)]">
        {visible.map((item) => (
          <li key={item.id} className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:px-5", item.check && "bg-sky-50/60 dark:bg-sky-950/20")}>
            <Link href={`/pedidos?q=${encodeURIComponent(item.code)}`} className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--wq-text)]">
                #{item.code} · {item.clientName || "Cliente"}
                {item.check ? <Flag className="ml-1.5 inline h-3.5 w-3.5 text-sky-700" /> : null}
              </p>
              <p className="truncate text-xs text-[var(--wq-text-muted)]">
                <span className={cn(item.stale && "font-semibold text-amber-700 dark:text-amber-400")}>
                  {daysLabel(item.days)}
                </span>
                {item.toCollect > 0 ? ` · ${brl(item.toCollect)}` : " · pago"}
                {remindedLabel(item) ? ` · ${remindedLabel(item)}` : ""}
                {item.check?.byName ? ` · conferir (${item.check.byName})` : ""}
              </p>
            </Link>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => toggleCheck(item)}
                disabled={busy === `check-${item.id}`}
                className={cn(
                  "inline-flex items-center gap-1 rounded-[10px] border px-2 py-1.5 text-xs font-semibold",
                  item.check
                    ? "border-sky-600 bg-sky-600 text-white"
                    : "border-[var(--wq-border)] text-[var(--wq-text-muted)] hover:text-[var(--wq-text)]"
                )}
                title={item.check ? "Tirar a marca de conferir" : "Marcar para conferir no balcão"}
              >
                <Flag className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{item.check ? "Conferindo" : "Conferir"}</span>
              </button>
              <button
                type="button"
                onClick={() => setDelivering(item)}
                className="inline-flex items-center gap-1 rounded-[10px] border border-[var(--wq-border)] px-2 py-1.5 text-xs font-semibold text-[var(--wq-text)] hover:border-[var(--wq-brand)]/50"
              >
                <Check className="h-3.5 w-3.5" />
                Já entregue
              </button>
              {item.whatsapp ? (
                <a
                  href={item.whatsapp.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => remind(item)}
                  className="inline-flex items-center gap-1.5 rounded-[10px] border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{item.reminders ? "Lembrar de novo" : "Lembrar"}</span>
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {list.length > 3 ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-center gap-1 border-t border-[var(--wq-border)] py-2 text-xs font-medium text-[var(--wq-text-muted)] hover:bg-[var(--wq-paper)]"
        >
          {open ? "Mostrar menos" : `Ver todos os ${list.length}`}
          <ChevronDown className={cn("h-3.5 w-3.5 transition", open && "rotate-180")} />
        </button>
      ) : null}

      <Dialog open={Boolean(delivering)} onOpenChange={(v) => (!v ? setDelivering(null) : null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>#{delivering?.code} já foi entregue?</DialogTitle>
            <DialogDescription>
              {delivering && delivering.toCollect > 0
                ? `Faltava receber ${brl(delivering.toCollect)}. O cliente pagou?`
                : "O pedido sai da prateleira e vai para Entregues."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {delivering && delivering.toCollect > 0 ? (
              <>
                <Button
                  type="button"
                  className="rounded-[10px] bg-emerald-600 text-white hover:bg-emerald-700"
                  disabled={Boolean(busy)}
                  onClick={() => delivering && void deliver(delivering, true)}
                >
                  {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                  Sim, recebi {brl(delivering.toCollect)}
                </Button>
                <Button type="button" variant="outline" className="rounded-[10px]" disabled={Boolean(busy)} onClick={() => delivering && void deliver(delivering, false)}>
                  Entregou sem pagar
                </Button>
              </>
            ) : (
              <Button
                type="button"
                className="rounded-[10px] bg-[var(--wq-action)] text-white"
                disabled={Boolean(busy)}
                onClick={() => delivering && void deliver(delivering, true)}
              >
                {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                Finalizar como entregue
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={() => setDelivering(null)}>
              Ainda está aqui
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
