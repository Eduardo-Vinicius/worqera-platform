"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AppHeader } from "@/components/shell/AppHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { listPlatformShopsV1, meV1, patchPlatformShopV1 } from "@/lib/apiV1"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type ShopRow = {
  id: string
  name: string
  slug: string
  status: string
  adminNote?: string
  memberCount?: number
  orderCount?: number
  openCount?: number
  lastOrderAt?: string | null
  trialDaysLeft?: number | null
  createdAt?: string
  subscription?: {
    status?: string
    trialEndsAt?: string
    planCode?: string
  } | null
}

type Filter = "all" | "trialing" | "trial_7d" | "active" | "suspended"

const PLANS = [
  { code: "WORQERA_BASIC", label: "Basic", price: "R$ 147" },
  { code: "WORQERA_PRO", label: "Pro", price: "R$ 297" },
  { code: "WORQERA_BUSINESS", label: "Business", price: "R$ 499" },
] as const

type PlanCode = (typeof PLANS)[number]["code"] | "WORQERA_EARLY" | "WORQERA_PREMIUM" | ""

function planLabel(code?: string | null) {
  const c = String(code || "").toUpperCase()
  if (c === "WORQERA_BASIC" || c === "WORQERA_EARLY") return "Basic"
  if (c === "WORQERA_PRO") return "Pro"
  if (c === "WORQERA_BUSINESS" || c === "WORQERA_PREMIUM") return "Business"
  return "Sem plano"
}

function selectableCode(code?: string | null): PlanCode {
  const c = String(code || "").toUpperCase()
  if (c === "WORQERA_PREMIUM") return "WORQERA_BUSINESS"
  if (c === "WORQERA_BASIC" || c === "WORQERA_PRO" || c === "WORQERA_BUSINESS") return c
  if (c === "WORQERA_EARLY") return "WORQERA_BASIC"
  return "WORQERA_PRO"
}

function planBadgeClass(code?: string | null) {
  const c = String(code || "").toUpperCase()
  if (c === "WORQERA_BASIC" || c === "WORQERA_EARLY")
    return "border-sky-300 bg-sky-50 text-sky-900"
  if (c === "WORQERA_PRO") return "border-violet-300 bg-violet-50 text-violet-900"
  if (c === "WORQERA_BUSINESS" || c === "WORQERA_PREMIUM")
    return "border-amber-300 bg-amber-50 text-amber-950"
  return "border-[var(--wq-border)] bg-[var(--wq-paper)] text-[var(--wq-text-muted)]"
}

export default function PlatformShopsPage() {
  const [shops, setShops] = useState<ShopRow[]>([])
  const [q, setQ] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})
  const [planDrafts, setPlanDrafts] = useState<Record<string, PlanCode>>({})
  const [openId, setOpenId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [savingNote, setSavingNote] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const me = await meV1()
      if (!me?.platformAdmin) {
        setAllowed(false)
        toast.error("Acesso restrito ao time Worqera")
        return
      }
      setAllowed(true)
      const res = await listPlatformShopsV1({ q: q.trim() || undefined })
      const list = res.shops || []
      setShops(list)
      setNoteDrafts(
        Object.fromEntries(list.map((s: ShopRow) => [s.id, s.adminNote || ""]))
      )
      setPlanDrafts(
        Object.fromEntries(
          list.map((s: ShopRow) => [s.id, selectableCode(s.subscription?.planCode)])
        )
      )
    } catch (err: any) {
      toast.error(err?.message || "Erro ao listar oficinas")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    return shops.filter((s) => {
      if (filter === "all") return true
      if (filter === "suspended") return s.status === "suspended"
      if (filter === "active") return s.subscription?.status === "active"
      if (filter === "trialing") return s.subscription?.status === "trialing"
      if (filter === "trial_7d") {
        return (
          s.subscription?.status === "trialing" &&
          s.trialDaysLeft != null &&
          s.trialDaysLeft <= 7
        )
      }
      return true
    })
  }, [shops, filter])

  const planStats = useMemo(() => {
    const counts = {
      WORQERA_BASIC: 0,
      WORQERA_PRO: 0,
      WORQERA_BUSINESS: 0,
      none: 0,
    }
    for (const s of shops) {
      const code = selectableCode(s.subscription?.planCode)
      if (s.subscription?.status === "active" || s.subscription?.status === "trialing") {
        if (code === "WORQERA_BASIC") counts.WORQERA_BASIC += 1
        else if (code === "WORQERA_PRO") counts.WORQERA_PRO += 1
        else if (code === "WORQERA_BUSINESS") counts.WORQERA_BUSINESS += 1
        else counts.none += 1
      } else {
        counts.none += 1
      }
    }
    return counts
  }, [shops])

  const extend = async (id: string) => {
    setBusyId(id)
    try {
      await patchPlatformShopV1(id, { extendTrialDays: 7 })
      toast.success("Trial estendido +7 dias")
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Falha ao estender")
    } finally {
      setBusyId(null)
    }
  }

  const setStatus = async (id: string, status: "active" | "suspended") => {
    setBusyId(id)
    try {
      await patchPlatformShopV1(id, { status })
      toast.success(status === "suspended" ? "Oficina suspensa" : "Oficina reativada")
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Falha ao atualizar")
    } finally {
      setBusyId(null)
    }
  }

  const applyPlan = async (id: string) => {
    const planCode = planDrafts[id] || "WORQERA_PRO"
    const plan = PLANS.find((p) => p.code === planCode)
    setBusyId(id)
    try {
      await patchPlatformShopV1(id, {
        subscriptionStatus: "active",
        planCode,
        status: "active",
        adminNote:
          (noteDrafts[id] || "").trim() ||
          `${plan?.label || planCode} ${plan?.price || ""} · Manual`.trim(),
      })
      toast.success(`Plano ${plan?.label || planCode} aplicado`)
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Falha ao aplicar plano")
    } finally {
      setBusyId(null)
    }
  }

  const revokePlan = async (id: string) => {
    if (
      !window.confirm(
        "Revogar assinatura? A oficina volta para trial cancelado/expirado até você liberar de novo."
      )
    ) {
      return
    }
    setBusyId(id)
    try {
      await patchPlatformShopV1(id, {
        subscriptionStatus: "canceled",
      })
      toast.success("Assinatura revogada")
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Falha ao revogar")
    } finally {
      setBusyId(null)
    }
  }

  const saveNote = async (id: string) => {
    setSavingNote(id)
    try {
      await patchPlatformShopV1(id, { adminNote: noteDrafts[id] || "" })
      toast.success("Nota salva")
      setShops((prev) =>
        prev.map((s) => (s.id === id ? { ...s, adminNote: noteDrafts[id] || "" } : s))
      )
    } catch (err: any) {
      toast.error(err?.message || "Falha ao salvar nota")
    } finally {
      setSavingNote(null)
    }
  }

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "Todas" },
    { id: "trial_7d", label: "Trial ≤7d" },
    { id: "trialing", label: "Em trial" },
    { id: "active", label: "Ativas (pagas)" },
    { id: "suspended", label: "Suspensas" },
  ]

  if (!loading && !allowed) {
    return (
      <div className="p-8">
        <p className="text-[var(--wq-danger)]">Sem permissão de platform admin.</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard">Voltar</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="-mx-3 -mt-4 sm:-mx-5 sm:-mt-6 md:-mx-8 md:-mt-7">
      <AppHeader
        title="Oficinas"
        subtitle="Quem está no ar, em trial ou suspensa"
      />

      <div className="mx-auto max-w-[860px] space-y-4 px-3 py-4 sm:px-5 sm:py-6 md:px-8">
        <p className="text-sm text-[var(--wq-text-muted)]">
          Basic {planStats.WORQERA_BASIC} · Pro {planStats.WORQERA_PRO} · Business {planStats.WORQERA_BUSINESS}
        </p>

        <div className="flex flex-wrap gap-2">
          <Input
            className="min-w-0 w-full max-w-sm rounded-[10px] sm:w-auto"
            placeholder="Buscar nome ou slug…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
          />
          <Button type="button" variant="outline" className="rounded-[10px]" onClick={load}>
            Buscar
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <Button
              key={f.id}
              type="button"
              size="sm"
              variant={filter === f.id ? "default" : "outline"}
              className={cn(
                "rounded-[10px]",
                filter === f.id && "bg-[var(--wq-brand)] hover:bg-[var(--wq-brand-deep)]"
              )}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        <ul className="divide-y divide-[var(--wq-border)] overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
          {loading && (
            <li className="px-4 py-10 text-center text-sm text-[var(--wq-text-muted)]">Carregando…</li>
          )}
          {!loading && filtered.length === 0 && (
            <li className="px-4 py-10 text-center text-sm text-[var(--wq-text-muted)]">
              Nenhuma oficina neste filtro.
            </li>
          )}
          {filtered.map((s) => {
            const open = openId === s.id
            const urgent =
              s.subscription?.status === "trialing" &&
              s.trialDaysLeft != null &&
              s.trialDaysLeft <= 3
            const busy = busyId === s.id
            const draft = planDrafts[s.id] || "WORQERA_PRO"
            const statusLabel =
              s.status === "suspended"
                ? "Suspensa"
                : s.subscription?.status === "trialing"
                  ? s.trialDaysLeft != null && s.trialDaysLeft <= 0
                    ? "Trial hoje"
                    : `Trial ${s.trialDaysLeft ?? "—"}d`
                  : s.subscription?.status === "active"
                    ? "Ativa"
                    : s.subscription?.status || "Sem plano"
            return (
              <li key={s.id} className={cn(urgent && "bg-amber-50/70")}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  onClick={() => setOpenId(open ? null : s.id)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{s.name}</p>
                    <p className="truncate text-xs text-[var(--wq-text-muted)]">{s.slug}</p>
                  </div>
                  <span
                    className={cn(
                      "hidden shrink-0 rounded-lg border px-2 py-0.5 text-xs font-medium sm:inline-flex",
                      planBadgeClass(s.subscription?.planCode)
                    )}
                  >
                    {planLabel(s.subscription?.planCode)}
                  </span>
                  <span className="shrink-0 text-xs text-[var(--wq-text-muted)]">{statusLabel}</span>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-[var(--wq-text-muted)]">
                    {s.openCount ?? 0}/{s.orderCount ?? 0}
                  </span>
                </button>
                {open ? (
                  <div className="space-y-3 border-t border-[var(--wq-border)] px-4 py-3">
                    <p className="text-xs text-[var(--wq-text-muted)]">
                      {s.memberCount ?? 0} pessoas
                      {s.lastOrderAt
                        ? ` · último pedido ${new Date(s.lastOrderAt).toLocaleDateString("pt-BR")}`
                        : " · sem pedidos"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <select
                        className="h-9 rounded-[10px] border border-[var(--wq-border)] bg-[var(--wq-paper)] px-2 text-sm"
                        value={draft}
                        disabled={busy}
                        onChange={(e) =>
                          setPlanDrafts((d) => ({ ...d, [s.id]: e.target.value as PlanCode }))
                        }
                      >
                        {PLANS.map((p) => (
                          <option key={p.code} value={p.code}>
                            {p.label} · {p.price}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        size="sm"
                        className="rounded-[10px] bg-[var(--wq-action)] text-white hover:bg-[var(--wq-action)]/90"
                        disabled={busy}
                        onClick={() => applyPlan(s.id)}
                      >
                        Aplicar plano
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="rounded-[10px]" disabled={busy} onClick={() => extend(s.id)}>
                        +7 dias
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-[10px]"
                        disabled={busy || s.subscription?.status === "canceled"}
                        onClick={() => revokePlan(s.id)}
                      >
                        Revogar
                      </Button>
                      {s.status === "suspended" ? (
                        <Button type="button" size="sm" variant="outline" className="rounded-[10px]" disabled={busy} onClick={() => setStatus(s.id, "active")}>
                          Reativar
                        </Button>
                      ) : (
                        <Button type="button" size="sm" variant="outline" className="rounded-[10px]" disabled={busy} onClick={() => setStatus(s.id, "suspended")}>
                          Suspender
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        className="h-9 flex-1 rounded-[10px] text-sm"
                        placeholder="Nota interna"
                        value={noteDrafts[s.id] ?? ""}
                        onChange={(e) => setNoteDrafts((d) => ({ ...d, [s.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            saveNote(s.id)
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={savingNote === s.id}
                        onClick={() => saveNote(s.id)}
                      >
                        {savingNote === s.id ? "…" : "Salvar nota"}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
        <p className="text-xs text-[var(--wq-text-muted)]">
          Clique na oficina para plano, trial, suspensão e nota. Pedidos = abertos / total.
        </p>
      </div>
    </div>
  )
}
