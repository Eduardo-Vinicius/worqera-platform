"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Check, Loader2, Plus, UserRound } from "lucide-react"
import { toast } from "sonner"
import { createAttendantV1, listAttendantsV1, type Attendant } from "@/lib/apiV1"
import { cn } from "@/lib/utils"

const lastKey = () => `wq-opened-by:${typeof window === "undefined" ? "" : localStorage.getItem("shopId") || ""}`

export function rememberOpenedBy(id: string | null) {
  try {
    if (id) localStorage.setItem(lastKey(), id)
  } catch {
    /* private mode */
  }
}

type Props = {
  value: string | null
  onChange: (id: string | null, name: string) => void
  /** Edit mode: who opened it, even if that person is no longer an attendant. */
  currentName?: string
  /** Pre-select the last attendant used on this device (new orders only). */
  preselect?: boolean
  error?: string
  /** Reports whether the shop has attendants, so the form knows if the field is required. */
  onLoaded?: (count: number) => void
}

/** "Aberto por": one tap on a chip. The first thing on the order form. */
export function OpenedByBar({ value, onChange, currentName, preselect = false, error, onLoaded }: Props) {
  const [list, setList] = useState<Attendant[] | null>(null)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)
  const [canManage, setCanManage] = useState(false)

  useEffect(() => {
    const role = String(localStorage.getItem("role") || "").toLowerCase()
    setCanManage(role === "owner" || role === "admin")
    let cancelled = false
    listAttendantsV1()
      .then((rows) => {
        if (cancelled) return
        setList(rows)
        onLoaded?.(rows.length)
        if (preselect && !value) {
          const last = localStorage.getItem(lastKey())
          const hit = rows.find((r) => r.id === last) || (rows.length === 1 ? rows[0] : null)
          if (hit) onChange(hit.id, hit.name)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setList([])
          onLoaded?.(0)
        }
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const add = async () => {
    const clean = name.trim()
    if (clean.length < 2) return
    setSaving(true)
    try {
      const created = await createAttendantV1(clean)
      const next = [...(list || []), created].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
      setList(next)
      onLoaded?.(next.length)
      onChange(created.id, created.name)
      setName("")
      setAdding(false)
      toast.success(`${created.name} cadastrado para atender`)
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível cadastrar")
    } finally {
      setSaving(false)
    }
  }

  const missing = currentName && value && list && !list.some((a) => a.id === value)

  return (
    <section
      className={cn(
        "rounded-xl border bg-[var(--wq-paper)] px-3 py-2.5",
        error ? "border-[var(--wq-danger)]" : "border-[var(--wq-border)]"
      )}
      aria-label="Aberto por"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">
          <UserRound className="h-3.5 w-3.5" />
          Aberto por
        </span>

        {list === null ? (
          <Loader2 className="h-4 w-4 animate-spin text-[var(--wq-text-muted)]" />
        ) : list.length === 0 && !missing ? (
          <span className="text-sm text-[var(--wq-text-muted)]">
            Cadastre quem atende para medir o atendimento.{" "}
            {canManage ? (
              <button type="button" className="font-semibold text-[var(--wq-brand-text)] underline" onClick={() => setAdding(true)}>
                Cadastrar agora
              </button>
            ) : (
              <Link href="/funcionarios" className="font-semibold text-[var(--wq-brand-text)] underline">
                Funcionários
              </Link>
            )}
          </span>
        ) : (
          <div className="flex flex-wrap gap-1.5" role="radiogroup">
            {missing ? (
              <span className="inline-flex h-8 items-center gap-1 rounded-full border border-[var(--wq-brand)] bg-[var(--wq-brand-soft)] px-3 text-sm font-semibold text-[var(--wq-text)]">
                <Check className="h-3.5 w-3.5" />
                {currentName}
              </span>
            ) : null}
            {list.map((a) => {
              const on = a.id === value
              return (
                <button
                  key={a.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => onChange(a.id, a.name)}
                  className={cn(
                    "inline-flex h-8 items-center gap-1 rounded-full border px-3 text-sm transition",
                    on
                      ? "border-[var(--wq-brand)] bg-[var(--wq-brand)] font-semibold text-white shadow-sm"
                      : "border-[var(--wq-border)] bg-[var(--wq-surface)] text-[var(--wq-text)] hover:border-[var(--wq-brand)]/50"
                  )}
                >
                  {on ? <Check className="h-3.5 w-3.5" /> : null}
                  {a.name}
                </button>
              )
            })}
          </div>
        )}

        {canManage && list !== null && list.length > 0 && !adding ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex h-8 items-center gap-1 rounded-full border border-dashed border-[var(--wq-border)] px-3 text-sm text-[var(--wq-text-muted)] hover:text-[var(--wq-text)]"
          >
            <Plus className="h-3.5 w-3.5" />
            Cadastrar
          </button>
        ) : null}

        {adding ? (
          <span className="flex items-center gap-1.5">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  void add()
                }
                if (e.key === "Escape") setAdding(false)
              }}
              placeholder="Nome de quem atende"
              maxLength={60}
              className="h-8 w-44 rounded-full border border-[var(--wq-border)] bg-[var(--wq-surface)] px-3 text-sm outline-none focus:border-[var(--wq-brand)]"
            />
            <button
              type="button"
              disabled={saving || name.trim().length < 2}
              onClick={() => void add()}
              className="inline-flex h-8 items-center rounded-full bg-[var(--wq-brand)] px-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Salvar"}
            </button>
            <button type="button" onClick={() => setAdding(false)} className="text-sm text-[var(--wq-text-muted)]">
              Cancelar
            </button>
          </span>
        ) : null}
      </div>
      {error ? <p className="mt-1 text-xs text-[var(--wq-danger)]">{error}</p> : null}
    </section>
  )
}
