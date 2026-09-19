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

export default function PlatformShopsPage() {
  const [shops, setShops] = useState<ShopRow[]>([])
  const [q, setQ] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})
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

  const extend = async (id: string) => {
    try {
      await patchPlatformShopV1(id, { extendTrialDays: 7 })
      toast.success("Trial estendido +7 dias")
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Falha ao estender")
    }
  }

  const setStatus = async (id: string, status: "active" | "suspended") => {
    try {
      await patchPlatformShopV1(id, { status })
      toast.success(status === "suspended" ? "Oficina suspensa" : "Oficina reativada")
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Falha ao atualizar")
    }
  }

  const activatePremium = async (id: string) => {
    try {
      await patchPlatformShopV1(id, {
        subscriptionStatus: "active",
        planCode: "WORQERA_PREMIUM",
        status: "active",
        adminNote:
          (noteDrafts[id] || "").trim() ||
          "Business Premium R$499 · Manual · custom + carga + acompanhamento",
      })
      toast.success("Assinatura Premium ativa (como CdT)")
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Falha ao ativar Premium")
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
        subtitle={`${filtered.length} listada${filtered.length === 1 ? "" : "s"} · trial, pedidos, suspender`}
      />

      <div className="mx-auto max-w-[1100px] space-y-4 px-3 py-4 sm:px-5 sm:py-6 md:px-8">
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
          <div className="hidden min-w-[720px] grid-cols-[1.3fr_1fr_90px_90px_200px] gap-3 border-b border-[var(--wq-border)] bg-[var(--wq-paper)] px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--wq-text-muted)] md:grid">
            <span>Oficina</span>
            <span>Assinatura</span>
            <span>Pedidos</span>
            <span>Membros</span>
            <span>Ações</span>
          </div>
          <ul className="min-w-[720px] divide-y divide-[var(--wq-border)] md:min-w-0">
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
              return (
                <li
                  key={s.id}
                  className={cn(
                    "grid gap-2 px-4 py-3 md:grid-cols-[1.3fr_1fr_90px_90px_200px] md:items-center",
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
                        último pedido{" "}
                        {new Date(s.lastOrderAt).toLocaleDateString("pt-BR")}
                      </p>
                    ) : (
                      <p className="text-[10px] text-[var(--wq-text-muted)]">sem pedidos</p>
                    )}
                  </div>
                  <p className="font-mono text-sm">
                    {s.openCount ?? 0}
                    <span className="text-[var(--wq-text-muted)]">/{s.orderCount ?? 0}</span>
                  </p>
                  <p className="font-mono text-sm">{s.memberCount ?? "—"}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {s.subscription?.status !== "active" ? (
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 rounded-[8px] bg-[var(--wq-action)] text-xs text-white hover:bg-[var(--wq-action)]/90"
                        onClick={() => activatePremium(s.id)}
                      >
                        Ativar Premium
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-[8px] text-xs"
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
                        onClick={() => setStatus(s.id, "suspended")}
                      >
                        Suspender
                      </Button>
                    )}
                  </div>
                  <div className="md:col-span-5 mt-1 flex gap-2">
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
          Pedidos = abertos / total. Destaque âmbar = trial ≤ 3 dias.
        </p>
      </div>
    </div>
  )
}
