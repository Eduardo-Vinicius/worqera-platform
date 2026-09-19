"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Check, ChevronDown, Circle, X } from "lucide-react"
import { cn } from "@/lib/utils"

type Step = {
  id: string
  label: string
  href: string
  done: boolean
}

/** Compact, dismissible setup hints — not a loud tour. */
export function SetupChecklist({
  openOrders,
  totalClients,
}: {
  openOrders: number
  totalClients: number
}) {
  const [sectorsOk, setSectorsOk] = useState(false)
  const [brandOk, setBrandOk] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem("wq-setup-checklist-done") === "1") {
        setDismissed(true)
      }
    } catch {}
    let cancelled = false
    ;(async () => {
      try {
        const mod = await import("@/lib/apiV1")
        const [sectors, shop] = await Promise.all([
          mod.listSectorsV1().catch(() => ({ sectors: [] })),
          mod.getShopCurrentV1().catch(() => null),
        ])
        if (cancelled) return
        const active = (sectors.sectors || []).filter((s: any) => s.active !== false)
        setSectorsOk(active.length >= 2)
        const doc = shop?.shop || shop
        setBrandOk(Boolean(doc?.branding?.logoUrl || doc?.branding?.displayName))
      } catch {
        // ignore
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (dismissed || !ready) return null

  const hasOrder = openOrders > 0 || totalClients > 0

  const steps: Step[] = [
    {
      id: "sectors",
      label: "Conferir setores do kanban",
      href: "/settings/setores",
      done: sectorsOk,
    },
    {
      id: "order",
      label: "Criar o primeiro pedido",
      href: "/pedidos/novo",
      done: hasOrder,
    },
    {
      id: "brand",
      label: "Marca da empresa (opcional)",
      href: "/settings/empresa",
      done: brandOk,
    },
  ]

  const doneCount = steps.filter((s) => s.done).length
  if (doneCount >= steps.length) {
    try {
      localStorage.setItem("wq-setup-checklist-done", "1")
    } catch {}
    return null
  }

  const next = steps.find((s) => !s.done) || steps[0]

  const dismiss = () => {
    try {
      localStorage.setItem("wq-setup-checklist-done", "1")
    } catch {}
    setDismissed(true)
  }

  return (
    <section className="rounded-xl border border-[var(--wq-border)] bg-[var(--wq-paper)]/80 px-3 py-2.5 sm:px-4">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 text-xs text-[var(--wq-text-muted)]">
          <span className="font-medium text-[var(--wq-text)]">Começar</span>
          {" · "}
          {doneCount}/{steps.length}
          {" · "}
          <Link href={next.href} className="text-[var(--wq-brand)] hover:underline">
            {next.label}
          </Link>
        </p>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-md p-1 text-[var(--wq-text-muted)] hover:bg-[var(--wq-surface)]"
          aria-label={open ? "Recolher" : "Expandir"}
        >
          <ChevronDown className={cn("h-3.5 w-3.5 transition", open && "rotate-180")} />
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-md p-1 text-[var(--wq-text-muted)] hover:bg-[var(--wq-surface)]"
          aria-label="Dispensar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {open ? (
        <ul className="mt-2 space-y-1 border-t border-[var(--wq-border)] pt-2">
          {steps.map((step) => (
            <li key={step.id}>
              <Link
                href={step.href}
                className="flex items-center gap-2 rounded-lg px-1 py-1 text-xs hover:bg-[var(--wq-surface)]"
              >
                {step.done ? (
                  <Check className="h-3.5 w-3.5 text-[var(--wq-success)]" strokeWidth={2.5} />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-[var(--wq-text-muted)]" strokeWidth={1.5} />
                )}
                <span
                  className={cn(
                    step.done ? "text-[var(--wq-text-muted)] line-through" : "text-[var(--wq-text)]"
                  )}
                >
                  {step.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
