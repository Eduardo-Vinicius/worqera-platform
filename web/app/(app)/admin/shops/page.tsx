"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AppHeader } from "@/components/shell/AppHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { listPlatformShopsV1, meV1, patchPlatformShopV1 } from "@/lib/apiV1"
import { toast } from "sonner"

type ShopRow = {
  id: string
  name: string
  slug: string
  status: string
  memberCount?: number
  createdAt?: string
  subscription?: {
    status?: string
    trialEndsAt?: string
    planCode?: string
  } | null
}

export default function PlatformShopsPage() {
  const [shops, setShops] = useState<ShopRow[]>([])
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)

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
      setShops(res.shops || [])
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
    <div className="-mx-5 -mt-6 md:-mx-8 md:-mt-7">
      <AppHeader
        title="Oficinas (Worqera)"
        subtitle="Super-admin — trial, suspender, listar tenants"
      />

      <div className="mx-auto max-w-[1100px] space-y-4 px-5 py-6 md:px-8">
        <div className="flex flex-wrap gap-2">
          <Input
            className="max-w-sm rounded-[10px]"
            placeholder="Buscar nome ou slug…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
          />
          <Button type="button" variant="outline" className="rounded-[10px]" onClick={load}>
            Buscar
          </Button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-white">
          <div className="hidden grid-cols-[1.4fr_1fr_110px_100px_220px] gap-3 border-b border-[var(--wq-border)] bg-[var(--wq-paper)] px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--wq-text-muted)] md:grid">
            <span>Oficina</span>
            <span>Assinatura</span>
            <span>Status</span>
            <span>Membros</span>
            <span>Ações</span>
          </div>
          <ul className="divide-y divide-[var(--wq-border)]">
            {loading && (
              <li className="px-4 py-10 text-center text-sm text-[var(--wq-text-muted)]">Carregando…</li>
            )}
            {!loading && shops.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-[var(--wq-text-muted)]">Nenhuma oficina.</li>
            )}
            {shops.map((s) => (
              <li
                key={s.id}
                className="grid gap-2 px-4 py-3 md:grid-cols-[1.4fr_1fr_110px_100px_220px] md:items-center"
              >
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="font-mono text-xs text-[var(--wq-text-muted)]">{s.slug}</p>
                </div>
                <div className="text-sm">
                  <p className="capitalize">{s.subscription?.status || "—"}</p>
                  {s.subscription?.trialEndsAt && (
                    <p className="text-xs text-[var(--wq-text-muted)]">
                      trial até {new Date(s.subscription.trialEndsAt).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
                <p className="text-sm capitalize">{s.status}</p>
                <p className="font-mono text-sm">{s.memberCount ?? "—"}</p>
                <div className="flex flex-wrap gap-1.5">
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
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
