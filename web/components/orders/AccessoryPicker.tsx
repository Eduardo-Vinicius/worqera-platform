"use client"

import { useEffect, useState } from "react"
import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createAccessoryV1, listAccessoriesV1 } from "@/lib/apiV1"
import { toast } from "sonner"

type CatalogItem = { name: string; active?: boolean }

export function AccessoryPicker({
  value,
  onChange,
}: {
  value: string[]
  onChange: (next: string[]) => void
}) {
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [draft, setDraft] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await listAccessoriesV1()
        if (!cancelled) setCatalog(res.accessories || [])
      } catch {
        if (!cancelled) setCatalog([])
      } finally {
        if (!cancelled) setLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const offered = catalog.filter((item) => item.active !== false && item.name)
  const offeredNames = new Set(offered.map((item) => item.name))
  const extras = value.filter((name) => name && !offeredNames.has(name))

  const toggle = (name: string) => {
    if (value.includes(name)) onChange(value.filter((item) => item !== name))
    else onChange([...value, name])
  }

  const selectName = (name: string) => {
    if (!value.includes(name)) onChange([...value, name])
  }

  const addOther = async () => {
    const next = draft.trim()
    if (!next || saving) return
    const known = catalog.find((item) => item.name.toLowerCase() === next.toLowerCase())
    if (known) {
      selectName(known.name)
      setDraft("")
      return
    }
    setSaving(true)
    try {
      const created = await createAccessoryV1({ name: next })
      const name = String((created as { name?: string })?.name || next).trim() || next
      setCatalog((prev) => [...prev, { name, active: true }])
      selectName(name)
      setDraft("")
    } catch (err: any) {
      if (err?.status === 409 || err?.code === "DUPLICATE") {
        try {
          const res = await listAccessoriesV1()
          const list = res.accessories || []
          setCatalog(list)
          const match = list.find((item) => item.name.toLowerCase() === next.toLowerCase())
          selectName(match?.name || next)
          setDraft("")
          return
        } catch {
          selectName(next)
          setDraft("")
          return
        }
      }
      toast.error(err?.message || "Falha ao cadastrar o acessório")
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) {
    return <p className="text-xs text-[var(--wq-text-muted)]">Carregando acessórios…</p>
  }

  return (
    <div className="space-y-2">
      {offered.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {offered.map((item) => {
            const selected = value.includes(item.name)
            return (
              <button
                key={item.name}
                type="button"
                onClick={() => toggle(item.name)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                  selected
                    ? "border-[var(--wq-brand)]/40 bg-[var(--wq-brand-soft)] text-[var(--wq-text)]"
                    : "border-[var(--wq-border)] text-[var(--wq-text-muted)] hover:border-[var(--wq-brand)]/30"
                }`}
              >
                {item.name}
              </button>
            )
          })}
        </div>
      ) : (
        <p className="text-xs text-[var(--wq-text-muted)]">
          Nenhum acessório ainda. Informe em Outro para gravar o primeiro.
        </p>
      )}
      <div className="flex min-w-0 gap-2">
        <Input
          placeholder="Outro"
          value={draft}
          disabled={saving}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              void addOther()
            }
          }}
          className="h-9 min-w-0 flex-1"
        />
        <Button
          type="button"
          onClick={() => void addOther()}
          disabled={saving || !draft.trim()}
          variant="outline"
          size="sm"
          className="shrink-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {extras.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {extras.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--wq-brand-soft)] px-2.5 py-1 text-xs"
            >
              {name}
              <button type="button" onClick={() => toggle(name)} aria-label="Remover">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
