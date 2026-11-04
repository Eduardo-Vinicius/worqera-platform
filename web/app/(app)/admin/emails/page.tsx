"use client"

import { useEffect, useState } from "react"
import { AppHeader } from "@/components/shell/AppHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { listPlatformEmailsV1, type PlatformEmail } from "@/lib/apiV1"
import { Chips, KpiCard, Skeleton, nf, useAutoRefresh } from "@/components/admin/charts"
import { cn } from "@/lib/utils"

const PERIODS = [
  { id: 1, label: "24h" },
  { id: 7, label: "7d" },
  { id: 14, label: "14d" },
  { id: 30, label: "30d" },
]
const GROUPS = [
  { id: "all", label: "Todos" },
  { id: "orders", label: "Pedidos" },
  { id: "account", label: "Conta e convites" },
  { id: "billing", label: "Assinatura" },
  { id: "alerts", label: "Alertas e resumos" },
]
const STATUSES = [
  { id: "all", label: "Qualquer situação" },
  { id: "sent", label: "Enviados" },
  { id: "failed", label: "Falharam" },
  { id: "skipped", label: "Não enviados" },
]
const STATUS_TONE: Record<PlatformEmail["status"], string> = {
  sent: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
  skipped: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  failed: "bg-rose-100 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200",
}
const STATUS_LABEL: Record<PlatformEmail["status"], string> = { sent: "Enviado", skipped: "Não enviado", failed: "Falhou" }
const REASON: Record<string, string> = {
  "smtp-off": "SMTP desligado (só no console)",
  "no-recipient": "sem e-mail do cliente",
  "awaiting-price": "esperando o preço",
  "awaiting-photos": "esperando as fotos",
  "pdf-failed": "PDF não gerou",
  "no-shop": "loja não encontrada",
  failed: "erro no envio",
}

const when = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })

/** Every e-mail the platform tried to send, newest first. */
export default function EmailsPage() {
  const [days, setDays] = useState(7)
  const [group, setGroup] = useState("all")
  const [status, setStatus] = useState("all")
  const [q, setQ] = useState("")
  const [term, setTerm] = useState("")
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Awaited<ReturnType<typeof listPlatformEmailsV1>> | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    const t = window.setTimeout(() => setTerm(q.trim()), 300)
    return () => window.clearTimeout(t)
  }, [q])

  useEffect(() => {
    setPage(1)
  }, [days, group, status, term])

  const updated = useAutoRefresh(
    async () => {
      try {
        setData(await listPlatformEmailsV1({ days, group, status, q: term || undefined, page }))
        setError("")
      } catch (err: any) {
        setError(err?.message || "Não carregou os e-mails")
      }
    },
    [days, group, status, term, page]
  )

  const pages = data ? Math.max(1, Math.ceil(data.total / 50)) : 1

  return (
    <div className="-mx-2.5 -mt-3 sm:-mx-5 sm:-mt-5 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-6">
      <AppHeader title="E-mails" subtitle={`Tudo que a Worqera enviou · ${updated}`} showInbox={false} showOrderJump={false} />
      <div className="mx-auto w-full max-w-[1400px] space-y-4 px-2.5 py-4 sm:px-5 md:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Chips value={group} onChange={setGroup} options={GROUPS} />
          <Chips value={days} onChange={setDays} options={PERIODS} />
        </div>

        {data ? (
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Tentativas" value={nf(data.counts.total)} />
            <KpiCard label="Enviados" value={nf(data.counts.sent)} tone="ok" />
            <KpiCard label="Falharam" value={nf(data.counts.failed)} tone={data.counts.failed ? "danger" : undefined} />
            <KpiCard label="Não enviados" value={nf(data.counts.skipped)} hint="sem destinatário, esperando foto/preço ou SMTP desligado" />
          </section>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por e-mail, código do pedido ou assunto" className="max-w-sm" />
          <Chips value={status} onChange={setStatus} options={STATUSES} />
        </div>

        {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</p> : null}

        <section className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
          {!data ? (
            <Skeleton className="m-4 h-60" />
          ) : data.emails.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-[var(--wq-text-muted)]">
                  <tr>
                    <th className="px-4 py-2 font-medium">Quando</th>
                    <th className="px-4 py-2 font-medium">Tipo</th>
                    <th className="px-4 py-2 font-medium">Para</th>
                    <th className="hidden px-4 py-2 font-medium lg:table-cell">Loja</th>
                    <th className="px-4 py-2 font-medium">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--wq-border)]">
                  {data.emails.map((m) => (
                    <tr key={m.id} className="align-top">
                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-[var(--wq-text-muted)]">{when(m.at)}</td>
                      <td className="px-4 py-2.5">
                        <span className="font-medium">{m.kindLabel}</span>
                        {m.code ? <span className="ml-1 text-xs text-[var(--wq-text-muted)]">#{m.code}</span> : null}
                        {m.subject ? <span className="block max-w-[22rem] truncate text-xs text-[var(--wq-text-muted)]">{m.subject}</span> : null}
                      </td>
                      <td className="max-w-[16rem] truncate px-4 py-2.5">{m.to || "—"}</td>
                      <td className="hidden px-4 py-2.5 text-[var(--wq-text-muted)] lg:table-cell">{m.shopName || "—"}</td>
                      <td className="px-4 py-2.5">
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_TONE[m.status])}>{STATUS_LABEL[m.status]}</span>
                        {m.reason || m.error ? (
                          <span className="mt-1 block max-w-[18rem] text-xs text-[var(--wq-text-muted)]" title={m.error || undefined}>
                            {REASON[m.reason] || m.reason}
                            {m.error ? `${m.reason ? " · " : ""}${m.error}` : ""}
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-4 py-6 text-sm text-[var(--wq-text-muted)]">Nenhum e-mail neste filtro.</p>
          )}
        </section>

        {data && pages > 1 ? (
          <div className="flex items-center justify-end gap-2 text-sm">
            <span className="text-[var(--wq-text-muted)]">
              Página {page} de {pages} · {nf(data.total)} e-mails
            </span>
            <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
              Próxima
            </Button>
          </div>
        ) : null}
        <p className="text-xs text-[var(--wq-text-muted)]">Ficam guardados por 30 dias.</p>
      </div>
    </div>
  )
}
