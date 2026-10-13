"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"
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
  const [ready, setReady] = useState(false)
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
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    return catalog.filter((name) => !q || name.toLowerCase().includes(q)).slice(0, 40)
  }, [catalog, query])

  const exact = catalog.some((name) => name.toLowerCase() === query.trim().toLowerCase())
  const typed = query.trim()

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
      toast.success("Marca cadastrada")
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
      <div className="relative">
        <Input
          id={id}
          value={query}
          disabled={saving}
          placeholder="Pesquisar marca"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          className="bg-[var(--wq-surface)] pr-10"
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
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
        <button
          type="button"
          className="absolute top-1 right-1 flex h-8 w-8 items-center justify-center rounded-md text-[var(--wq-text-muted)] hover:bg-[var(--wq-paper)] hover:text-[var(--wq-text)]"
          aria-label={open ? "Fechar marcas" : "Ver marcas"}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setOpen((current) => !current)}
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      <p className="mt-1.5 text-xs text-[var(--wq-text-muted)]">
        {ready && catalog.length === 0
          ? "Nenhuma marca ainda. Digite o nome e cadastre."
          : ready
            ? `${catalog.length} ${catalog.length === 1 ? "marca" : "marcas"}. Pesquise na lista. Se não achar, cadastre.`
            : "Pesquise na lista. Se não achar, cadastre."}
      </p>
      {open ? (
        <div
          id={`${id}-list`}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-[var(--wq-border)] bg-[var(--wq-surface)] shadow-lg"
        >
          {matches.length ? (
            matches.map((name) => (
              <button
                key={name}
                type="button"
                role="option"
                className="block w-full px-3 py-2.5 text-left text-sm text-[var(--wq-text)] hover:bg-[var(--wq-paper)]"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => apply(name)}
              >
                {name}
              </button>
            ))
          ) : (
            <p className="px-3 py-2.5 text-sm text-[var(--wq-text-muted)]">Nenhuma marca com esse nome.</p>
          )}
          {typed && !exact ? (
            <button
              type="button"
              className="sticky bottom-0 block w-full border-t border-[var(--wq-border)] bg-[var(--wq-brand-soft)] px-3 py-2.5 text-left text-sm font-semibold text-[var(--wq-brand-text)]"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => void commit()}
            >
              Cadastrar “{typed}”
            </button>
          ) : (
            <p className="border-t border-[var(--wq-border)] px-3 py-2 text-xs text-[var(--wq-text-muted)]">
              Não achou? Digite o nome e cadastre.
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}
