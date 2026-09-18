"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Loader2 } from "lucide-react"
import { getPedidosConsultaService } from "@/lib/apiService"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type Hit = { id: string; code: string; client: string; status?: string }

export function QuickOrderJump() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const [hits, setHits] = useState<Hit[]>([])
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen(true)
        return
      }
      if (e.key === "Escape") setOpen(false)
    }
    const onOpen = () => setOpen(true)
    window.addEventListener("keydown", onKey)
    window.addEventListener("wq-open-order-jump", onOpen)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("wq-open-order-jump", onOpen)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setQ("")
    setHits([])
    setActive(0)
    const t = setTimeout(() => inputRef.current?.focus(), 30)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const code = q.trim()
    if (code.length < 1) {
      setHits([])
      return
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await getPedidosConsultaService(
          { codigo: code, limit: 8 },
          { forceRefresh: true }
        )
        if (cancelled) return
        const list = (res?.data || []) as any[]
        setHits(
          (Array.isArray(list) ? list : []).map((o) => ({
            id: String(o.id || o._id),
            code: String(o.code || o.codigo || ""),
            client: String(o.clientName || o.clienteNome || o.client?.name || "Cliente"),
            status: o.status,
          }))
        )
        setActive(0)
      } catch {
        if (!cancelled) setHits([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 220)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [q, open])

  const go = (hit: Hit) => {
    setOpen(false)
    router.push(`/pedidos?q=${encodeURIComponent(hit.code)}`)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/40 px-3 pt-[12vh]">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Fechar" onClick={() => setOpen(false)} />
      <div
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-[var(--wq-border)] px-3 py-2.5">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-[var(--wq-text-muted)]" />
          ) : (
            <Search className="h-4 w-4 text-[var(--wq-text-muted)]" />
          )}
          <Input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Código do pedido… (⌘K)"
            className="border-0 bg-transparent shadow-none focus-visible:ring-0"
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault()
                setActive((i) => Math.min(i + 1, Math.max(0, hits.length - 1)))
              } else if (e.key === "ArrowUp") {
                e.preventDefault()
                setActive((i) => Math.max(0, i - 1))
              } else if (e.key === "Enter" && hits[active]) {
                e.preventDefault()
                go(hits[active])
              }
            }}
          />
          <kbd className="hidden rounded border border-[var(--wq-border)] px-1.5 py-0.5 text-[10px] text-[var(--wq-text-muted)] sm:inline">
            esc
          </kbd>
        </div>
        <ul className="max-h-72 overflow-y-auto p-1.5">
          {q.trim() && !loading && hits.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-[var(--wq-text-muted)]">Nenhum pedido</li>
          ) : null}
          {!q.trim() ? (
            <li className="px-3 py-6 text-center text-sm text-[var(--wq-text-muted)]">
              Digite o código (ex.: 0003)
            </li>
          ) : null}
          {hits.map((h, i) => (
            <li key={h.id}>
              <button
                type="button"
                onClick={() => go(h)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm",
                  i === active ? "bg-[var(--wq-brand-soft)]" : "hover:bg-[var(--wq-paper)]"
                )}
              >
                <span>
                  <span className="font-mono font-semibold text-[var(--wq-text)]">{h.code}</span>
                  <span className="ml-2 text-[var(--wq-text-muted)]">{h.client}</span>
                </span>
                {h.status ? (
                  <span className="text-[10px] uppercase text-[var(--wq-text-muted)]">{h.status}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
