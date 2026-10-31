"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { AppHeader } from "@/components/shell/AppHeader"
import { Button } from "@/components/ui/button"
import { enterPlatformShop, getPlatformAccountV1, type PlatformAccount360 } from "@/lib/apiV1"
import { KpiCard, Skeleton, nf } from "@/components/admin/charts"
import { cn } from "@/lib/utils"

const ROLE: Record<string, string> = { owner: "Dono", admin: "Admin", atendimento: "Atendimento", sector: "Setor" }
const PLAN: Record<string, string> = { WORQERA_BASIC: "Basic", WORQERA_PRO: "Pro", WORQERA_BUSINESS: "Business" }
const SUB: Record<string, string> = { trialing: "Em teste", active: "Ativa", past_due: "Em atraso", canceled: "Cancelada", expired: "Teste encerrado" }
const CLIENT: Record<string, string> = { web: "Site", android: "App Android", ios: "App iOS", api: "API", admin: "Admin" }
const EVENT: Record<string, { label: string; tone?: string }> = {
  login: { label: "Entrou" },
  login_new_device: { label: "Entrou em aparelho novo", tone: "text-amber-700 dark:text-amber-300" },
  login_failed: { label: "Senha errada", tone: "text-rose-700 dark:text-rose-300" },
  logout: { label: "Saiu" },
  password_reset: { label: "Trocou a senha pelo e-mail" },
  password_set_by_admin: { label: "Senha definida pelo admin" },
  sessions_revoked: { label: "Encerrou todas as sessões" },
}

const dt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—")
const d = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "—")

export default function Conta360Page() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<PlatformAccount360 | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    getPlatformAccountV1(id)
      .then(setData)
      .catch((err) => setError(err?.message || "Conta não encontrada"))
  }, [id])

  return (
    <div className="-mx-2.5 -mt-3 sm:-mx-5 sm:-mt-5 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-6">
      <AppHeader
        title={data?.account.name || "Conta"}
        subtitle={data?.account.email || ""}
        showInbox={false}
        showOrderJump={false}
        actions={
          <Link href="/admin/contas" className="text-sm font-semibold text-[var(--wq-brand-text)] hover:underline">
            ← Contas
          </Link>
        }
      />
      <div className="mx-auto w-full max-w-[1200px] space-y-4 px-2.5 py-4 sm:px-5 md:px-6 lg:px-8">
        {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</p> : null}
        {!data && !error ? <Skeleton className="h-96" /> : null}
        {data ? (
          <>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="Último uso" value={data.lastActivity ? dt(data.lastActivity) : "nunca"} />
              <KpiCard label="Dias ativos · 30d" value={nf(data.counters.activeDays30)} />
              <KpiCard label="Logins · 30d" value={nf(data.counters.logins30)} />
              <KpiCard label="Pedidos criados · 30d" value={nf(data.counters.ordersCreated30)} />
            </section>
            <p className="text-xs text-[var(--wq-text-muted)]">
              Conta criada em {d(data.account.createdAt)} · e-mail {data.account.verified ? "confirmado" : "não confirmado"}
              {data.account.sessionsRevoked ? ` · sessões encerradas ${nf(data.account.sessionsRevoked)}×` : ""}
            </p>

            <section className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
              <h2 className="border-b border-[var(--wq-border)] px-4 py-3 text-sm font-semibold">Lojas</h2>
              {data.shops.length ? (
                <ul className="divide-y divide-[var(--wq-border)]">
                  {data.shops.map((s) => (
                    <li key={s.id} className={cn("flex flex-wrap items-center gap-3 px-4 py-3 text-sm", !s.active && "opacity-60")}>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{s.name}</span>
                        <span className="block text-xs text-[var(--wq-text-muted)]">
                          {ROLE[s.role] || s.role}
                          {!s.active ? " · acesso removido" : ""}
                          {s.status === "suspended" ? " · loja suspensa" : ""}
                        </span>
                      </span>
                      <span className="text-xs">
                        {s.plan ? PLAN[s.plan] || s.plan : "Sem plano"}
                        {s.subscription ? ` · ${SUB[s.subscription] || s.subscription}` : ""}
                        {s.cycle === "yearly" ? " · anual" : ""}
                        <span className="block text-[var(--wq-text-muted)]">
                          {s.subscription === "trialing" ? `teste até ${d(s.trialEndsAt)}` : s.paidUntil ? `pago até ${d(s.paidUntil)}` : ""}
                        </span>
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 rounded-[10px] bg-[var(--wq-action)] text-white hover:bg-[var(--wq-action)]/90"
                        onClick={() => {
                          enterPlatformShop({ id: s.id, name: s.name })
                          window.location.href = "/dashboard"
                        }}
                      >
                        Entrar
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-3 text-sm text-[var(--wq-text-muted)]">Sem loja vinculada.</p>
              )}
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
                <h2 className="border-b border-[var(--wq-border)] px-4 py-3 text-sm font-semibold">Onde usa</h2>
                {data.activity.length ? (
                  <ul className="divide-y divide-[var(--wq-border)] text-sm">
                    {data.activity.map((a) => (
                      <li key={`${a.client}-${a.appVersion}`} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="flex-1">
                          {CLIENT[a.client] || a.client}
                          {a.appVersion ? <span className="ml-1 text-xs text-[var(--wq-text-muted)]">v{a.appVersion}</span> : null}
                        </span>
                        <span className="text-xs text-[var(--wq-text-muted)]">{nf(a.days)} dias · último {dt(a.lastSeen)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-3 text-sm text-[var(--wq-text-muted)]">Sem uso registrado desde o início da coleta.</p>
                )}
              </section>

              <section className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
                <h2 className="border-b border-[var(--wq-border)] px-4 py-3 text-sm font-semibold">Segurança</h2>
                {data.security.length ? (
                  <ul className="max-h-[420px] divide-y divide-[var(--wq-border)] overflow-y-auto text-sm">
                    {data.security.map((e, i) => (
                      <li key={`${e.at}-${i}`} className="px-4 py-2.5">
                        <span className={cn("font-medium", EVENT[e.kind]?.tone)}>{EVENT[e.kind]?.label || e.kind}</span>
                        <span className="block truncate text-xs text-[var(--wq-text-muted)]">
                          {dt(e.at)} · {e.device || CLIENT[e.client] || e.client}
                          {e.ip ? ` · ${e.ip}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-3 text-sm text-[var(--wq-text-muted)]">Nenhum evento registrado ainda.</p>
                )}
              </section>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
