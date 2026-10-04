"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { listAccessoriesV1 } from "@/lib/apiV1"

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

  if (!loaded) {
    return <p className="text-xs text-[var(--wq-text-muted)]">Carregando acessórios…</p>
  }

  if (offered.length === 0 && extras.length === 0) {
    return (
      <p className="text-xs text-[var(--wq-text-muted)]">
        Nenhum acessório nesta loja. O admin cadastra em Configuração → Acessórios.
      </p>
    )
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
      ) : null}
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
