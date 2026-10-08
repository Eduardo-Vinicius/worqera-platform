"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Bell } from "lucide-react"
import { getAlertsInboxV1, markAlertsInboxReadV1, type InboxHistoryItem } from "@/lib/apiV1"
import { cn } from "@/lib/utils"

function historyLabel(item: InboxHistoryItem) {
  if (item.kind === "ready") return "Pronto"
  if (item.kind === "reopened") return "Reaberto"
  return item.score ? `${item.score}/5` : "Avaliação"
}

function canSee() {
  if (typeof window === "undefined") return false
  const role = String(localStorage.getItem("role") || "").toLowerCase()
  return role === "owner" || role === "admin"
}

export function FeedbackBell({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState<{
    ready: number
    reopened: number
    feedback: Array<{
      id: string
      code: string
      clientName: string
      score?: number
      comment?: string
      tags?: string[]
    }>
    history: InboxHistoryItem[]
  } | null>(null)
  const marked = useRef(Promise.resolve())
  const [allowed, setAllowed] = useState(false)
  const [readyCount, setReadyCount] = useState(0)
  const [reopenedCount, setReopenedCount] = useState(0)
  const [loadError, setLoadError] = useState("")
  const [feedback, setFeedback] = useState<
    Array<{
      id: string
      code: string
      clientName: string
      score?: number
      comment?: string
      tags?: string[]
    }>
  >([])
  const [history, setHistory] = useState<InboxHistoryItem[]>([])

  useEffect(() => {
    setAllowed(canSee())
  }, [])

  useEffect(() => {
    if (!allowed) return
    let cancelled = false
    let timer = 0
    const stop = () => window.clearInterval(timer)
    const load = async () => {
      if (document.hidden) return
      try {
        await marked.current
        const res = await getAlertsInboxV1()
        if (cancelled) return
        setLoadError("")
        setReadyCount(Number(res?.readyCount) || 0)
        setReopenedCount(Number(res?.reopenedCount) || 0)
        setFeedback(Array.isArray(res?.feedback) ? res.feedback : [])
        setHistory(Array.isArray(res?.history) ? res.history : [])
      } catch (err: any) {
        if (cancelled) return
        if (err?.status === 401 || err?.status === 403) {
          stop()
          return
        }
        setLoadError(err?.message || "Falha ao carregar avisos")
      }
    }
    const onVisible = () => {
      if (!document.hidden) void load()
    }
    void load()
    timer = window.setInterval(load, 180_000)
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      cancelled = true
      stop()
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [allowed])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPinned(null)
        setOpen(false)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  if (!allowed) return null

  const badge = feedback.length + (readyCount > 0 ? 1 : 0) + (reopenedCount > 0 ? 1 : 0)
  const shownReady = pinned?.ready ?? readyCount
  const shownReopened = pinned?.reopened ?? reopenedCount
  const shownFeedback = pinned?.feedback ?? feedback
  const shownHistory = (pinned?.history ?? history).filter((item) => item.read)

  const loadInbox = async () => {
    try {
      const res = await getAlertsInboxV1()
      setReadyCount(Number(res?.readyCount) || 0)
      setReopenedCount(Number(res?.reopenedCount) || 0)
      setFeedback(Array.isArray(res?.feedback) ? res.feedback : [])
      setHistory(Array.isArray(res?.history) ? res.history : [])
    } catch {
      /* o próximo ciclo tenta de novo */
    }
  }

  const close = () => {
    setPinned(null)
    setOpen(false)
  }

  const toggle = () => {
    if (open) {
      close()
      return
    }
    setPinned({ ready: readyCount, reopened: reopenedCount, feedback, history })
    setReadyCount(0)
    setReopenedCount(0)
    setFeedback([])
    marked.current = markAlertsInboxReadV1()
      .then(() => undefined)
      .catch(() => {
        void loadInbox()
      })
    setOpen(true)
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={toggle}
        className="relative rounded-xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-2 text-[var(--wq-text)] hover:bg-[var(--wq-paper)]"
        aria-label="Avisos e feedback"
        aria-expanded={open}
        title="Feedback e prontos"
      >
        <Bell className="h-4 w-4" />
        {badge > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--wq-brand)] px-1 text-[10px] font-bold text-white">
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[60] cursor-default bg-black/20 md:bg-transparent"
            aria-label="Fechar"
            onClick={close}
          />
          <div
            className={cn(
              "z-[70] overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-white shadow-lg",
              // Mobile: fixed panel so it isn't clipped by header/main overflow
              "fixed inset-x-3 top-[max(4.5rem,env(safe-area-inset-top)+3.5rem)] max-h-[min(70dvh,480px)]",
              "md:absolute md:inset-x-auto md:right-0 md:top-full md:mt-2 md:max-h-[360px] md:w-[min(340px,92vw)]"
            )}
          >
            <div className="border-b border-[var(--wq-border)] px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--wq-text-muted)]">
                Avisos da oficina
              </p>
            </div>
            <div className="max-h-[min(52dvh,300px)] space-y-1 overflow-y-auto overscroll-contain p-2 md:max-h-[280px]">
              {loadError ? (
                <p className="px-2 py-4 text-center text-xs text-[var(--wq-danger)]">{loadError}</p>
              ) : null}

              {shownReady > 0 ? (
                <Link
                  href="/kanban"
                  onClick={close}
                  className="block rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900 hover:bg-emerald-100"
                >
                  <strong>{shownReady}</strong> pedido{shownReady === 1 ? "" : "s"}{" "}
                  <strong>pronto</strong> — abra a coluna final e marque como entregue
                </Link>
              ) : null}

              {shownReopened > 0 ? (
                <Link
                  href="/kanban"
                  onClick={close}
                  className="block rounded-xl bg-sky-50 px-3 py-2.5 text-sm text-sky-900 hover:bg-sky-100"
                >
                  <strong>{shownReopened}</strong> reaberto
                  {shownReopened === 1 ? "" : "s"} no fluxo
                </Link>
              ) : null}

              {!loadError && shownFeedback.length === 0 && shownReady === 0 && shownReopened === 0 && shownHistory.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-[var(--wq-text-muted)]">
                  Sem feedback recente nem pedidos prontos
                </p>
              ) : null}

              {shownFeedback.length > 0 ? (
                <p className="px-2 pt-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--wq-text-muted)]">
                  Avaliações recentes
                </p>
              ) : null}

              {shownFeedback.map((f) => (
                <Link
                  key={f.id}
                  href={`/pedidos?q=${encodeURIComponent(f.code)}`}
                  onClick={close}
                  className="block rounded-xl px-3 py-2 hover:bg-[var(--wq-paper)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-semibold">{f.code}</span>
                    <span className="text-xs font-bold text-[var(--wq-brand-text)]">{f.score}/5</span>
                  </div>
                  <p className="truncate text-xs text-[var(--wq-text-muted)]">
                    {f.clientName || "Cliente"}
                    {f.tags?.length ? ` · ${f.tags.join(", ")}` : ""}
                  </p>
                  {f.comment ? (
                    <p className="mt-0.5 line-clamp-2 text-xs text-[var(--wq-text)]">
                      “{f.comment}”
                    </p>
                  ) : null}
                </Link>
              ))}

              {shownHistory.length > 0 ? (
                <p className="px-2 pt-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--wq-text-muted)]">
                  Histórico
                </p>
              ) : null}

              {shownHistory.map((item) => (
                <Link
                  key={`${item.kind}-${item.id}`}
                  href={`/pedidos?q=${encodeURIComponent(item.code)}`}
                  onClick={close}
                  className="block rounded-xl px-3 py-2 hover:bg-[var(--wq-paper)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-semibold text-[var(--wq-text-muted)]">{item.code}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--wq-text-muted)]">
                      {historyLabel(item)}
                    </span>
                  </div>
                  <p className="truncate text-xs text-[var(--wq-text-muted)]">
                    {item.clientName || "Cliente"}
                    {item.comment ? ` · “${item.comment}”` : ""}
                  </p>
                </Link>
              ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-[var(--wq-border)] px-3 py-2">
              <Link
                href="/avaliacoes"
                onClick={close}
                className="text-xs font-medium text-[var(--wq-brand-text)] hover:underline"
              >
                Ver todas as avaliações →
              </Link>
              <Link
                href="/pedidos?status=ready"
                onClick={close}
                className="text-xs font-medium text-[var(--wq-text-muted)] hover:underline"
              >
                Pedidos prontos
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
