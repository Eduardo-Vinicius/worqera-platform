"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AdminPage, AdminPanel } from "@/components/admin/AdminPage"
import { Chips, DeltaBadge, KpiCard, Skeleton, brl0, nf } from "@/components/admin/charts"
import { enterPlatformShop, getPlatformSubscriptionsV1, patchPlatformShopV1, type PlatformSubscriptionRow } from "@/lib/apiV1"
import { cn } from "@/lib/utils"

const STATUSES = [
  { id: "all", label: "Todas" },
  { id: "active", label: "Ativas" },
  { id: "trialing", label: "Em teste" },
  { id: "past_due", label: "Em atraso" },
  { id: "canceled", label: "Canceladas" },
  { id: "expired", label: "Teste encerrado" },
]
const PLANS = [
  { id: "", label: "Todos os planos" },
  { id: "WORQERA_BASIC", label: "Basic" },
  { id: "WORQERA_PRO", label: "Pro" },
  { id: "WORQERA_BUSINESS", label: "Business" },
]
const STATUS_PILL: Record<PlatformSubscriptionRow["status"], [string, string]> = {
  active: ["Ativa", "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"],
  trialing: ["Em teste", "bg-sky-100 text-sky-900 dark:bg-sky-950/40 dark:text-sky-200"],
  past_due: ["Em atraso", "bg-rose-100 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200"],
  canceled: ["Cancelada", "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"],
  expired: ["Teste encerrado", "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"],
}
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "—")

/** Assinaturas: every shop's plan, the money and the hands-on fixes (extend trial, activate, change plan, cancel). */
export default function AssinaturasPage() {
  const [status, setStatus] = useState("all")
  const [plan, setPlan] = useState("")
  const [q, setQ] = useState("")
  const [term, setTerm] = useState("")
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Awaited<ReturnType<typeof getPlatformSubscriptionsV1>> | null>(null)
  const [busy, setBusy] = useState("")
  const [reload, setReload] = useState(0)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("q")) setQ(params.get("q") || "")
    if (STATUSES.some((x) => x.id === params.get("status"))) setStatus(params.get("status") || "all")
  }, [])
  useEffect(() => {
    const t = window.setTimeout(() => setTerm(q.trim()), 300)
    return () => window.clearTimeout(t)
  }, [q])
  useEffect(() => setPage(1), [status, plan, term])
  useEffect(() => {
    let alive = true
    getPlatformSubscriptionsV1({ status, plan, q: term || undefined, page, days: 30 })
      .then((res) => alive && setData(res))
      .catch((err) => toast.error(err?.message || "Não carregou as assinaturas"))
    return () => {
      alive = false
    }
  }, [status, plan, term, page, reload])

  const act = async (row: PlatformSubscriptionRow, key: string, body: Parameters<typeof patchPlatformShopV1>[1], done: string, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return
    setBusy(`${row.id}:${key}`)
    try {
      await patchPlatformShopV1(row.shopId, body)
      toast.success(done)
      setReload((n) => n + 1)
    } catch (err: any) {
      toast.error(err?.message || "Não deu certo")
    } finally {
      setBusy("")
    }
  }

  const s = data?.summary
  const pages = data ? Math.max(1, Math.ceil(data.total / 50)) : 1

  return (
    <AdminPage title="Assinaturas" subtitle="Plano de cada loja, o dinheiro e os ajustes à mão">
      {!s ? (
        <Skeleton className="h-24" />
      ) : (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard label="MRR" value={brl0(s.mrr)} hint={`${nf(s.paying)} pagantes · anual ÷ 12`} />
          <div className="min-w-0 rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] px-4 py-3.5">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">Recebido · 30 dias</p>
              <DeltaBadge delta={s.received} />
            </div>
            <p className="mt-1.5 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums sm:text-[28px]">{brl0(s.received.value)}</p>
            <p className="mt-0.5 text-xs text-[var(--wq-text-muted)]">{nf(s.received.payments)} pagamentos</p>
          </div>
          <KpiCard label="Em teste" value={nf(s.counts.trialing)} />
          <KpiCard label="Em atraso" value={nf(s.counts.past_due)} tone={s.counts.past_due ? "danger" : "ok"} hint="5 dias de tolerância" />
          <KpiCard label="Fundador" value={nf(s.counts.founder)} hint="Business com preço de fundador" />
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Chips value={status} onChange={setStatus} options={STATUSES} />
        <Chips value={plan} onChange={setPlan} options={PLANS} />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar loja" className="h-9 max-w-xs" />
      </div>

      <AdminPanel title={data ? `${nf(data.total)} assinatura${data.total === 1 ? "" : "s"}` : "Assinaturas"} hint="Mais recentes primeiro. Cancelar uma assinatura do Asaas cancela lá também.">
        {!data ? (
          <Skeleton className="m-4 h-60" />
        ) : data.items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-[var(--wq-text-muted)]">
                <tr>
                  <th className="px-4 py-2 font-medium">Loja</th>
                  <th className="px-4 py-2 font-medium">Plano</th>
                  <th className="px-4 py-2 font-medium">Situação</th>
                  <th className="px-4 py-2 text-right font-medium">MRR</th>
                  <th className="hidden px-4 py-2 font-medium lg:table-cell">Vence</th>
                  <th className="px-4 py-2 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--wq-border)]">
                {data.items.map((row) => {
                  const [label, tone] = STATUS_PILL[row.status] || [row.status, ""]
                  const isBusy = (k: string) => busy === `${row.id}:${k}`
                  return (
                    <tr key={row.id} className={cn(row.status === "past_due" && "bg-rose-50/50 dark:bg-rose-950/10")}>
                      <td className="px-4 py-2.5">
                        <span className="block font-medium">{row.shopName}</span>
                        <span className="block text-xs text-[var(--wq-text-muted)]">
                          {row.owner ? row.owner.email : "sem dono"}
                          {row.shopStatus === "suspended" ? " · loja suspensa" : ""}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <select
                          value={row.planCode}
                          disabled={isBusy("plan")}
                          onChange={(e) => void act(row, "plan", { planCode: e.target.value }, `Plano de ${row.shopName} → ${e.target.selectedOptions[0]?.text}`)}
                          className="rounded-md border border-[var(--wq-border)] bg-[var(--wq-surface)] px-2 py-1 text-xs"
                          aria-label="Plano"
                        >
                          {PLANS.filter((p) => p.id).map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                        <span className="mt-0.5 block text-xs text-[var(--wq-text-muted)]">
                          {row.cycle === "yearly" ? "anual" : "mensal"} · {row.provider}
                          {row.founderUntil ? " · fundador" : ""}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", tone)}>{label}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{row.mrr ? brl0(row.mrr) : "—"}</td>
                      <td className="hidden px-4 py-2.5 text-xs text-[var(--wq-text-muted)] lg:table-cell">
                        {row.status === "trialing" ? `teste até ${day(row.trialEndsAt)}` : row.currentPeriodEnd ? `pago até ${day(row.currentPeriodEnd)}` : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {["trialing", "expired"].includes(row.status) ? (
                            <Button type="button" size="sm" variant="outline" className="h-8 rounded-[10px]" disabled={isBusy("trial")} onClick={() => void act(row, "trial", { extendTrialDays: 7 }, `Teste de ${row.shopName} +7 dias`)}>
                              +7 dias
                            </Button>
                          ) : null}
                          {row.status !== "active" ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 rounded-[10px]"
                              disabled={isBusy("activate")}
                              onClick={() =>
                                void act(
                                  row,
                                  "activate",
                                  { subscriptionStatus: "active" },
                                  `${row.shopName} ativa (manual)`,
                                  `Ativar ${row.shopName} manualmente? Fica ativa por 1 ano sem cobrança no Asaas.`
                                )
                              }
                            >
                              Ativar manual
                            </Button>
                          ) : null}
                          {["active", "past_due", "trialing"].includes(row.status) ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 rounded-[10px] text-rose-700"
                              disabled={isBusy("cancel")}
                              onClick={() =>
                                void act(
                                  row,
                                  "cancel",
                                  { subscriptionStatus: "canceled" },
                                  `Assinatura de ${row.shopName} cancelada`,
                                  `Cancelar a assinatura de ${row.shopName}?${row.provider === "Asaas" ? " A cobrança no Asaas também é cancelada." : ""}`
                                )
                              }
                            >
                              Cancelar
                            </Button>
                          ) : null}
                          {row.invoiceUrl ? (
                            <a href={row.invoiceUrl} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center rounded-[10px] border border-[var(--wq-border)] px-2.5 text-xs font-semibold hover:bg-[var(--wq-paper)]">
                              Fatura
                            </a>
                          ) : null}
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 rounded-[10px] bg-[var(--wq-action)] text-white hover:bg-[var(--wq-action)]/90"
                            onClick={() => {
                              enterPlatformShop({ id: row.shopId, name: row.shopName })
                              window.location.href = "/dashboard"
                            }}
                          >
                            Entrar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-4 py-6 text-sm text-[var(--wq-text-muted)]">Nenhuma assinatura com esses filtros.</p>
        )}
      </AdminPanel>

      {data && pages > 1 ? (
        <div className="flex items-center justify-end gap-2 text-sm">
          <span className="text-[var(--wq-text-muted)]">
            Página {page} de {pages}
          </span>
          <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Próxima
          </Button>
        </div>
      ) : null}
    </AdminPage>
  )
}
