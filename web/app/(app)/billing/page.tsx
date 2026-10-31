"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Check, ExternalLink, FileText, Loader2, MessageCircle, Receipt } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AppHeader } from "@/components/shell/AppHeader"
import { AiQuotaNotice } from "@/components/ai/AiQuotaNotice"
import {
  cancelSubscriptionV1,
  completeCheckoutDevV1,
  createCheckoutSessionV1,
  getAiQuotaV1,
  getSubscriptionV1,
  listBillingPaymentsV1,
  type AiQuota,
  type BillingPayment,
} from "@/lib/apiV1"
import {
  CHECKOUT_INTENT_KEY,
  IMPLANTACAO,
  PLANS,
  YEARLY_OFF,
  formatBRL,
  maskCpfCnpj,
  planOf,
  yearlyMonthly,
  type Cycle,
  type PlanCode,
} from "@/lib/plans"
import { cn } from "@/lib/utils"

const STATUS: Record<string, string> = {
  trialing: "Em teste",
  active: "Ativa",
  past_due: "Pagamento atrasado",
  canceled: "Cancelada",
  expired: "Teste encerrado",
}

const WHATSAPP = "https://wa.me/5511985591053?text="

const PAYMENT_TONE: Record<BillingPayment["status"], string> = {
  paid: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  open: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  overdue: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  refunded: "bg-[var(--wq-paper)] text-[var(--wq-text-muted)]",
}

const shortDay = (iso?: string | null) =>
  iso ? new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : ""

export default function BillingPage() {
  const [sub, setSub] = useState<any>(null)
  const [aiQuota, setAiQuota] = useState<AiQuota | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState("")
  const [planCode, setPlanCode] = useState<PlanCode>("WORQERA_PRO")
  const [cycle, setCycle] = useState<Cycle>("monthly")
  const [doc, setDoc] = useState("")
  const [role, setRole] = useState("")
  const [payments, setPayments] = useState<BillingPayment[] | null>(null)
  const [intent, setIntent] = useState(false)
  const docRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    try {
      const s = await getSubscriptionV1()
      setSub(s.subscription)
      const current = planOf(s.subscription?.planCode)
      if (current) setPlanCode(current.code)
      if (s.subscription?.cycle === "yearly") setCycle("yearly")
      getAiQuotaV1()
        .then((res) => setAiQuota(res.quota))
        .catch(() => setAiQuota(null))
      listBillingPaymentsV1()
        .then((res) => setPayments(res.payments || []))
        .catch(() => setPayments([]))
    } catch (err: any) {
      toast.error(err?.message || "Erro ao carregar o plano")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setRole(String(localStorage.getItem("role") || "").toLowerCase())
    if (new URLSearchParams(window.location.search).get("pago") === "1") {
      toast.success("Pagamento feito? A assinatura ativa assim que o Asaas confirmar.")
    }
    void load().then(() => {
      try {
        const raw = localStorage.getItem(CHECKOUT_INTENT_KEY)
        if (!raw) return
        localStorage.removeItem(CHECKOUT_INTENT_KEY)
        const want = JSON.parse(raw) as { planCode?: string; cycle?: Cycle }
        const plan = planOf(want.planCode)
        if (plan) setPlanCode(plan.code)
        if (want.cycle === "yearly" || want.cycle === "monthly") setCycle(want.cycle)
        setIntent(true)
        window.setTimeout(() => docRef.current?.focus(), 200)
      } catch {}
    })
  }, [])

  const canPay = role === "owner" || role === "admin"
  const current = planOf(sub?.planCode)
  const chosen = PLANS.find((p) => p.code === planCode) || PLANS[1]
  const founder = sub?.price?.founderUntil && chosen.code === "WORQERA_BUSINESS" && cycle === "monthly"
  const locked =
    sub &&
    (sub.status === "expired" ||
      sub.status === "canceled" ||
      sub.status === "past_due" ||
      (sub.status === "trialing" && sub.trialEndsAt && new Date(sub.trialEndsAt).getTime() < Date.now()))
  const trialLeft =
    sub?.status === "trialing" && sub?.trialEndsAt
      ? Math.max(0, Math.ceil((new Date(sub.trialEndsAt).getTime() - Date.now()) / 86400000))
      : null
  const sameAsCurrent = sub?.status === "active" && current?.code === chosen.code && (sub?.cycle || "monthly") === cycle

  const subscribe = async () => {
    setBusy("checkout")
    try {
      const session = await createCheckoutSessionV1({
        planCode: chosen.code,
        cycle,
        cpfCnpj: doc,
        successUrl: `${window.location.origin}/billing?pago=1`,
      })
      if (session.url) {
        window.location.href = session.url
        return
      }
      if (process.env.NODE_ENV !== "production") {
        await completeCheckoutDevV1(chosen.code)
        toast.success("Assinatura ativada (ambiente de teste)")
        await load()
        return
      }
      toast.message(session.message || "Pagamento online desligado. Fale com a Worqera.")
    } catch (err: any) {
      toast.error(err?.message || "Não deu para abrir a cobrança")
    } finally {
      setBusy("")
    }
  }

  const cancel = async () => {
    if (!window.confirm("Cancelar a assinatura? A empresa usa até o fim do período pago.")) return
    setBusy("cancel")
    try {
      await cancelSubscriptionV1()
      toast.success("Assinatura cancelada")
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Não deu para cancelar")
    } finally {
      setBusy("")
    }
  }

  return (
    <div className="-mx-3 -mt-4 sm:-mx-5 sm:-mt-6 md:-mx-8 md:-mt-7">
      <AppHeader
        title="Plano e assinatura"
        subtitle="Basic R$ 147 · Pro R$ 297 · Business R$ 597"
        actions={
          !locked ? (
            <Button asChild variant="outline" size="sm" className="rounded-[10px]">
              <Link href="/dashboard">Portal</Link>
            </Button>
          ) : undefined
        }
      />

      <div className="mx-auto max-w-3xl space-y-4 px-3 py-4 sm:px-5 sm:py-6 md:px-8">
        {locked && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
            Operações (kanban, pedidos, clientes) estão bloqueadas até a assinatura estar ativa.
          </div>
        )}

        {intent ? (
          <div className="rounded-2xl border border-[var(--wq-brand)]/30 bg-[var(--wq-brand-soft)] px-4 py-3 text-sm">
            <p className="font-semibold text-[var(--wq-text)]">Conta criada. Falta só o pagamento.</p>
            <p className="text-[var(--wq-text-muted)]">
              Confira o plano, informe o CPF ou CNPJ e clique em Assinar. Os 7 dias grátis continuam valendo: a primeira cobrança vence no fim deles.
            </p>
          </div>
        ) : null}

        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] px-4 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">Seu plano</p>
            <p className="font-semibold">
              {loading ? "Carregando…" : current ? `Worqera ${current.name}` : "Sem assinatura"}
              {sub?.status ? (
                <span className="ml-2 rounded-full bg-[var(--wq-paper)] px-2 py-0.5 text-xs font-medium text-[var(--wq-text-muted)]">
                  {STATUS[sub.status] || sub.status}
                  {trialLeft != null ? ` · ${trialLeft} dia${trialLeft === 1 ? "" : "s"}` : ""}
                </span>
              ) : null}
            </p>
            {sub?.status === "active" && sub?.currentPeriodEnd ? (
              <p className="text-xs text-[var(--wq-text-muted)]">
                Pago até {new Date(sub.currentPeriodEnd).toLocaleDateString("pt-BR")}
                {sub?.price?.founderUntil ? ` · preço de fundador até ${new Date(sub.price.founderUntil).toLocaleDateString("pt-BR")}` : ""}
              </p>
            ) : null}
          </div>
          {sub?.lastInvoiceUrl ? (
            <Button asChild size="sm" className="rounded-[10px] bg-[var(--wq-action)] text-white">
              <a href={sub.lastInvoiceUrl} target="_blank" rel="noopener noreferrer">
                Pagar fatura em aberto <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </a>
            </Button>
          ) : null}
        </section>

        <div className="flex justify-center">
          <div className="inline-grid grid-cols-2 rounded-xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-1">
            {(["monthly", "yearly"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCycle(c)}
                className={cn(
                  "rounded-lg px-4 py-1.5 text-sm font-semibold transition",
                  cycle === c ? "bg-[var(--wq-brand)] text-white" : "text-[var(--wq-text-muted)] hover:text-[var(--wq-text)]"
                )}
              >
                {c === "monthly" ? "Mensal" : `Anual · −${YEARLY_OFF}%`}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {PLANS.map((p) => {
            const selected = p.code === chosen.code
            const isCurrent = current?.code === p.code
            const perMonth =
              cycle === "yearly"
                ? yearlyMonthly(p)
                : p.code === "WORQERA_BUSINESS" && sub?.price?.founderUntil
                  ? 499
                  : p.monthly
            return (
              <button
                key={p.code}
                type="button"
                onClick={() => setPlanCode(p.code)}
                className={cn(
                  "flex flex-col rounded-2xl border bg-[var(--wq-surface)] p-4 text-left transition",
                  selected ? "border-[var(--wq-brand)] ring-2 ring-[var(--wq-brand)]/30" : "border-[var(--wq-border)] hover:border-[var(--wq-brand)]/40"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{p.name}</p>
                  {isCurrent ? (
                    <span className="rounded-full bg-[var(--wq-brand-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--wq-brand-text)]">
                      Seu plano
                    </span>
                  ) : p.code === "WORQERA_PRO" ? (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--wq-brand-text)]">Recomendado</span>
                  ) : null}
                </div>
                <p className="mt-2 flex items-baseline gap-2 font-[family-name:var(--font-display)] text-2xl font-semibold">
                  <span>
                    {formatBRL(perMonth)}
                    <span className="text-sm font-normal text-[var(--wq-text-muted)]">/mês</span>
                  </span>
                  {cycle === "yearly" ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      −{YEARLY_OFF}%
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-xs text-[var(--wq-text-muted)]">
                  {cycle === "yearly" ? (
                    <>
                      <span className="line-through">{formatBRL(p.monthly * 12)}</span> {formatBRL(p.yearly)} por ano
                    </>
                  ) : (
                    "Cobrado todo mês"
                  )}
                </p>
                <p className="mt-1 text-sm font-medium text-[var(--wq-text)]">{p.value}</p>
                <ul className="mt-3 space-y-1.5">
                  {p.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs text-[var(--wq-text-muted)]">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--wq-brand-text)]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </button>
            )
          })}
        </div>

        <section className="space-y-3 rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-4">
          {canPay ? (
            <>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">CPF ou CNPJ de quem paga</span>
                <Input
                  ref={docRef}
                  value={doc}
                  onChange={(e) => setDoc(maskCpfCnpj(e.target.value))}
                  inputMode="numeric"
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  className="rounded-[10px]"
                />
                <span className="block text-xs text-[var(--wq-text-muted)]">
                  O Asaas pede o documento para emitir a cobrança. Se já informou antes, pode deixar em branco.
                </span>
              </label>
              <Button
                className="w-full rounded-[11px] bg-[var(--wq-brand)] text-white hover:bg-[var(--wq-brand-deep)]"
                disabled={Boolean(busy) || sameAsCurrent}
                onClick={() => void subscribe()}
              >
                {busy === "checkout" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {sameAsCurrent
                  ? "Este já é o seu plano"
                  : cycle === "yearly"
                    ? `Assinar ${chosen.name} anual · ${formatBRL(chosen.yearly)}/ano`
                    : `Assinar ${chosen.name} · ${formatBRL(founder ? 499 : chosen.monthly)}/mês`}
              </Button>
              <p className="text-xs text-[var(--wq-text-muted)]">
                Pagamento pelo Asaas: Pix, boleto ou cartão. Em teste, a primeira cobrança vence no último dia do teste.
              </p>
            </>
          ) : (
            <p className="text-sm text-[var(--wq-text-muted)]">Só o dono ou o admin da empresa assina e troca o plano.</p>
          )}

          <div className="flex flex-col gap-2 border-t border-[var(--wq-border)] pt-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--wq-text-muted)]">
              Implantação com a Worqera (setores, carga do histórico e treinamento): {formatBRL(IMPLANTACAO)} uma vez.
            </p>
            <Button asChild variant="outline" size="sm" className="shrink-0 rounded-[10px]">
              <a
                href={`${WHATSAPP}${encodeURIComponent("Olá! Quero a implantação da Worqera na minha empresa.")}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="mr-1.5 h-4 w-4" /> Falar com a Worqera
              </a>
            </Button>
          </div>
        </section>

        {canPay ? (
          <section className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
            <div className="flex items-center gap-2 border-b border-[var(--wq-border)] px-4 py-3">
              <Receipt className="h-4 w-4 text-[var(--wq-brand)]" />
              <h2 className="text-sm font-semibold">Últimos pagamentos</h2>
            </div>
            {payments === null ? (
              <p className="flex items-center gap-2 px-4 py-4 text-sm text-[var(--wq-text-muted)]">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando
              </p>
            ) : payments.length === 0 ? (
              <p className="px-4 py-4 text-sm text-[var(--wq-text-muted)]">Os pagamentos aparecem aqui depois da primeira cobrança.</p>
            ) : (
              <ul className="divide-y divide-[var(--wq-border)]">
                {payments.map((p) => (
                  <li key={p.id || `${p.dueDate}-${p.value}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium tabular-nums">{formatBRL(p.value)}</span>
                      <span className="block text-xs text-[var(--wq-text-muted)]">
                        {p.paidAt ? `Pago em ${shortDay(p.paidAt)}` : `Vence em ${shortDay(p.dueDate)}`}
                        {p.method ? ` · ${p.method}` : ""}
                      </span>
                    </span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", PAYMENT_TONE[p.status])}>{p.statusLabel}</span>
                    {p.receiptUrl ? (
                      <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--wq-brand-text)] hover:underline">
                        <FileText className="h-3.5 w-3.5" /> Comprovante
                      </a>
                    ) : p.invoiceUrl && p.status !== "refunded" ? (
                      <a href={p.invoiceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--wq-brand-text)] hover:underline">
                        <ExternalLink className="h-3.5 w-3.5" /> {p.status === "paid" ? "Fatura" : "Pagar"}
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {aiQuota ? (
          <section className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-4">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">IA do mês</span>
              <span className="tabular-nums text-[var(--wq-text-muted)]">
                {aiQuota.used.toLocaleString("pt-BR")} de {aiQuota.limit.toLocaleString("pt-BR")} usos
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--wq-paper)]">
              <div
                className={`h-full rounded-full ${aiQuota.blocked ? "bg-rose-500" : aiQuota.nearLimit ? "bg-amber-400" : "bg-[var(--wq-brand)]"}`}
                style={{ width: `${aiQuota.percent}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-[var(--wq-text-muted)]">
              Cada texto que a IA escreve conta 1 uso. Acabou, os textos saem prontos até o mês virar.
            </p>
            <AiQuotaNotice quota={aiQuota} always className="mt-2" />
          </section>
        ) : null}

        {sub?.provider === "Asaas" && role === "owner" && (sub.status === "active" || sub.status === "past_due" || sub.status === "trialing") ? (
          <div className="text-center">
            <button
              type="button"
              onClick={() => void cancel()}
              disabled={busy === "cancel"}
              className="text-xs font-medium text-[var(--wq-text-muted)] underline-offset-2 hover:text-rose-600 hover:underline"
            >
              {busy === "cancel" ? "Cancelando…" : "Cancelar assinatura"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
