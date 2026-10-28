"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CalendarClock,
  Check,
  KanbanSquare,
  List,
  Loader2,
  MessageCircle,
  Phone,
  PhoneCall,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
  Trophy,
  Wallet,
} from "lucide-react"
import { toast } from "sonner"
import { AppHeader } from "@/components/shell/AppHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  addQuoteActivityV1,
  listQuotesV1,
  patchQuoteV1,
  suggestQuoteMessageV1,
  winQuoteV1,
  type RecoveryInput,
  type Quote,
  type QuoteStage,
  type QuoteSummary,
} from "@/lib/apiV1"
import { cn } from "@/lib/utils"
import { NewQuoteDialog } from "@/components/quotes/NewQuoteDialog"
import { QuoteDrawer, prefillOrderHref } from "@/components/quotes/QuoteDrawer"
import { QuoteBoard } from "@/components/quotes/QuoteBoard"
import { RecoveryDialog } from "@/components/quotes/RecoveryDialog"
import { RecoveredView } from "@/components/quotes/RecoveredView"
import {
  STAGES,
  STAGE_LABEL,
  brl,
  followUpFromDays,
  followUpLabel,
  followUpTone,
  formatPhone,
  initials,
  priorityDot,
  stageTone,
  waLink,
} from "@/components/quotes/quoteUi"

type View = "today" | "board" | "all" | "recovered"

const VIEWS: Array<{ id: View; label: string; icon: typeof List }> = [
  { id: "today", label: "Ligar hoje", icon: PhoneCall },
  { id: "board", label: "Quadro", icon: KanbanSquare },
  { id: "all", label: "Todos", icon: List },
  { id: "recovered", label: "Recuperados", icon: Trophy },
]

export default function OrcamentosPage() {
  const router = useRouter()
  const [view, setView] = useState<View>("today")
  const [query, setQuery] = useState("")
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [summary, setSummary] = useState<QuoteSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [busyId, setBusyId] = useState("")
  const [winning, setWinning] = useState<Quote | null>(null)
  const loadSeq = useRef(0)

  const load = useCallback(async (nextView: Exclude<View, "recovered">, term: string) => {
    const seq = ++loadSeq.current
    setLoading(true)
    try {
      const res = await listQuotesV1({ view: nextView, q: term.trim() || undefined })
      if (seq !== loadSeq.current) return
      setQuotes(res.quotes || [])
      setSummary(res.summary)
    } catch (err: any) {
      if (seq === loadSeq.current) toast.error(err?.message || "Não carregou os orçamentos")
    } finally {
      if (seq === loadSeq.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const open = params.get("open")
    if (open) setOpenId(open)
    const v = params.get("view") as View | null
    if (v && VIEWS.some((x) => x.id === v)) setView(v)
  }, [])

  useEffect(() => {
    if (view === "recovered") return
    const handle = window.setTimeout(() => void load(view, query), query ? 250 : 0)
    return () => window.clearTimeout(handle)
  }, [view, query, load])

  const refresh = () => void load(view === "recovered" ? "all" : view, query)

  const upsert = (q: Quote) => {
    setQuotes((prev) => {
      const exists = prev.some((row) => row.id === q.id)
      if (view === "today" && !query && (q.stage === "won" || q.stage === "lost" || q.followUp.state === "later" || (q.stage === "contact" && q.followUp.state === "none"))) {
        return prev.filter((row) => row.id !== q.id)
      }
      return exists ? prev.map((row) => (row.id === q.id ? q : row)) : [q, ...prev]
    })
    void listQuotesV1({ view: "today" }).then((res) => setSummary(res.summary)).catch(() => {})
  }

  const quick = async (q: Quote, key: string, fn: () => Promise<Quote | void>) => {
    setBusyId(`${q.id}:${key}`)
    try {
      const next = await fn()
      if (next) upsert(next)
    } catch (err: any) {
      toast.error(err?.message || "Não salvou")
    } finally {
      setBusyId("")
    }
  }

  const whatsapp = (q: Quote) => {
    if (!q.phoneDigits) {
      setOpenId(q.id)
      toast.message("Cliente sem telefone — complete no orçamento")
      return
    }
    const win = window.open("", "_blank")
    void quick(q, "wa", async () => {
      const res = await suggestQuoteMessageV1(q.id)
      const opt = res.options[0]
      const url = opt?.waUrl || waLink(q.phoneDigits, opt?.text)
      if (win) win.location.href = url
      else window.open(url, "_blank")
      const logged = await addQuoteActivityV1(q.id, { kind: "whatsapp", text: "Mensagem pelo WhatsApp" })
      return logged.quote
    })
  }

  const call = (q: Quote) => {
    void quick(q, "call", async () => (await addQuoteActivityV1(q.id, { kind: "call", text: "Ligação" })).quote)
  }

  const snooze = (q: Quote, days: number) => {
    void quick(q, "snooze", async () => {
      const res = await patchQuoteV1(q.id, { followUpAt: followUpFromDays(days) })
      toast.success(days === 1 ? "Volta amanhã" : `Volta em ${days} dias`)
      return res.quote
    })
  }

  /** Asks "Como recuperou?" first; the dialog calls confirmWin. */
  const win = (q: Quote) => setWinning(q)

  const confirmWin = (q: Quote, input: RecoveryInput) => {
    void quick(q, "win", async () => {
      const res = await winQuoteV1(q.id, input)
      setWinning(null)
      if (res.order) {
        toast.success(`Recuperado! #${res.order.code} voltou para a fila`, {
          action: { label: "Ver no kanban", onClick: () => router.push("/kanban") },
        })
      } else if (res.prefill) {
        toast.success("Recuperado! Abra o pedido com os dados do cliente")
        router.push(prefillOrderHref({ ...res.prefill, quoteId: q.id }))
      }
      return res.quote
    })
  }

  const moveStage = (q: Quote, stage: QuoteStage) => {
    if (q.stage === stage) return
    if (stage === "won") return win(q)
    setQuotes((prev) => prev.map((row) => (row.id === q.id ? { ...row, stage } : row)))
    void quick(q, "stage", async () => (await patchQuoteV1(q.id, { stage })).quote)
  }

  return (
    <div className="-mx-2.5 -mt-3 sm:-mx-5 sm:-mt-5 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-6">
      <AppHeader
        title="Orçamentos"
        subtitle="Quem não fechou, quem ligar hoje e quem voltou"
        actions={
          <Button
            type="button"
            size="sm"
            className="h-9 rounded-[10px] bg-[var(--wq-brand)] text-white hover:bg-[var(--wq-brand-deep)]"
            onClick={() => setNewOpen(true)}
          >
            <Plus className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">Novo orçamento</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        }
      />

      <div className="mx-auto w-full max-w-[1600px] space-y-5 px-2.5 py-4 sm:px-5 md:px-6 lg:px-8">
        <SummaryStrip summary={summary} onToday={() => setView("today")} onRecovered={() => setView("recovered")} />

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="inline-flex w-full rounded-xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-1 md:w-auto">
            {VIEWS.map((v) => {
              const Icon = v.icon
              const active = view === v.id
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setView(v.id)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition md:flex-none",
                    active
                      ? "bg-[var(--wq-brand)] text-white shadow-sm"
                      : "text-[var(--wq-text-muted)] hover:text-[var(--wq-text)]"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {v.label}
                  {v.id === "today" && summary?.todayCount ? (
                    <span
                      className={cn(
                        "ml-0.5 rounded-full px-1.5 text-[11px] font-bold tabular-nums",
                        active ? "bg-white/25 text-white" : "bg-rose-500 text-white"
                      )}
                    >
                      {summary.todayCount}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
          <div className={cn("relative w-full md:max-w-sm", view === "recovered" && "hidden")}>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--wq-text-muted)]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nome, telefone ou código do pedido"
              className="h-11 rounded-[10px] bg-[var(--wq-surface)] pl-9"
            />
          </div>
        </div>

        {view === "recovered" ? (
          <RecoveredView onOpen={setOpenId} />
        ) : loading && !quotes.length ? (
          <div className="flex items-center justify-center py-20 text-sm text-[var(--wq-text-muted)]">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando orçamentos
          </div>
        ) : view === "board" ? (
          <QuoteBoard quotes={quotes} onOpen={setOpenId} onMove={moveStage} />
        ) : quotes.length === 0 ? (
          <EmptyState
            today={view === "today" && !query}
            searching={Boolean(query)}
            onNew={() => setNewOpen(true)}
            onBoard={() => setView("board")}
          />
        ) : (
          <ul className="space-y-2">
            {quotes.map((q) => (
              <QuoteRow
                key={q.id}
                quote={q}
                showStage={view === "all" || Boolean(query)}
                busy={busyId.startsWith(`${q.id}:`) ? busyId.split(":")[1] : ""}
                onOpen={() => setOpenId(q.id)}
                onWhatsApp={() => whatsapp(q)}
                onCall={() => call(q)}
                onSnooze={(days) => snooze(q, days)}
                onWin={() => win(q)}
              />
            ))}
          </ul>
        )}

        {view === "today" && !query && quotes.length > 0 ? (
          <p className="flex items-center gap-2 text-xs text-[var(--wq-text-muted)]">
            <Sparkles className="h-3.5 w-3.5 text-[var(--wq-brand)]" />
            Ordem por prioridade: retorno atrasado, motivo e valor. Quem você empurra para outro dia sai da lista.
          </p>
        ) : null}
      </div>

      <NewQuoteDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={(q) => {
          upsert(q)
          setOpenId(q.id)
        }}
      />
      <QuoteDrawer
        quoteId={openId}
        onClose={() => {
          setOpenId(null)
          if (window.location.search.includes("open=")) router.replace("/orcamentos")
        }}
        onChanged={upsert}
        onDeleted={(id) => {
          setQuotes((prev) => prev.filter((row) => row.id !== id))
          refresh()
        }}
      />
      <RecoveryDialog
        quote={winning}
        open={Boolean(winning)}
        busy={Boolean(winning) && busyId === `${winning?.id}:win`}
        onClose={() => setWinning(null)}
        onConfirm={(input) => winning && confirmWin(winning, input)}
      />
    </div>
  )
}

function SummaryStrip({
  summary,
  onToday,
  onRecovered,
}: {
  summary: QuoteSummary | null
  onToday: () => void
  onRecovered: () => void
}) {
  const cards = [
    {
      key: "today",
      label: "Ligar hoje",
      value: summary ? String(summary.todayCount) : "—",
      hint: summary?.overdueCount ? `${summary.overdueCount} com retorno atrasado` : "Nada atrasado",
      icon: PhoneCall,
      tone: summary?.overdueCount ? "text-rose-600 dark:text-rose-400" : "text-[var(--wq-brand)]",
      onClick: onToday,
    },
    {
      key: "open",
      label: "Na mesa",
      value: summary ? brl(summary.openValue) : "—",
      hint: summary ? `${summary.openCount} orçamento${summary.openCount === 1 ? "" : "s"} em aberto` : "",
      icon: Wallet,
      tone: "text-[var(--wq-text)]",
    },
    {
      key: "won",
      label: "Recuperado · 30 dias",
      value: summary ? brl(summary.wonValue30d) : "—",
      hint: summary ? `${summary.wonCount30d} cliente${summary.wonCount30d === 1 ? "" : "s"} voltou` : "",
      icon: TrendingUp,
      tone: "text-emerald-600 dark:text-emerald-400",
      onClick: onRecovered,
    },
    {
      key: "rate",
      label: "Taxa de recuperação",
      value: summary ? `${summary.recoveryRate}%` : "—",
      hint: "Fechou ÷ (fechou + desistiu), 30 dias",
      icon: Check,
      tone: "text-[var(--wq-action)]",
    },
  ]
  return (
    <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        const body = (
          <>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">{card.label}</p>
              <Icon className={cn("h-4 w-4", card.tone)} />
            </div>
            <p className={cn("mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl", card.tone)}>
              {card.value}
            </p>
            <p className="mt-1 truncate text-xs text-[var(--wq-text-muted)]">{card.hint}</p>
          </>
        )
        const cls = "rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] px-4 py-3.5 text-left"
        return card.onClick ? (
          <button key={card.key} type="button" onClick={card.onClick} className={cn(cls, "transition hover:border-[var(--wq-brand)]/40")}>
            {body}
          </button>
        ) : (
          <div key={card.key} className={cls}>
            {body}
          </div>
        )
      })}
    </section>
  )
}

function QuoteRow({
  quote: q,
  showStage,
  busy,
  onOpen,
  onWhatsApp,
  onCall,
  onSnooze,
  onWin,
}: {
  quote: Quote
  showStage: boolean
  busy: string
  onOpen: () => void
  onWhatsApp: () => void
  onCall: () => void
  onSnooze: (days: number) => void
  onWin: () => void
}) {
  const [snoozeOpen, setSnoozeOpen] = useState(false)
  const open = q.stage !== "won" && q.stage !== "lost"
  return (
    <li className="group relative rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] transition hover:border-[var(--wq-brand)]/35 hover:shadow-[0_8px_24px_-18px_rgba(15,23,42,0.45)]">
      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-4 sm:px-4">
        <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--wq-brand-soft)] text-sm font-semibold text-[var(--wq-brand)]">
            {initials(q.name)}
            {open ? (
              <span className={cn("absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full ring-2 ring-[var(--wq-surface)]", priorityDot(q.priority.level))} />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="truncate font-semibold">{q.name}</p>
              {q.orderCode ? (
                <span className="rounded-md bg-[var(--wq-paper)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--wq-text-muted)]">
                  #{q.orderCode}
                </span>
              ) : null}
              {showStage ? (
                <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", stageTone(q.stage))}>
                  {STAGE_LABEL[q.stage]}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 truncate text-sm text-[var(--wq-text-muted)]">
              {q.what || "Sem descrição"}
              {q.reasonLabel ? ` · ${q.reasonLabel}` : ""}
            </p>
            {open && q.priority.hint ? (
              <p className="mt-1 hidden text-xs text-[var(--wq-text-muted)] sm:block">{q.priority.hint}</p>
            ) : null}
          </div>
          <div className="hidden shrink-0 text-right sm:block">
            <p className="font-semibold tabular-nums">{q.value ? brl(q.value) : "—"}</p>
            {open ? (
              <span className={cn("mt-1 inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium", followUpTone(q.followUp.state))}>
                {followUpLabel(q)}
              </span>
            ) : null}
          </div>
        </button>

        <div className="flex items-center gap-1.5 sm:shrink-0">
          <div className="flex flex-1 items-center gap-2 sm:hidden">
            <span className="font-semibold tabular-nums">{q.value ? brl(q.value) : "—"}</span>
            {open ? (
              <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", followUpTone(q.followUp.state))}>
                {followUpLabel(q)}
              </span>
            ) : null}
          </div>
          {open ? (
            <>
              <Button
                type="button"
                size="icon"
                className="h-10 w-10 rounded-xl bg-[#25D366] text-[#073018] hover:bg-[#1ebe5d]"
                disabled={!q.phoneDigits || busy === "wa"}
                onClick={onWhatsApp}
                aria-label="WhatsApp com texto pronto"
                title="WhatsApp com texto pronto"
              >
                {busy === "wa" ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
              </Button>
              {q.phone ? (
                <Button asChild type="button" size="icon" variant="outline" className="h-10 w-10 rounded-xl" title="Ligar">
                  <a href={`tel:${q.phoneDigits || q.phone}`} onClick={onCall} aria-label={`Ligar para ${formatPhone(q.phone)}`}>
                    <Phone className="h-4 w-4" />
                  </a>
                </Button>
              ) : null}
              <div className="relative">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-10 w-10 rounded-xl"
                  onClick={() => setSnoozeOpen((v) => !v)}
                  disabled={busy === "snooze"}
                  aria-label="Ligar outro dia"
                  title="Ligar outro dia"
                >
                  {busy === "snooze" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
                </Button>
                {snoozeOpen ? (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setSnoozeOpen(false)} />
                    <div className="absolute right-0 top-11 z-20 w-40 overflow-hidden rounded-xl border border-[var(--wq-border)] bg-[var(--wq-surface)] py-1 shadow-xl">
                      {[
                        { days: 1, label: "Amanhã" },
                        { days: 3, label: "Em 3 dias" },
                        { days: 7, label: "Em 1 semana" },
                        { days: 30, label: "Em 1 mês" },
                      ].map((opt) => (
                        <button
                          key={opt.days}
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--wq-paper)]"
                          onClick={() => {
                            setSnoozeOpen(false)
                            onSnooze(opt.days)
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
              <Button
                type="button"
                className="h-10 rounded-xl bg-[var(--wq-action)] px-3 text-white hover:bg-[var(--wq-action)]/90"
                disabled={busy === "win"}
                onClick={onWin}
                title="Cliente fechou"
              >
                {busy === "win" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                <span className="ml-1 hidden lg:inline">Fechou</span>
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </li>
  )
}

function EmptyState({
  today,
  searching,
  onNew,
  onBoard,
}: {
  today: boolean
  searching: boolean
  onNew: () => void
  onBoard: () => void
}) {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--wq-border)] bg-[var(--wq-surface)] px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--wq-brand-soft)]">
        {today ? <Check className="h-7 w-7 text-[var(--wq-brand)]" /> : <Search className="h-6 w-6 text-[var(--wq-brand)]" />}
      </div>
      <p className="mt-4 text-lg font-semibold">
        {searching ? "Ninguém com esse nome ou telefone" : today ? "Nada para ligar hoje" : "Nenhum orçamento ainda"}
      </p>
      <p className="mx-auto mt-1 max-w-md text-sm text-[var(--wq-text-muted)]">
        {searching
          ? "Busque pelo nome, pelo telefone ou pelo código do pedido."
          : today
            ? "Os retornos estão em dia. Quando o cliente não fechar, use “Cliente não fechou” no kanban ou registre aqui."
            : "Quando o cliente não fechar, use “Cliente não fechou” no kanban, ou registre o orçamento do balcão aqui."}
      </p>
      {!searching ? (
        <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
          <Button type="button" className="rounded-[10px] bg-[var(--wq-brand)] text-white hover:bg-[var(--wq-brand-deep)]" onClick={onNew}>
            <Plus className="mr-1 h-4 w-4" /> Novo orçamento
          </Button>
          {today ? (
            <Button type="button" variant="outline" className="rounded-[10px]" onClick={onBoard}>
              <KanbanSquare className="mr-1 h-4 w-4" /> Ver o quadro
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

