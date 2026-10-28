"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  CalendarClock,
  Check,
  Copy,
  Loader2,
  MessageCircle,
  NotebookPen,
  Phone,
  Sparkles,
  Trash2,
  Trophy,
  X,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  addQuoteActivityV1,
  deleteQuoteV1,
  getQuoteV1,
  patchQuoteV1,
  sendQuoteWhatsAppV1,
  suggestQuoteMessageV1,
  winQuoteV1,
  type RecoveryInput,
  type AiQuota,
  type Quote,
  type QuoteActivity,
  type QuoteReason,
  type QuoteStage,
} from "@/lib/apiV1"
import { cn } from "@/lib/utils"
import { FollowUpPicker, ReasonPicker } from "./ReasonPicker"
import { AiQuotaNotice } from "@/components/ai/AiQuotaNotice"
import { RecoveryDialog } from "./RecoveryDialog"
import {
  PRIORITY_LABEL,
  STAGES,
  brl,
  followUpLabel,
  followUpTone,
  formatPhone,
  initials,
  priorityDot,
  relativeTime,
  stageTone,
  waLink,
} from "./quoteUi"

type Suggestion = { tone: string; label: string; text: string; waUrl: string | null }

const ACTIVITY_ICON: Record<QuoteActivity["kind"], typeof Phone> = {
  created: NotebookPen,
  refused: XCircle,
  stage: CalendarClock,
  note: NotebookPen,
  call: Phone,
  whatsapp: MessageCircle,
  won: Trophy,
  lost: XCircle,
  reopened: CalendarClock,
  reply: MessageCircle,
}

export function prefillOrderHref(prefill: { clientId: string | null; name: string; phone: string; what: string; quoteId?: string }) {
  const qs = new URLSearchParams()
  if (prefill.quoteId) qs.set("fromQuote", prefill.quoteId)
  if (prefill.clientId) qs.set("clientId", prefill.clientId)
  if (prefill.name) qs.set("clientName", prefill.name)
  if (prefill.phone) qs.set("clientPhone", prefill.phone)
  if (prefill.what) qs.set("obs", `Orçamento recuperado: ${prefill.what}`)
  return `/pedidos/novo?${qs}`
}

export function QuoteDrawer({
  quoteId,
  onClose,
  onChanged,
  onDeleted,
}: {
  quoteId: string | null
  onClose: () => void
  onChanged: (quote: Quote) => void
  onDeleted: (id: string) => void
}) {
  const router = useRouter()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState("")
  const [note, setNote] = useState("")
  const [suggest, setSuggest] = useState<{ ai: boolean; options: Suggestion[]; aiQuota?: AiQuota | null } | null>(null)
  const [suggesting, setSuggesting] = useState(false)
  const [editReason, setEditReason] = useState(false)
  const [canDelete, setCanDelete] = useState(false)
  const [official, setOfficial] = useState(false)
  const [recoverOpen, setRecoverOpen] = useState(false)

  useEffect(() => {
    const role = String(localStorage.getItem("role") || "").toLowerCase()
    setCanDelete(role === "owner" || role === "admin")
  }, [])

  useEffect(() => {
    if (!quoteId) {
      setQuote(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setSuggest(null)
    setNote("")
    setEditReason(false)
    getQuoteV1(quoteId)
      .then((res) => {
        if (cancelled) return
        setQuote(res.quote)
        setOfficial(Boolean(res.channels?.whatsappOfficial))
      })
      .catch((err) => {
        toast.error(err?.message || "Não abriu o orçamento")
        onClose()
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteId])

  useEffect(() => {
    if (!quoteId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [quoteId, onClose])

  if (!quoteId) return null

  const apply = (next: Quote) => {
    setQuote(next)
    onChanged(next)
  }

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key)
    try {
      await fn()
    } catch (err: any) {
      toast.error(err?.message || "Não salvou")
    } finally {
      setBusy("")
    }
  }

  const setStage = (stage: QuoteStage) =>
    run(`stage-${stage}`, async () => {
      if (!quote || quote.stage === stage) return
      if (stage === "won") {
        setRecoverOpen(true)
        return
      }
      const res = await patchQuoteV1(quote.id, { stage })
      apply(res.quote)
    })

  const win = (input: RecoveryInput) =>
    run("win", async () => {
      if (!quote) return
      const res = await winQuoteV1(quote.id, input)
      setRecoverOpen(false)
      apply(res.quote)
      if (res.order) {
        toast.success(`Recuperado! #${res.order.code} voltou para a fila`, {
          action: { label: "Ver no kanban", onClick: () => router.push("/kanban") },
        })
      } else if (res.prefill) {
        toast.success("Recuperado! Abra o pedido com os dados do cliente")
        router.push(prefillOrderHref({ ...res.prefill, quoteId: quote.id }))
      }
    })

  const logContact = (kind: "call" | "whatsapp", text?: string) =>
    addQuoteActivityV1(quote!.id, { kind, text }).then((res) => apply(res.quote))

  const loadSuggestions = () =>
    run("suggest", async () => {
      if (!quote) return
      setSuggesting(true)
      try {
        setSuggest(await suggestQuoteMessageV1(quote.id))
      } finally {
        setSuggesting(false)
      }
    })

  const sendWhatsApp = (text: string, url: string | null) => {
    if (!quote) return
    const href = url || waLink(quote.phoneDigits, text)
    if (!href) {
      toast.message("Cliente sem telefone. Edite o orçamento.")
      return
    }
    window.open(href, "_blank", "noopener,noreferrer")
    void logContact("whatsapp", "Mensagem pelo WhatsApp").catch(() => {})
  }

  const sendOfficial = () =>
    run("official", async () => {
      if (!quote) return
      const res = await sendQuoteWhatsAppV1(quote.id)
      if (!res.ok) {
        toast.message(res.message || "Não enviou")
        return
      }
      toast.success(
        res.followUpsLeft ? "Retomada enviada pelo WhatsApp oficial" : "Retomada enviada. Essa foi a última para este orçamento."
      )
      const fresh = await getQuoteV1(quote.id)
      apply(fresh.quote)
    })

  const saveNote = () =>
    run("note", async () => {
      if (!quote || !note.trim()) return
      const res = await addQuoteActivityV1(quote.id, { kind: "note", text: note.trim() })
      apply(res.quote)
      setNote("")
    })

  const open = quote ? !["won", "lost"].includes(quote.stage) : false

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-[1px]" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-[460px] flex-col bg-[var(--wq-surface)] text-[var(--wq-text)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {loading || !quote ? (
          <div className="flex flex-1 items-center justify-center text-sm text-[var(--wq-text-muted)]">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Abrindo orçamento
          </div>
        ) : (
          <>
            <header className="border-b border-[var(--wq-border)] px-5 pb-4 pt-5">
              <div className="flex items-start gap-3">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--wq-brand-soft)] text-base font-semibold text-[var(--wq-brand)]">
                  {initials(quote.name)}
                  {open ? (
                    <span
                      className={cn(
                        "absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full ring-2 ring-[var(--wq-surface)]",
                        priorityDot(quote.priority.level)
                      )}
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-semibold tracking-tight">{quote.name}</h2>
                  <p className="text-sm text-[var(--wq-text-muted)]">
                    {quote.phone ? formatPhone(quote.phone) : "Sem telefone"}
                    {quote.orderCode ? ` · #${quote.orderCode}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-[var(--wq-text-muted)] hover:bg-[var(--wq-paper)]"
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--wq-text-muted)]">Orçado</p>
                  <p className="font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums tracking-tight">
                    {quote.value ? brl(quote.value) : "—"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold", stageTone(quote.stage))}>
                    {STAGES.find((s) => s.id === quote.stage)?.label}
                  </span>
                  {open ? (
                    <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", followUpTone(quote.followUp.state))}>
                      {followUpLabel(quote)}
                    </span>
                  ) : null}
                </div>
              </div>

              {open && quote.priority.hint ? (
                <p className="mt-3 flex items-center gap-2 text-xs text-[var(--wq-text-muted)]">
                  <span className={cn("h-2 w-2 rounded-full", priorityDot(quote.priority.level))} />
                  Prioridade {PRIORITY_LABEL[quote.priority.level].toLowerCase()} · {quote.priority.hint}
                </p>
              ) : null}

              <div className="mt-4 grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  className="h-11 rounded-[10px] bg-[#25D366] text-[#073018] hover:bg-[#1ebe5d]"
                  disabled={!quote.phoneDigits}
                  onClick={() => (suggest ? sendWhatsApp(suggest.options[0].text, suggest.options[0].waUrl) : loadSuggestions())}
                >
                  <MessageCircle className="mr-1.5 h-4 w-4" /> WhatsApp
                </Button>
                <Button
                  asChild={Boolean(quote.phone)}
                  type="button"
                  variant="outline"
                  className="h-11 rounded-[10px]"
                  disabled={!quote.phone}
                  onClick={() => void logContact("call", "Ligação").catch(() => {})}
                >
                  {quote.phone ? (
                    <a href={`tel:${quote.phoneDigits || quote.phone}`}>
                      <Phone className="mr-1.5 h-4 w-4" /> Ligar
                    </a>
                  ) : (
                    <span>
                      <Phone className="mr-1.5 h-4 w-4" /> Ligar
                    </span>
                  )}
                </Button>
                <Button
                  type="button"
                  className="h-11 rounded-[10px] bg-[var(--wq-action)] text-white hover:bg-[var(--wq-action)]/90"
                  disabled={busy === "win" || quote.stage === "won"}
                  onClick={() => setRecoverOpen(true)}
                >
                  {busy === "win" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Trophy className="mr-1.5 h-4 w-4" />}
                  Fechou
                </Button>
              </div>
              {quote.recovery ? (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                  <p className="font-semibold">
                    Recuperado{quote.recovery.howLabel ? ` com ${quote.recovery.howLabel.toLowerCase()}` : ""}
                    {quote.recovery.realReasonLabel ? ` · problema: ${quote.recovery.realReasonLabel.toLowerCase()}` : ""}
                  </p>
                  <p className="text-xs opacity-80">
                    {quote.recovery.contacts} contato{quote.recovery.contacts === 1 ? "" : "s"}
                    {quote.recovery.people.length
                      ? ` · ${quote.recovery.people.length} pessoa${quote.recovery.people.length === 1 ? "" : "s"}: ${quote.recovery.people.join(", ")}`
                      : ""}
                  </p>
                  {quote.recovery.note ? <p className="mt-1 text-xs">{quote.recovery.note}</p> : null}
                </div>
              ) : null}
            </header>
            <RecoveryDialog
              quote={quote}
              open={recoverOpen}
              busy={busy === "win"}
              onClose={() => setRecoverOpen(false)}
              onConfirm={(input) => void win(input)}
            />

            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
              <section>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--wq-text-muted)]">Etapa</p>
                <div className="grid grid-cols-5 gap-1 rounded-xl bg-[var(--wq-paper)] p-1">
                  {STAGES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => void setStage(s.id)}
                      className={cn(
                        "rounded-lg px-1 py-2 text-[11px] font-semibold transition sm:text-xs",
                        quote.stage === s.id
                          ? "bg-[var(--wq-surface)] text-[var(--wq-text)] shadow-sm"
                          : "text-[var(--wq-text-muted)] hover:text-[var(--wq-text)]"
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </section>

              {open ? (
                <section>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--wq-text-muted)]">Ligar de novo</p>
                  <FollowUpPicker
                    value={quote.followUpAt}
                    onChange={(iso) =>
                      void run("follow", async () => {
                        const res = await patchQuoteV1(quote.id, { followUpAt: iso })
                        apply(res.quote)
                      })
                    }
                  />
                </section>
              ) : null}

              <section className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-paper)]/60 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Sparkles className="h-4 w-4 text-[var(--wq-brand)]" />
                    Mensagem para retomar
                  </p>
                  {suggest?.ai ? (
                    <span className="rounded-full bg-[var(--wq-brand)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">IA</span>
                  ) : null}
                </div>
                {official && open ? (
                  <Button
                    type="button"
                    className="mt-3 w-full rounded-[10px] bg-[#25D366] text-[#073018] hover:bg-[#1ebe5d]"
                    disabled={busy === "official" || !quote.phoneDigits}
                    onClick={() => void sendOfficial()}
                  >
                    {busy === "official" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />}
                    Retomar pelo WhatsApp oficial
                  </Button>
                ) : null}
                {!suggest ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 w-full rounded-[10px]"
                    disabled={suggesting}
                    onClick={() => void loadSuggestions()}
                  >
                    {suggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Sugerir texto
                  </Button>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {suggest.aiQuota ? (
                      <li>
                        <AiQuotaNotice quota={suggest.aiQuota} />
                      </li>
                    ) : null}
                    {suggest.options.map((opt) => (
                      <li key={opt.tone} className="rounded-xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--wq-text-muted)]">{opt.label}</p>
                        <p className="mt-1 text-sm leading-relaxed">{opt.text}</p>
                        <div className="mt-2 flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 rounded-lg bg-[#25D366] text-[#073018] hover:bg-[#1ebe5d]"
                            disabled={!quote.phoneDigits}
                            onClick={() => sendWhatsApp(opt.text, opt.waUrl)}
                          >
                            <MessageCircle className="mr-1 h-3.5 w-3.5" /> Enviar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 rounded-lg"
                            onClick={() => {
                              void navigator.clipboard?.writeText(opt.text)
                              toast.success("Texto copiado")
                            }}
                          >
                            <Copy className="mr-1 h-3.5 w-3.5" /> Copiar
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--wq-text-muted)]">O orçamento</p>
                  <button
                    type="button"
                    className="text-xs font-medium text-[var(--wq-brand)]"
                    onClick={() => setEditReason((v) => !v)}
                  >
                    {editReason ? "Pronto" : "Trocar motivo"}
                  </button>
                </div>
                <dl className="divide-y divide-[var(--wq-border)] rounded-2xl border border-[var(--wq-border)] text-sm">
                  <div className="flex gap-3 px-4 py-2.5">
                    <dt className="w-24 shrink-0 text-[var(--wq-text-muted)]">Queria</dt>
                    <dd className="min-w-0 flex-1">{quote.what || "—"}</dd>
                  </div>
                  <div className="flex gap-3 px-4 py-2.5">
                    <dt className="w-24 shrink-0 text-[var(--wq-text-muted)]">Motivo</dt>
                    <dd className="min-w-0 flex-1">
                      {quote.reasonLabel || "—"}
                      {quote.reasonNote ? <span className="block text-[var(--wq-text-muted)]">{quote.reasonNote}</span> : null}
                    </dd>
                  </div>
                  {quote.orderCode ? (
                    <div className="flex items-center gap-3 px-4 py-2.5">
                      <dt className="w-24 shrink-0 text-[var(--wq-text-muted)]">Pedido</dt>
                      <dd className="min-w-0 flex-1">
                        <Link href={`/pedidos?q=${encodeURIComponent(quote.orderCode)}`} className="font-medium text-[var(--wq-brand)] hover:underline">
                          #{quote.orderCode}
                        </Link>
                        <span className="text-[var(--wq-text-muted)]">
                          {quote.stage === "won" ? " · voltou para a fila" : " · fora da fila"}
                        </span>
                      </dd>
                    </div>
                  ) : null}
                  <div className="flex gap-3 px-4 py-2.5">
                    <dt className="w-24 shrink-0 text-[var(--wq-text-muted)]">Contatos</dt>
                    <dd className="min-w-0 flex-1">
                      {quote.contactCount || 0}
                      {quote.lastContactAt ? ` · último ${relativeTime(quote.lastContactAt)}` : ""}
                    </dd>
                  </div>
                </dl>
                {editReason ? (
                  <ReasonPicker
                    value={quote.reason}
                    onChange={(reason: QuoteReason) =>
                      void run("reason", async () => {
                        const res = await patchQuoteV1(quote.id, { reason })
                        apply(res.quote)
                      })
                    }
                  />
                ) : null}
              </section>

              <section className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--wq-text-muted)]">Histórico</p>
                <div className="flex gap-2">
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Anotar: pediu para chamar depois do dia 5…"
                    className="min-h-11 flex-1 rounded-[10px]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void saveNote()
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-auto rounded-[10px]"
                    disabled={!note.trim() || busy === "note"}
                    onClick={() => void saveNote()}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
                <ol className="relative space-y-4 border-l border-[var(--wq-border)] pl-5">
                  {quote.activity.map((a) => {
                    const Icon = ACTIVITY_ICON[a.kind] || NotebookPen
                    return (
                      <li key={a.id || a.at} className="relative">
                        <span className="absolute -left-[29px] top-0 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--wq-border)] bg-[var(--wq-surface)]">
                          <Icon className="h-3 w-3 text-[var(--wq-text-muted)]" />
                        </span>
                        <p className="text-sm">{a.text}</p>
                        <p className="text-xs text-[var(--wq-text-muted)]">
                          {a.byName ? `${a.byName} · ` : ""}
                          {relativeTime(a.at)}
                        </p>
                      </li>
                    )
                  })}
                </ol>
              </section>
            </div>

            <footer className="flex items-center justify-between gap-2 border-t border-[var(--wq-border)] px-5 py-3">
              {open ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-[10px] text-[var(--wq-text-muted)]"
                  disabled={Boolean(busy)}
                  onClick={() => void setStage("lost")}
                >
                  <XCircle className="mr-1.5 h-4 w-4" /> Desistiu de vez
                </Button>
              ) : (
                <span />
              )}
              {canDelete ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-[10px] text-[var(--wq-danger)]"
                  aria-label="Apagar orçamento"
                  onClick={() =>
                    void run("delete", async () => {
                      if (!window.confirm(`Apagar o orçamento de ${quote.name}? O histórico some.`)) return
                      await deleteQuoteV1(quote.id)
                      toast.success("Orçamento apagado")
                      onDeleted(quote.id)
                      onClose()
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </footer>
          </>
        )}
      </aside>
    </div>
  )
}
