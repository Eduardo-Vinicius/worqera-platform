"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AppHeader } from "@/components/shell/AppHeader"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { listPlatformAccountsV1, type PlatformAccountRow } from "@/lib/apiV1"
import { Skeleton, nf } from "@/components/admin/charts"
import { cn } from "@/lib/utils"

const SEGMENTS: Array<{ id: string; label: string }> = [
  { id: "all", label: "Todas" },
  { id: "active", label: "Ativas 30d" },
  { id: "inactive", label: "Inativas" },
  { id: "owners", label: "Donos" },
  { id: "no_activation", label: "Sem 1º pedido" },
  { id: "plan:WORQERA_BASIC", label: "Basic" },
  { id: "plan:WORQERA_PRO", label: "Pro" },
  { id: "plan:WORQERA_BUSINESS", label: "Business" },
]

const ROLE: Record<string, string> = { owner: "dono", admin: "admin", atendimento: "atendimento", sector: "setor" }

function lastSeen(iso: string | null) {
  if (!iso) return "nunca"
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  return days <= 0 ? "hoje" : days === 1 ? "ontem" : `há ${nf(days)} dias`
}

export default function ContasPage() {
  const [segment, setSegment] = useState("all")
  const [q, setQ] = useState("")
  const [term, setTerm] = useState("")
  const [page, setPage] = useState(1)
  const [data, setData] = useState<{ counts: Record<string, number>; total: number; accounts: PlatformAccountRow[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = window.setTimeout(() => setTerm(q.trim()), 300)
    return () => window.clearTimeout(t)
  }, [q])

  useEffect(() => {
    setPage(1)
  }, [segment, term])

  useEffect(() => {
    let alive = true
    setLoading(true)
    listPlatformAccountsV1({ segment, q: term || undefined, page })
      .then((res) => alive && setData(res))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [segment, term, page])

  const pages = data ? Math.max(1, Math.ceil(data.total / 50)) : 1

  return (
    <div className="-mx-2.5 -mt-3 sm:-mx-5 sm:-mt-5 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-6">
      <AppHeader title="Contas" subtitle="Pessoas com login no Worqera" showInbox={false} showOrderJump={false} />
      <div className="mx-auto w-full max-w-[1400px] space-y-4 px-2.5 py-4 sm:px-5 md:px-6 lg:px-8">
        <div className="flex flex-wrap gap-1.5">
          {SEGMENTS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSegment(s.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold transition",
                segment === s.id
                  ? "border-[var(--wq-brand)] bg-[var(--wq-brand)] text-white"
                  : "border-[var(--wq-border)] bg-[var(--wq-surface)] hover:bg-[var(--wq-paper)]"
              )}
            >
              {s.label}
              {data?.counts?.[s.id] != null ? <span className="ml-1 opacity-75">{nf(data.counts[s.id])}</span> : null}
            </button>
          ))}
        </div>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou e-mail" className="max-w-sm" />

        <section className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
          {!data && loading ? (
            <Skeleton className="m-4 h-60" />
          ) : data && data.accounts.length ? (
            <ul className={cn("divide-y divide-[var(--wq-border)]", loading && "opacity-60")}>
              {data.accounts.map((a) => (
                <li key={a.id}>
                  <Link href={`/admin/contas/${a.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm hover:bg-[var(--wq-paper)]">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {a.name || "Sem nome"}
                        {!a.verified ? <span className="ml-2 text-[11px] font-normal text-amber-700">e-mail não confirmado</span> : null}
                      </span>
                      <span className="block truncate text-xs text-[var(--wq-text-muted)]">{a.email}</span>
                    </span>
                    <span className="hidden min-w-0 max-w-[18rem] truncate text-xs text-[var(--wq-text-muted)] md:block">
                      {a.shops.length ? a.shops.map((s) => `${s.name} (${ROLE[s.role] || s.role})`).join(" · ") : "sem loja"}
                    </span>
                    <span className="w-20 text-right text-xs text-[var(--wq-text-muted)]">{lastSeen(a.lastActivity)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-sm text-[var(--wq-text-muted)]">Nenhuma conta neste filtro.</p>
          )}
        </section>

        {data && pages > 1 ? (
          <div className="flex items-center justify-end gap-2 text-sm">
            <span className="text-[var(--wq-text-muted)]">
              Página {page} de {pages} · {nf(data.total)} contas
            </span>
            <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
              Próxima
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
