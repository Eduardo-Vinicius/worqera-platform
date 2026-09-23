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
  if (c === "WORQERA_BASIC") return "Basic · R$ 147"
  if (c === "WORQERA_PRO") return "Pro · R$ 297"
  if (c === "WORQERA_BUSINESS" || c === "WORQERA_PREMIUM") return "Business · R$ 499"
  if (c === "WORQERA_EARLY") return "Early (legado) · R$ 147"
  return c || "—"
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
  const [savingNote, setSavingNote] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

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
        title="Oficinas (Worqera)"
        subtitle={`${filtered.length} listada${filtered.length === 1 ? "" : "s"} · planos Basic / Pro / Business`}
      />

      <div className="mx-auto max-w-[1180px] space-y-4 px-3 py-4 sm:px-5 sm:py-6 md:px-8">
        <section className="overflow-hidden rounded-2xl border-2 border-[var(--wq-brand)]/35 bg-[var(--wq-brand-soft)]/50 p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--wq-brand)]">
                Planos Worqera
              </p>
              <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--wq-text)] sm:text-2xl">
                Ladder comercial
              </h2>
              <p className="text-xs text-[var(--wq-text-muted)] sm:text-sm">
                Ative ou troque o plano por oficina · Basic 147 · Pro 297 · Business 499
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {PLANS.map((p) => {
              const n =
                p.code === "WORQERA_BASIC"
                  ? planStats.WORQERA_BASIC
                  : p.code === "WORQERA_PRO"
                    ? planStats.WORQERA_PRO
                    : planStats.WORQERA_BUSINESS
              return (
                <div
                  key={p.code}
                  className={cn(
                    "rounded-xl border bg-white px-3 py-3 shadow-sm",
                    planBadgeClass(p.code)
                  )}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-bold">{p.label}</p>
                    <p className="font-mono text-sm font-semibold">{p.price}</p>
                  </div>
                  <p className="mt-1 text-xs opacity-80">
                    {n} oficina{n === 1 ? "" : "s"} neste plano
                  </p>
                </div>
              )
            })}
          </div>
        </section>

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

        <div className="overflow-x-auto rounded-2xl border border-[var(--wq-border)] bg-white">
          <div className="hidden min-w-[860px] grid-cols-[1.2fr_1fr_1.4fr_70px_70px_160px] gap-3 border-b border-[var(--wq-border)] bg-[var(--wq-paper)] px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--wq-text-muted)] md:grid">
            <span>Oficina</span>
            <span>Assinatura</span>
            <span>Plano</span>
            <span>Pedidos</span>
            <span>Membros</span>
            <span>Ações</span>
          </div>
          <ul className="min-w-[860px] divide-y divide-[var(--wq-border)] md:min-w-0">
            {loading && (
              <li className="px-4 py-10 text-center text-sm text-[var(--wq-text-muted)]">
                Carregando…
              </li>
            )}
            {!loading && filtered.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-[var(--wq-text-muted)]">
                Nenhuma oficina neste filtro.
              </li>
            )}
            {filtered.map((s) => {
              const urgent =
                s.subscription?.status === "trialing" &&
                s.trialDaysLeft != null &&
                s.trialDaysLeft <= 3
              const busy = busyId === s.id
              const draft = planDrafts[s.id] || "WORQERA_PRO"
              const current = String(s.subscription?.planCode || "").toUpperCase()
              const dirty =
                draft !== selectableCode(s.subscription?.planCode) ||
                s.subscription?.status !== "active"
              return (
                <li
                  key={s.id}
                  className={cn(
                    "grid gap-2 px-4 py-3 md:grid-cols-[1.2fr_1fr_1.4fr_70px_70px_160px] md:items-start",
                    urgent && "bg-amber-50/80"
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{s.name}</p>
                    <p className="truncate font-mono text-xs text-[var(--wq-text-muted)]">
                      {s.slug} · {s.status}
                    </p>
                  </div>
                  <div className="text-sm">
                    <p className="capitalize">{s.subscription?.status || "—"}</p>
                    <span
                      className={cn(
                        "mt-1 inline-flex rounded-lg border px-2 py-0.5 text-xs font-semibold",
                        planBadgeClass(s.subscription?.planCode)
                      )}
                    >
                      {planLabel(s.subscription?.planCode)}
                    </span>
                    {s.subscription?.status === "trialing" && s.trialDaysLeft != null ? (
                      <p
                        className={cn(
                          "text-xs",
                          s.trialDaysLeft <= 3
                            ? "font-semibold text-amber-800"
                            : "text-[var(--wq-text-muted)]"
                        )}
                      >
                        {s.trialDaysLeft <= 0
                          ? "Trial expirado / hoje"
                          : `${s.trialDaysLeft}d restantes`}
                      </p>
                    ) : s.subscription?.trialEndsAt ? (
                      <p className="text-xs text-[var(--wq-text-muted)]">
                        até {new Date(s.subscription.trialEndsAt).toLocaleDateString("pt-BR")}
                      </p>
                    ) : null}
                    {s.lastOrderAt ? (
                      <p className="text-[10px] text-[var(--wq-text-muted)]">
                        último pedido {new Date(s.lastOrderAt).toLocaleDateString("pt-BR")}
                      </p>
                    ) : (
                      <p className="text-[10px] text-[var(--wq-text-muted)]">sem pedidos</p>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-[var(--wq-brand)]/25 bg-[var(--wq-brand-soft)]/40 p-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--wq-brand)]">
                      Plano
                    </p>
                    <select
                      className="h-9 w-full rounded-[8px] border border-[var(--wq-border)] bg-white px-2 text-xs font-medium"
                      value={draft}
                      disabled={busy}
                      onChange={(e) =>
                        setPlanDrafts((d) => ({
                          ...d,
                          [s.id]: e.target.value as PlanCode,
                        }))
                      }
                    >
                      {PLANS.map((p) => (
                        <option key={p.code} value={p.code}>
                          {p.label} · {p.price}
                        </option>
                      ))}
                    </select>
                    <div className="flex flex-wrap gap-1">
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 rounded-[8px] bg-[var(--wq-action)] px-2 text-xs text-white hover:bg-[var(--wq-action)]/90"
                        disabled={busy || !dirty}
                        onClick={() => applyPlan(s.id)}
                      >
                        {s.subscription?.status === "active" &&
                        selectableCode(current) !== draft
                          ? "Trocar plano"
                          : "Ativar plano"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-[8px] bg-white px-2 text-xs"
                        disabled={busy || s.subscription?.status === "canceled"}
                        onClick={() => revokePlan(s.id)}
                      >
                        Revogar
                      </Button>
                    </div>
                  </div>

                  <p className="font-mono text-sm">
                    {s.openCount ?? 0}
                    <span className="text-[var(--wq-text-muted)]">/{s.orderCount ?? 0}</span>
                  </p>
                  <p className="font-mono text-sm">{s.memberCount ?? "—"}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-[8px] text-xs"
                      disabled={busy}
                      onClick={() => extend(s.id)}
                    >
                      +7d trial
                    </Button>
                    {s.status === "suspended" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-[8px] text-xs"
                        disabled={busy}
                        onClick={() => setStatus(s.id, "active")}
                      >
                        Reativar
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-[8px] text-xs"
                        disabled={busy}
                        onClick={() => setStatus(s.id, "suspended")}
                      >
                        Suspender
                      </Button>
                    )}
                  </div>
                  <div className="md:col-span-6 mt-1 flex gap-2">
                    <Input
                      className="h-8 flex-1 rounded-[8px] text-xs"
                      placeholder="Nota interna (PIX, objeção, plano…)"
                      value={noteDrafts[s.id] ?? ""}
                      onChange={(e) =>
                        setNoteDrafts((d) => ({ ...d, [s.id]: e.target.value }))
                      }
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
                      className="h-8 shrink-0 text-xs"
                      disabled={savingNote === s.id}
                      onClick={() => saveNote(s.id)}
                    >
                      {savingNote === s.id ? "…" : "Salvar"}
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
        <p className="text-xs text-[var(--wq-text-muted)]">
          Plano: Basic 147 · Pro 297 · Business 499. Trocar = upgrade/downgrade. Revogar = cancela
          assinatura (não suspende a loja). Pedidos = abertos / total.
        </p>
      </div>
    </div>
  )
}
