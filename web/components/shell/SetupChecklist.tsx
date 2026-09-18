"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Check, Circle } from "lucide-react"
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

  return (
    <section className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] px-4 py-4 sm:px-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--wq-text-muted)]">
            Começar bem
          </p>
          <h3 className="text-sm font-semibold text-[var(--wq-text)] sm:text-base">
            Checklist da oficina ({doneCount}/{core.length})
          </h3>
        </div>
        <button
          type="button"
          className="text-xs text-[var(--wq-text-muted)] hover:text-[var(--wq-text)]"
          onClick={() => {
            try {
              localStorage.setItem("wq-setup-checklist-done", "1")
            } catch {}
            setDismissed(true)
          }}
        >
          Dispensar
        </button>
      </div>
      <ul className="space-y-2">
        {steps.map((step) => (
          <li key={step.id}>
            <Link
              href={step.href}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition hover:bg-[var(--wq-paper)]",
                step.done ? "text-[var(--wq-text-muted)]" : "text-[var(--wq-text)]"
              )}
            >
              {step.done ? (
                <Check className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-[var(--wq-brand)]" />
              )}
              <span className={cn(step.done && "line-through")}>{step.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
