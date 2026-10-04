"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createBrandV1, listBrandsV1 } from "@/lib/apiV1"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

export function BrandField({
  id,
  value,
  onChange,
}: {
  id: string
  value: string
  onChange: (name: string) => void
}) {
  const [catalog, setCatalog] = useState<string[]>([])
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setQuery(value)
  }, [value])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await listBrandsV1()
        if (cancelled) return
        const names = (res.brands || [])
          .filter((item) => item.active !== false && item.name)
          .map((item) => item.name)
        setCatalog(names)
      } catch {
        if (!cancelled) setCatalog([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    return catalog.filter((name) => !q || name.toLowerCase().includes(q)).slice(0, 8)
  }, [catalog, query])

  const exact = catalog.some((name) => name.toLowerCase() === query.trim().toLowerCase())

  const apply = (name: string) => {
    onChange(name)
    setQuery(name)
    setOpen(false)
  }

  const commit = async () => {
    const next = query.trim()
    if (savingRef.current) return
    if (!next) {
      apply("")
      return
    }
    const known = catalog.find((name) => name.toLowerCase() === next.toLowerCase())
    if (known) {
      apply(known)
      return
    }
    savingRef.current = true
    setSaving(true)
    try {
      const created = await createBrandV1({ name: next })
      const saved = String(created?.name || next).trim() || next
      setCatalog((prev) => (prev.some((name) => name.toLowerCase() === saved.toLowerCase()) ? prev : [...prev, saved]))
      apply(saved)
    } catch (err: any) {
      toast.error(err?.message || "Falha ao cadastrar a marca")
      apply(next)
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <Input
        id={id}
        value={query}
        disabled={saving}
        placeholder="Buscar ou cadastrar"
        autoComplete="off"
        className="bg-[var(--wq-surface)]"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            void commit()
          }
          if (e.key === "Escape") setOpen(false)
        }}
        onBlur={() => {
          window.setTimeout(() => {
            if (!boxRef.current?.contains(document.activeElement)) {
              void commit()
            }
          }, 120)
        }}
      />
      {open && (matches.length > 0 || (query.trim() && !exact)) ? (
        <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-[var(--wq-border)] bg-[var(--wq-surface)] shadow-md">
          {matches.map((name) => (
            <button
              key={name}
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--wq-paper)]"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => apply(name)}
            >
              {name}
            </button>
          ))}
          {query.trim() && !exact ? (
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-sm font-medium text-[var(--wq-brand-text)] hover:bg-[var(--wq-paper)]"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => void commit()}
            >
              Cadastrar “{query.trim()}”
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
