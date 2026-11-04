"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { AppHeader } from "@/components/shell/AppHeader"
import { Button } from "@/components/ui/button"
import { enterPlatformShop, getPlatformAccountV1, transferPlatformAccountEmailV1, type PlatformAccount360 } from "@/lib/apiV1"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { EmailHint } from "@/components/EmailHint"
import { isEmail } from "@/lib/emailHints"
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
  account_transferred: { label: "E-mail transferido pelo time Worqera", tone: "text-amber-700 dark:text-amber-300" },
}

const dt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—")
const d = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "—")

export default function Conta360Page() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<PlatformAccount360 | null>(null)
  const [error, setError] = useState("")
  const [transferOpen, setTransferOpen] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [understood, setUnderstood] = useState(false)
  const [moving, setMoving] = useState(false)
  const [result, setResult] = useState<Awaited<ReturnType<typeof transferPlatformAccountEmailV1>> | null>(null)

  const load = () =>
    getPlatformAccountV1(id)
      .then(setData)
      .catch((err) => setError(err?.message || "Conta não encontrada"))

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const transfer = async () => {
    const email = newEmail.trim().toLowerCase()
    if (!window.confirm(`Mudar o login de ${data?.account.email} para ${email}? Todas as sessões serão encerradas.`)) return
    setMoving(true)
    try {
      const res = await transferPlatformAccountEmailV1(id, email)
      setResult(res)
      setTransferOpen(false)
      setNewEmail("")
      setUnderstood(false)
      toast.success("E-mail transferido")
      void load()
    } catch (err: any) {
      toast.error(err?.message || "Não transferiu")
    } finally {
      setMoving(false)
    }
  }

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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-[var(--wq-text-muted)]">
                Conta criada em {d(data.account.createdAt)} · e-mail {data.account.verified ? "confirmado" : "não confirmado"}
                {data.account.sessionsRevoked ? ` · sessões encerradas ${nf(data.account.sessionsRevoked)}×` : ""}
              </p>
              <Button type="button" size="sm" variant="outline" className="rounded-[10px]" onClick={() => setTransferOpen((v) => !v)}>
                Transferir para outro e-mail
              </Button>
            </div>

            {result ? (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
                Login mudou de <b>{result.previousEmail}</b> para <b>{result.newEmail}</b>. Sessões encerradas.{" "}
                {result.passwordEmailSent ? "O link para criar a senha foi enviado." : "O e-mail de senha não saiu: peça para usar “Esqueci minha senha”."}
              </p>
            ) : null}

            {transferOpen ? (
              <section className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                <h2 className="text-sm font-semibold">Transferir o login para outro e-mail</h2>
                <ul className="list-disc space-y-0.5 pl-5 text-sm text-[var(--wq-text-muted)]">
                  <li>Troca o e-mail de login; lojas, pedidos e histórico continuam na mesma conta.</li>
                  <li>O e-mail novo fica como não confirmado.</li>
                  <li>Todas as sessões abertas (site e app) são encerradas.</li>
                  <li>Vai um link para o e-mail novo criar a senha (vale 1 hora; depois, “Esqueci minha senha”).</li>
                </ul>
                <div className="max-w-sm space-y-1">
                  <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} type="email" placeholder="novo@email.com" autoCapitalize="none" />
                  <EmailHint value={newEmail} onFix={setNewEmail} />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} />
                  Entendi o que muda para o cliente
                </label>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="rounded-[10px]" onClick={() => setTransferOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-[10px] bg-amber-600 text-white hover:bg-amber-700"
                    disabled={moving || !understood || !isEmail(newEmail)}
                    onClick={() => void transfer()}
                  >
                    {moving ? "Transferindo…" : "Transferir"}
                  </Button>
                </div>
              </section>
            ) : null}

            <section className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] px-4 py-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Últimos 30 dias</h2>
                <span className="text-xs text-[var(--wq-text-muted)]">
                  {nf(data.counters.activeDays30)} de 30 dias com uso
                </span>
              </div>
              <div className="mt-2 flex gap-[3px]">
                {data.days30.map((x) => (
                  <span
                    key={x.day}
                    title={`${x.day.split("-").reverse().join("/")}: ${x.active ? "usou" : "sem uso"}`}
                    className={cn("h-6 flex-1 rounded-sm", x.active ? "bg-[var(--wq-brand)]" : "bg-[var(--wq-paper)]")}
                  />
                ))}
              </div>
            </section>

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
