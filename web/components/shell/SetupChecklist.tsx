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

export function SetupChecklist({
  openOrders,
  totalClients,
}: {
  openOrders: number
  totalClients: number
}) {
  const [sectorsOk, setSectorsOk] = useState(false)
  const [teamOk, setTeamOk] = useState(false)
  const [brandOk, setBrandOk] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem("wq-setup-checklist-done") === "1") {
        setDismissed(true)
      }
      if (localStorage.getItem("wq-setup-checklist-open") === "1") {
        setOpen(true)
      }
    } catch {}
    let cancelled = false
    ;(async () => {
      try {
        const mod = await import("@/lib/apiV1")
        const [sectors, members, shop] = await Promise.all([
          mod.listSectorsV1().catch(() => ({ sectors: [] })),
          mod.listShopMembersV1().catch(() => ({ members: [] })),
          mod.getShopCurrentV1().catch(() => null),
        ])
        if (cancelled) return
        const active = (sectors.sectors || []).filter((s: any) => s.active !== false)
        setSectorsOk(active.length >= 2)
        const mem = Array.isArray(members) ? members : members.members || []
        setTeamOk(mem.length > 1)
        const doc = shop?.shop || shop
        setBrandOk(Boolean(doc?.branding?.logoUrl || doc?.branding?.primaryColor))
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

  const steps: Step[] = [
    {
      id: "sectors",
      label: "Configurar setores do kanban",
      href: "/settings/setores",
      done: sectorsOk,
    },
    {
      id: "brand",
      label: "Colocar logo e cores da oficina",
      href: "/settings/empresa",
      done: brandOk,
    },
    {
      id: "order",
      label: "Criar o primeiro pedido",
      href: "/pedidos/novo",
      done: openOrders > 0 || totalClients > 0,
    },
    {
      id: "team",
      label: "Convidar alguém da equipe",
      href: "/settings/equipe",
      done: teamOk,
    },
    {
      id: "tv",
      label: "Abrir TV Cliente ou Oficina",
      href: "/settings/tv",
      done: false,
    },
  ]

  const core = steps.filter((s) => s.id !== "tv")
  const doneCount = core.filter((s) => s.done).length
  if (doneCount >= core.length) {
    try {
      localStorage.setItem("wq-setup-checklist-done", "1")
    } catch {}
    return null
  }

  const next = steps.find((s) => !s.done) || steps[0]
  const pct = Math.round((doneCount / core.length) * 100)

  const dismiss = () => {
    try {
      localStorage.setItem("wq-setup-checklist-done", "1")
    } catch {}
    setDismissed(true)
  }

  const toggle = () => {
    setOpen((v) => {
      const nextOpen = !v
      try {
        localStorage.setItem("wq-setup-checklist-open", nextOpen ? "1" : "0")
      } catch {}
      return nextOpen
    })
  }

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
      <div className="flex items-center gap-2 px-3 py-2 sm:px-3.5">
        <button
          type="button"
          onClick={toggle}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
          aria-expanded={open}
        >
          <span className="relative h-1.5 w-14 shrink-0 overflow-hidden rounded-full bg-[var(--wq-paper)] sm:w-16">
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-[var(--wq-brand)] transition-[width]"
              style={{ width: `${pct}%` }}
            />
          </span>
          <span className="min-w-0 flex-1 truncate text-sm text-[var(--wq-text)]">
            <span className="font-medium">Setup</span>
            <span className="text-[var(--wq-text-muted)]">
              {" "}
              {doneCount}/{core.length}
            </span>
            {!open && next ? (
              <span className="hidden text-[var(--wq-text-muted)] sm:inline">
                {" "}
                · {next.label}
              </span>
            ) : null}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-[var(--wq-text-muted)] transition-transform",
              open && "rotate-180"
            )}
          />
        </button>
        {!open && next ? (
          <Link
            href={next.href}
            className="shrink-0 rounded-lg bg-[var(--wq-brand)] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[var(--wq-brand-deep)]"
          >
            Continuar
          </Link>
        ) : null}
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-md p-1 text-[var(--wq-text-muted)] hover:bg-[var(--wq-paper)] hover:text-[var(--wq-text)]"
          aria-label="Dispensar checklist"
          title="Dispensar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {open ? (
        <ul className="space-y-0.5 border-t border-[var(--wq-border)] px-2 py-2">
          {steps.map((step) => (
            <li key={step.id}>
              <Link
                href={step.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition hover:bg-[var(--wq-paper)]",
                  step.done ? "text-[var(--wq-text-muted)]" : "text-[var(--wq-text)]"
                )}
              >
                {step.done ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                ) : (
                  <Circle className="h-3.5 w-3.5 shrink-0 text-[var(--wq-brand)]" />
                )}
                <span className={cn("truncate", step.done && "line-through")}>{step.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
