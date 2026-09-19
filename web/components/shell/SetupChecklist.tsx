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
  hint?: string
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
  const [waOk, setWaOk] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)
  const [printedOk, setPrintedOk] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem("wq-setup-checklist-done") === "1") {
        setDismissed(true)
      }
      if (localStorage.getItem("wq-setup-checklist-open") === "1") {
        setOpen(true)
      }
      if (localStorage.getItem("wq-loop-label-seen") === "1") {
        setPrintedOk(true)
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
        setWaOk(Boolean(doc?.notifications?.whatsapp?.enabled))
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
      label: "Montar seus setores do kanban",
      href: "/settings/setores",
      done: sectorsOk,
      hint: "Nomes únicos da sua empresa",
    },
    {
      id: "brand",
      label: "Marca: logo, cores e nome do item",
      href: "/settings/empresa",
      done: brandOk,
      hint: "Cada empresa com a sua cara",
    },
    {
      id: "order",
      label: "Criar o primeiro pedido",
      href: "/pedidos/novo",
      done: hasOrder,
      hint: "Cliente + item + serviços",
    },
    {
      id: "label",
      label: "Imprimir etiqueta / QR",
      href: hasOrder ? "/pedidos" : "/pedidos/novo",
      done: printedOk || (hasOrder && waOk),
      hint: "Cliente consulta pelo código",
    },
    {
      id: "wa",
      label: "Ativar WhatsApp (avisar cliente)",
      href: "/settings/empresa",
      done: waOk,
      hint: "Loop: criado → move → pronto",
    },
    {
      id: "team",
      label: "Convidar a equipe",
      href: "/settings/equipe",
      done: teamOk,
      hint: "Opcional, mas escala",
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
  const pct = Math.round((doneCount / steps.length) * 100)

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
    <section className="overflow-hidden rounded-2xl border border-[var(--wq-brand)]/25 bg-[var(--wq-surface)] shadow-sm">
      <div className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--wq-brand)]">
              Tour da operação
            </p>
            <span className="rounded-md bg-[var(--wq-brand-soft)] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[var(--wq-brand)]">
              {doneCount}/{steps.length}
            </span>
          </div>
          <h2 className="mt-0.5 text-sm font-semibold text-[var(--wq-text)] sm:text-base">
            Loop do cliente (Status Pack): pedido → etiqueta → consulta → Zap
          </h2>
          <p className="mt-0.5 text-xs text-[var(--wq-text-muted)]">
            Próximo: {next.label}
            {next.hint ? ` · ${next.hint}` : ""}
          </p>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[var(--wq-paper)]">
            <div
              className="h-full rounded-full bg-[var(--wq-brand)] transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={toggle}
            className="rounded-lg p-1.5 text-[var(--wq-text-muted)] hover:bg-[var(--wq-paper)]"
            aria-expanded={open}
            aria-label={open ? "Recolher tour" : "Expandir tour"}
          >
            <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} />
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg p-1.5 text-[var(--wq-text-muted)] hover:bg-[var(--wq-paper)]"
            aria-label="Dispensar tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {open ? (
        <ul className="divide-y divide-[var(--wq-border)] border-t border-[var(--wq-border)]">
          {steps.map((step) => (
            <li key={step.id}>
              <Link
                href={step.href}
                className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-[var(--wq-paper)] sm:px-5"
                onClick={() => {
                  if (step.id === "label") {
                    try {
                      localStorage.setItem("wq-loop-label-seen", "1")
                    } catch {}
                  }
                }}
              >
                {step.done ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--wq-success)] text-white">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                ) : (
                  <Circle className="h-5 w-5 text-[var(--wq-text-muted)]" strokeWidth={1.5} />
                )}
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-sm font-medium",
                      step.done ? "text-[var(--wq-text-muted)] line-through" : "text-[var(--wq-text)]"
                    )}
                  >
                    {step.label}
                  </span>
                  {step.hint ? (
                    <span className="block text-[11px] text-[var(--wq-text-muted)]">{step.hint}</span>
                  ) : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="border-t border-[var(--wq-border)] px-4 py-2.5 sm:px-5">
          <Link
            href={next.href}
            className="text-sm font-semibold text-[var(--wq-brand)] hover:underline"
          >
            Continuar → {next.label}
          </Link>
        </div>
      )}
    </section>
  )
}
