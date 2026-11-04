"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { AdminPage, AdminPanel, CLIENT_LABEL, when } from "@/components/admin/AdminPage"
import { KpiCard, Skeleton, nf, useAutoRefresh } from "@/components/admin/charts"
import {
  createPlatformNoticeV1,
  enterPlatformShop,
  getPlatformConfigV1,
  getPlatformQueuesV1,
  getPlatformTechV1,
  listPlatformShopsV1,
  patchPlatformShopV1,
  putPlatformConfigV1,
  type PlatformFlag,
  type PlatformTech,
} from "@/lib/apiV1"
import { cn } from "@/lib/utils"

/** Ações rápidas: switch modules for everyone, post a notice, find a shop and act, see what is breaking. */
export default function AcoesPage() {
  const [today, setToday] = useState<PlatformTech | null>(null)
  const [month, setMonth] = useState<PlatformTech | null>(null)
  const [pending, setPending] = useState<number | null>(null)
  const [config, setConfig] = useState<{ features: PlatformFlag[]; services: PlatformFlag[] } | null>(null)
  const [busyFlag, setBusyFlag] = useState("")
  const [notice, setNotice] = useState({ title: "", body: "" })
  const [posting, setPosting] = useState(false)
  const [shopQuery, setShopQuery] = useState("")
  const [shops, setShops] = useState<any[]>([])
  const [busyShop, setBusyShop] = useState("")
  const [errorQuery, setErrorQuery] = useState("")

  const updated = useAutoRefresh(async () => {
    const [d1, d30, q] = await Promise.all([getPlatformTechV1(1), getPlatformTechV1(30), getPlatformQueuesV1()])
    setToday(d1)
    setMonth(d30)
    setPending(q.queues.reduce((sum, x) => sum + x.count, 0))
  }, [], 30000)

  useEffect(() => {
    getPlatformConfigV1()
      .then((c) => setConfig({ features: c.features || [], services: c.services || [] }))
      .catch((err) => toast.error(err?.message || "Não carregou os parâmetros"))
  }, [])

  useEffect(() => {
    const term = shopQuery.trim()
    if (term.length < 2) {
      setShops([])
      return
    }
    const t = window.setTimeout(() => {
      listPlatformShopsV1({ q: term })
        .then((res) => setShops((res.shops || []).slice(0, 8)))
        .catch(() => setShops([]))
    }, 250)
    return () => window.clearTimeout(t)
  }, [shopQuery])

  const toggle = async (kind: "features" | "services", flag: PlatformFlag) => {
    setBusyFlag(`${kind}:${flag.key}`)
    try {
      await putPlatformConfigV1({ [kind]: [{ key: flag.key, enabled: !flag.enabled }] })
      setConfig((prev) => (prev ? { ...prev, [kind]: prev[kind].map((f) => (f.key === flag.key ? { ...f, enabled: !f.enabled } : f)) } : prev))
      toast.success(`${flag.label} ${flag.enabled ? "desligado" : "ligado"} para todas as lojas`)
    } catch (err: any) {
      toast.error(err?.message || "Não salvou")
    } finally {
      setBusyFlag("")
    }
  }

  const postNotice = async () => {
    if (!notice.title.trim()) return
    setPosting(true)
    try {
      const start = new Date()
      await createPlatformNoticeV1({
        title: notice.title.trim(),
        body: notice.body.trim(),
        startsAt: start.toISOString(),
        endsAt: new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        intervalHours: 0,
        platform: "all",
        active: true,
      })
      setNotice({ title: "", body: "" })
      toast.success("Aviso publicado por 7 dias em todas as lojas")
    } catch (err: any) {
      toast.error(err?.message || "Não publicou")
    } finally {
      setPosting(false)
    }
  }

  const extendTrial = async (shop: any) => {
    setBusyShop(String(shop.id))
    try {
      await patchPlatformShopV1(String(shop.id), { extendTrialDays: 7 })
      toast.success(`Teste de ${shop.name} estendido por 7 dias`)
    } catch (err: any) {
      toast.error(err?.message || "Não estendeu")
    } finally {
      setBusyShop("")
    }
  }

  const errors = useMemo(() => {
    const term = errorQuery.trim().toLowerCase()
    const list = month?.recentErrors || []
    return (term ? list.filter((e) => `${e.code} ${e.route} ${e.message} ${e.correlationId} ${e.status}`.toLowerCase().includes(term)) : list).slice(0, 12)
  }, [month, errorQuery])

  const flagRow = (kind: "features" | "services", flag: PlatformFlag) => (
    <li key={`${kind}:${flag.key}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
      <span className="min-w-0">
        <span className="block truncate font-medium">{flag.label}</span>
        {flag.shops?.length ? <span className="block text-xs text-[var(--wq-text-muted)]">{flag.shops.length} loja(s) com regra própria</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={flag.enabled}
        disabled={busyFlag === `${kind}:${flag.key}`}
        onClick={() => void toggle(kind, flag)}
        className={cn("relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50", flag.enabled ? "bg-[var(--wq-action)]" : "bg-slate-300 dark:bg-slate-600")}
      >
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition", flag.enabled ? "left-[22px]" : "left-0.5")} />
      </button>
    </li>
  )

  return (
    <AdminPage title="Ações rápidas" subtitle={`Mudar o sistema sem deploy, avisar as lojas e ver o que está quebrando · ${updated}`}>
      {!today || !month ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard label="Ativos hoje" value={nf(today.kpis.activeUsers.value)} hint="pessoas que usaram hoje" />
          <KpiCard label="Chamadas · 30 dias" value={nf(month.kpis.requests.value)} />
          <KpiCard label="Erros 5xx · 30 dias" value={nf(month.kpis.errors5xx.value)} tone={month.kpis.errors5xx.value ? "danger" : "ok"} />
          <KpiCard label="Rotas com tráfego" value={nf(month.allEndpoints?.length || month.topEndpoints.length)} />
          <Link href="/admin/operacao" className="block">
            <KpiCard label="Pendências" value={pending == null ? "—" : nf(pending)} tone={pending ? "warn" : "ok"} hint="abrir as filas →" />
          </Link>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <AdminPanel title="Ligar e desligar no sistema" hint="Vale para todas as lojas; regras por loja ficam em Parâmetros.">
          {!config ? (
            <Skeleton className="m-4 h-40" />
          ) : (
            <>
              <p className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">Módulos</p>
              <ul className="divide-y divide-[var(--wq-border)]">{config.services.map((f) => flagRow("services", f))}</ul>
              {config.features.length ? (
                <>
                  <p className="border-t border-[var(--wq-border)] px-4 pt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">Recursos</p>
                  <ul className="divide-y divide-[var(--wq-border)]">{config.features.map((f) => flagRow("features", f))}</ul>
                </>
              ) : null}
              <Link href="/admin/plataforma/parametros" className="block border-t border-[var(--wq-border)] px-4 py-2.5 text-xs font-semibold text-[var(--wq-brand-text)] hover:underline">
                Regras por loja em Parâmetros →
              </Link>
            </>
          )}
        </AdminPanel>

        <AdminPanel title="Aviso rápido para as lojas" hint="Aparece no topo do sistema por 7 dias. Para agendar ou segmentar, use Notícias.">
          <div className="space-y-2 p-4">
            <Input value={notice.title} onChange={(e) => setNotice({ ...notice, title: e.target.value })} placeholder="Título (ex.: Manutenção hoje às 22h)" maxLength={120} />
            <Textarea value={notice.body} onChange={(e) => setNotice({ ...notice, body: e.target.value })} placeholder="Texto do aviso" rows={4} maxLength={2000} />
            <div className="flex items-center justify-between gap-2">
              <Link href="/admin/plataforma/noticias" className="text-xs font-semibold text-[var(--wq-brand-text)] hover:underline">
                Ver avisos ativos →
              </Link>
              <Button type="button" size="sm" disabled={posting || !notice.title.trim()} onClick={() => void postNotice()} className="rounded-[10px] bg-[var(--wq-action)] text-white hover:bg-[var(--wq-action)]/90">
                {posting ? "Publicando…" : "Publicar por 7 dias"}
              </Button>
            </div>
          </div>
        </AdminPanel>

        <AdminPanel title="Achar uma loja" hint="Entrar para ver como o cliente vê, ou dar mais 7 dias de teste.">
          <div className="p-4">
            <Input value={shopQuery} onChange={(e) => setShopQuery(e.target.value)} placeholder="Nome ou endereço da loja" />
          </div>
          {shops.length ? (
            <ul className="divide-y divide-[var(--wq-border)] border-t border-[var(--wq-border)]">
              {shops.map((s) => (
                <li key={s.id} className="flex items-center gap-2 px-4 py-2.5 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{s.name}</span>
                    <span className="block text-xs text-[var(--wq-text-muted)]">
                      {s.subscription?.status === "trialing" && s.trialDaysLeft != null ? `teste: ${s.trialDaysLeft} dia(s)` : s.subscription?.status || "sem assinatura"}
                      {s.status === "suspended" ? " · suspensa" : ""}
                    </span>
                  </span>
                  <Button type="button" size="sm" variant="outline" className="h-8 rounded-[10px]" disabled={busyShop === String(s.id)} onClick={() => void extendTrial(s)}>
                    +7 dias
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 rounded-[10px] bg-[var(--wq-action)] text-white hover:bg-[var(--wq-action)]/90"
                    onClick={() => {
                      enterPlatformShop({ id: String(s.id), name: s.name, slug: s.slug })
                      window.location.href = "/dashboard"
                    }}
                  >
                    Entrar
                  </Button>
                </li>
              ))}
            </ul>
          ) : shopQuery.trim().length >= 2 ? (
            <p className="px-4 pb-4 text-sm text-[var(--wq-text-muted)]">Nenhuma loja com esse nome.</p>
          ) : null}
        </AdminPanel>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <AdminPanel
          title="Erros recentes · 30 dias"
          action={
            <div className="flex items-center gap-2">
              <Input value={errorQuery} onChange={(e) => setErrorQuery(e.target.value)} placeholder="Buscar código, rota, mensagem" className="h-8 w-56" />
              <Link href="/admin/erros" className="text-xs font-semibold text-[var(--wq-brand-text)] hover:underline">
                Ver todos →
              </Link>
            </div>
          }
        >
          {!month ? (
            <Skeleton className="m-4 h-40" />
          ) : errors.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-[var(--wq-text-muted)]">
                  <tr>
                    <th className="px-4 py-2 font-medium">Quando</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Rota</th>
                    <th className="hidden px-4 py-2 font-medium md:table-cell">Detalhe</th>
                    <th className="hidden px-4 py-2 font-medium sm:table-cell">Cliente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--wq-border)]">
                  {errors.map((e, i) => (
                    <tr key={`${e.at}-${i}`}>
                      <td className="whitespace-nowrap px-4 py-2 tabular-nums text-[var(--wq-text-muted)]">{when(e.at)}</td>
                      <td className="px-4 py-2 font-semibold text-rose-600">{e.status}</td>
                      <td className="max-w-[16rem] truncate px-4 py-2 font-mono text-xs">
                        {e.method} {e.route}
                      </td>
                      <td className="hidden max-w-[18rem] truncate px-4 py-2 text-xs text-[var(--wq-text-muted)] md:table-cell">{[e.code, e.message].filter(Boolean).join(" · ")}</td>
                      <td className="hidden px-4 py-2 text-xs sm:table-cell">{CLIENT_LABEL[e.client] || e.client}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-4 py-4 text-sm text-emerald-700 dark:text-emerald-300">Nenhum erro 5xx{errorQuery ? " com essa busca" : " no período"}.</p>
          )}
        </AdminPanel>

        <AdminPanel title="Rotas mais lentas (p95)" hint="Mínimo de 5 chamadas em 30 dias.">
          {!month ? (
            <Skeleton className="m-4 h-40" />
          ) : (
            <ul className="divide-y divide-[var(--wq-border)] text-sm">
              {month.slowest.slice(0, 8).map((r) => (
                <li key={`${r.method} ${r.route}`} className="flex items-center gap-3 px-4 py-2">
                  <span className="min-w-0 flex-1 truncate font-mono text-xs">
                    {r.method} {r.route}
                  </span>
                  <span className="text-xs tabular-nums text-[var(--wq-text-muted)]">{nf(r.count)}×</span>
                  <span className={cn("w-16 text-right text-xs font-semibold tabular-nums", r.p95Ms > 1000 ? "text-rose-600" : r.p95Ms > 500 ? "text-amber-600" : "")}>{nf(r.p95Ms)} ms</span>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>
      </div>
    </AdminPage>
  )
}
