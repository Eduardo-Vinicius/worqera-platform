"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Check, Copy, Loader2, MessageCircle, Star, Store } from "lucide-react"
import { toast } from "sonner"
import { getCrmFeedbackV1, markFeedbackAskV1, type CrmFeedback as Data, type CrmFeedbackRow, type FeedbackStep } from "@/lib/apiV1"
import { cn } from "@/lib/utils"

const SPANS = [7, 15, 30, 60, 90] as const

const FILTERS: Array<{ id: FeedbackStep | "pedir" | "all"; label: string; steps?: FeedbackStep[] }> = [
  { id: "all", label: "Todos" },
  { id: "pedir", label: "Pedir avaliação", steps: ["ask", "remind"] },
  { id: "waiting", label: "Aguardando", steps: ["waiting"] },
  { id: "google", label: "Pedir no Google", steps: ["google"] },
  { id: "recover", label: "Resolver nota baixa", steps: ["recover"] },
  { id: "done", label: "Concluídos", steps: ["done"] },
]

const STEP: Record<FeedbackStep, { label: string; cta?: string; tone: string }> = {
  ask: { label: "Ainda não pedimos", cta: "Pedir avaliação", tone: "bg-[var(--wq-brand-soft)] text-[var(--wq-brand-text)]" },
  remind: { label: "Pedimos, sem resposta", cta: "Lembrar", tone: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300" },
  waiting: { label: "Aguardando resposta", tone: "bg-[var(--wq-paper)] text-[var(--wq-text-muted)]" },
  google: { label: "Gostou: pedir no Google", cta: "Pedir no Google", tone: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" },
  recover: { label: "Nota baixa: resolver", cta: "Resolver", tone: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300" },
  done: { label: "Concluído", tone: "bg-[var(--wq-paper)] text-[var(--wq-text-muted)]" },
}

function when(value: string | null) {
  if (!value) return ""
  return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

function Stars({ score }: { score: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Nota ${score} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn("h-3.5 w-3.5", n <= score ? "fill-amber-400 text-amber-400" : "text-[var(--wq-border)]")} />
      ))}
    </span>
  )
}

/** CRM → Feedback: who got an order recently, who we asked to rate, who answered and who went to Google. */
export function CrmFeedback() {
  const [days, setDays] = useState<(typeof SPANS)[number]>(30)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("pedir")
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState("")

  const load = useCallback(() => {
    getCrmFeedbackV1(days, "all")
      .then((res) => {
        setData(res)
        setError("")
      })
      .catch((err) => setError(err?.message || "Não carregou"))
  }, [days])

  useEffect(() => {
    load()
  }, [load])

  const send = async (row: CrmFeedbackRow, channel: "whatsapp" | "counter" = "whatsapp") => {
    if (channel === "whatsapp" && row.whatsapp) window.open(row.whatsapp.url, "_blank", "noopener,noreferrer")
    setBusy(row.orderId)
    try {
      await markFeedbackAskV1(row.orderId, row.step, channel)
      load()
    } catch (err: any) {
      toast.error(err?.message || "Não registrou o envio")
    } finally {
      setBusy("")
    }
  }

  const copyLink = async (row: CrmFeedbackRow) => {
    try {
      await navigator.clipboard.writeText(`${row.link}#avaliar`)
      toast.success("Link de avaliação copiado")
    } catch {
      toast.error("Não copiou")
    }
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-[var(--wq-text-muted)]">
        {error || (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Lendo os pedidos entregues
          </>
        )}
      </div>
    )
  }

  const s = data.summary
  const active = FILTERS.find((f) => f.id === filter)
  const rows = active?.steps ? data.items.filter((r) => active.steps!.includes(r.step)) : data.items
  const countOf = (f: (typeof FILTERS)[number]) => (f.steps ? f.steps.reduce((n, st) => n + (s.counts[st] || 0), 0) : s.delivered)
  const funnel = [
    { label: "Entregues", value: String(s.delivered), hint: `últimos ${data.days} dias` },
    { label: "Pedimos avaliação", value: String(s.asked), hint: s.delivered ? `${Math.round((s.asked / s.delivered) * 100)}% dos entregues` : "" },
    { label: "Responderam", value: String(s.answered), hint: `${s.responseRate}% dos entregues` },
    { label: "Nota média", value: s.avgScore != null ? s.avgScore.toLocaleString("pt-BR") : "—", hint: `${s.promoters} gostaram · ${s.critics} nota baixa` },
    {
      label: "Foram ao Google",
      value: String(s.googleClicked),
      hint: data.reviewUrlSet ? `de ${s.googleOffered} que deram 4 ou 5` : "Link do Google não cadastrado",
    },
  ]

  return (
    <div className="space-y-3">
      {!data.reviewUrlSet ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <Store className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">
            Cadastre o link de avaliação do Google da loja: quem der 4 ou 5 recebe o botão &quot;Avaliar no Google&quot;.
          </span>
          <Link href="/settings/empresa" className="font-semibold underline underline-offset-2">
            Cadastrar link
          </Link>
        </div>
      ) : null}

      <section className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-border)] sm:grid-cols-5">
        {funnel.map((f, i) => (
          <div key={f.label} className={cn("min-w-0 bg-[var(--wq-surface)] px-4 py-3", i === 4 && "col-span-2 sm:col-span-1")}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--wq-text-muted)]">{f.label}</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums">{f.value}</p>
            <p className="truncate text-xs text-[var(--wq-text-muted)]">{f.hint}</p>
          </div>
        ))}
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                filter === f.id ? "border-[var(--wq-brand)] bg-[var(--wq-brand)] text-white" : "border-[var(--wq-border)] bg-[var(--wq-surface)] text-[var(--wq-text)]"
              )}
            >
              {f.label} <span className="opacity-75">{countOf(f)}</span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-5 rounded-lg border border-[var(--wq-border)] bg-[var(--wq-surface)] p-0.5 sm:inline-grid">
          {SPANS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={cn("rounded-md px-2.5 py-1.5 text-xs font-semibold", days === d ? "bg-[var(--wq-brand)] text-white" : "text-[var(--wq-text-muted)]")}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {!rows.length ? (
        <p className="rounded-2xl border border-dashed border-[var(--wq-border)] px-4 py-10 text-center text-sm text-[var(--wq-text-muted)]">
          {filter === "pedir" ? "Todo mundo que recebeu um pedido já foi chamado para avaliar." : "Ninguém nesta etapa."}
        </p>
      ) : (
        <ul className="divide-y divide-[var(--wq-border)] overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
          {rows.map((r) => {
            const step = STEP[r.step]
            const history = [
              r.askedAt ? `pedimos em ${when(r.askedAt)}${r.askCount > 1 ? ` (${r.askCount}×)` : ""}${r.askedBy ? ` · ${r.askedBy}` : ""}` : "",
              r.googleAskAt ? `link do Google enviado em ${when(r.googleAskAt)}` : "",
              r.googleAt ? `foi ao Google em ${when(r.googleAt)}` : "",
              r.recoverAt ? `contato para resolver em ${when(r.recoverAt)}` : "",
            ].filter(Boolean)
            return (
              <li key={r.orderId} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:gap-3 sm:px-4">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    {r.clientId ? (
                      <Link href={`/clientes/${r.clientId}`} className="truncate font-semibold hover:underline">
                        {r.clientName || "Cliente"}
                      </Link>
                    ) : (
                      <span className="truncate font-semibold">{r.clientName || "Cliente"}</span>
                    )}
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", step.tone)}>{step.label}</span>
                  </p>
                  <p className="text-xs text-[var(--wq-text-muted)] [overflow-wrap:anywhere]">
                    <Link href={`/pedidos?q=${encodeURIComponent(r.code)}`} className="font-mono hover:underline">
                      #{r.code}
                    </Link>
                    {r.what ? ` · ${r.what}` : ""} · entregue {r.daysSince === 0 ? "hoje" : r.daysSince === 1 ? "ontem" : `há ${r.daysSince} dias`}
                  </p>
                  {r.score ? (
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <Stars score={r.score} />
                      {r.comment ? <span className="italic text-[var(--wq-text-muted)]">“{r.comment}”</span> : null}
                    </p>
                  ) : null}
                  {history.length ? <p className="mt-0.5 text-[11px] text-[var(--wq-text-muted)]">{history.join(" · ")}</p> : null}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  {step.cta && r.whatsapp ? (
                    <button
                      type="button"
                      disabled={busy === r.orderId}
                      onClick={() => void send(r)}
                      className={cn(
                        "inline-flex h-10 items-center justify-center gap-1.5 rounded-[10px] px-3 text-sm font-semibold",
                        r.step === "recover" ? "bg-rose-600 text-white hover:bg-rose-700" : "bg-[#25D366] text-[#073018] hover:bg-[#1ebe5d]"
                      )}
                      title={r.whatsapp.text}
                    >
                      <MessageCircle className="h-4 w-4" /> {step.cta}
                    </button>
                  ) : step.cta && !r.phone ? (
                    <span className="text-xs text-[var(--wq-text-muted)]">Sem telefone</span>
                  ) : null}
                  {r.step === "ask" || r.step === "remind" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void copyLink(r)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-[var(--wq-border)] hover:bg-[var(--wq-paper)]"
                        title="Copiar link de avaliação"
                        aria-label="Copiar link de avaliação"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={busy === r.orderId}
                        onClick={() => void send(r, "counter")}
                        className="inline-flex h-10 items-center justify-center gap-1 rounded-[10px] border border-[var(--wq-border)] px-2.5 text-xs font-semibold hover:bg-[var(--wq-paper)]"
                        title="Já pedi pessoalmente ou por outro canal"
                      >
                        <Check className="h-4 w-4" /> Já pedi
                      </button>
                    </>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <p className="text-xs text-[var(--wq-text-muted)]">
        O cliente avalia pelo link do pedido (10 segundos). Quem der 4 ou 5 vê o botão do Google; quando ele toca, aparece aqui como &quot;foi ao Google&quot;.
        Mensagens automáticas pelo WhatsApp oficial ficam em{" "}
        <Link href="/comunicacao" className="font-semibold text-[var(--wq-brand-text)] underline-offset-2 hover:underline">
          WhatsApp e e-mail
        </Link>
        .
      </p>
    </div>
  )
}
