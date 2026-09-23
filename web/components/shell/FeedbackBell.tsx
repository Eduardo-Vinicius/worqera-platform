"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell } from "lucide-react"
import { getAlertsInboxV1 } from "@/lib/apiV1"
import { cn } from "@/lib/utils"

function canSee() {
  if (typeof window === "undefined") return false
  const role = String(localStorage.getItem("role") || "").toLowerCase()
  return role === "owner" || role === "admin"
}

export function FeedbackBell({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
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

  useEffect(() => {
    setAllowed(canSee())
  }, [])

  useEffect(() => {
    if (!allowed) return
    let cancelled = false
    const load = async () => {
      try {
        const res = await getAlertsInboxV1()
        if (cancelled) return
        setLoadError("")
        setReadyCount(Number(res?.readyCount) || 0)
        setReopenedCount(Number(res?.reopenedCount) || 0)
        setFeedback(Array.isArray(res?.feedback) ? res.feedback : [])
      } catch (err: any) {
        if (cancelled) return
        setLoadError(err?.message || "Falha ao carregar avisos")
      }
    }
    load()
    const id = setInterval(load, 60_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [allowed])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  if (!allowed) return null

  const badge = feedback.length + (readyCount > 0 ? 1 : 0) + (reopenedCount > 0 ? 1 : 0)

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
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
            onClick={() => setOpen(false)}
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

              {readyCount > 0 ? (
                <Link
                  href="/kanban"
                  onClick={() => setOpen(false)}
                  className="block rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900 hover:bg-emerald-100"
                >
                  <strong>{readyCount}</strong> pedido{readyCount === 1 ? "" : "s"}{" "}
                  <strong>pronto</strong> — abra a coluna final e marque como entregue
                </Link>
              ) : null}

              {reopenedCount > 0 ? (
                <Link
                  href="/kanban"
                  onClick={() => setOpen(false)}
                  className="block rounded-xl bg-sky-50 px-3 py-2.5 text-sm text-sky-900 hover:bg-sky-100"
                >
                  <strong>{reopenedCount}</strong> reaberto
                  {reopenedCount === 1 ? "" : "s"} no fluxo
                </Link>
              ) : null}

              {!loadError && feedback.length === 0 && readyCount === 0 && reopenedCount === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-[var(--wq-text-muted)]">
                  Sem feedback recente nem pedidos prontos
                </p>
              ) : null}

              {feedback.length > 0 ? (
                <p className="px-2 pt-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--wq-text-muted)]">
                  Avaliações recentes
                </p>
              ) : null}

              {feedback.map((f) => (
                <Link
                  key={f.id}
                  href={`/pedidos?q=${encodeURIComponent(f.code)}`}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-3 py-2 hover:bg-[var(--wq-paper)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-semibold">{f.code}</span>
                    <span className="text-xs font-bold text-[var(--wq-brand)]">{f.score}/5</span>
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
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-[var(--wq-border)] px-3 py-2">
              <Link
                href="/avaliacoes"
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-[var(--wq-brand)] hover:underline"
              >
                Ver todas as avaliações →
              </Link>
              <Link
                href="/pedidos?status=ready"
                onClick={() => setOpen(false)}
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
