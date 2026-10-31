"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronDown, KanbanSquare, Loader2, PhoneCall, Plus, Search, Trophy, X, type LucideIcon } from "lucide-react"
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
import { QuoteRow } from "@/components/quotes/QuoteRow"
import { QuoteSummaryPanel, type QuoteSection } from "@/components/quotes/QuoteSummaryPanel"
import { RecoveryDialog } from "@/components/quotes/RecoveryDialog"
import { RecoveredView } from "@/components/quotes/RecoveredView"
import { followUpFromDays, waLink } from "@/components/quotes/quoteUi"

const OPEN_STAGES = new Set<QuoteStage>(["new", "contact", "followup"])
const TODAY_PREVIEW = 6

/** Same rule as the API (`isDueToday`): open, and the return is late, today, or a new quote with no date yet. */
function dueToday(q: Quote) {
  if (!OPEN_STAGES.has(q.stage)) return false
  const state = q.followUp.state
  return state === "overdue" || state === "today" || (state === "none" && q.stage === "new")
}

const LEGACY_VIEW: Record<string, QuoteSection> = { today: "ligar-hoje", board: "funil", all: "funil", recovered: "recuperados" }

export default function OrcamentosPage() {
  const router = useRouter()
  const [board, setBoard] = useState<Quote[]>([])
  const [summary, setSummary] = useState<QuoteSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Quote[]>([])
  const [searching, setSearching] = useState(false)
  const [showAllToday, setShowAllToday] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [busyId, setBusyId] = useState("")
  const [winning, setWinning] = useState<Quote | null>(null)
  const [jumpTo, setJumpTo] = useState<QuoteSection | null>(null)
  const searchSeq = useRef(0)

  const loadBoard = useCallback(async () => {
    try {
      const res = await listQuotesV1({ view: "board" })
      setBoard(res.quotes || [])
      setSummary(res.summary)
    } catch (err: any) {
      toast.error(err?.message || "Não carregou os orçamentos")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const open = params.get("open")
    if (open) setOpenId(open)
    const legacy = LEGACY_VIEW[params.get("view") || ""]
    if (legacy) setJumpTo(legacy)
    void loadBoard()
  }, [loadBoard])

  useEffect(() => {
    if (loading || !jumpTo) return
    document.getElementById(jumpTo)?.scrollIntoView({ behavior: "smooth", block: "start" })
    setJumpTo(null)
  }, [loading, jumpTo])

  useEffect(() => {
    const term = query.trim()
    if (!term) {
      setResults([])
      setSearching(false)
      return
    }
    const seq = ++searchSeq.current
    setSearching(true)
    const handle = window.setTimeout(() => {
      listQuotesV1({ view: "all", q: term })
        .then((res) => seq === searchSeq.current && setResults(res.quotes || []))
        .catch(() => {})
        .finally(() => seq === searchSeq.current && setSearching(false))
    }, 250)
    return () => window.clearTimeout(handle)
  }, [query])

  const today = useMemo(() => board.filter(dueToday).sort((a, b) => b.priority.score - a.priority.score), [board])
  const todayShown = showAllToday ? today : today.slice(0, TODAY_PREVIEW)

  const jump = (section: QuoteSection) => {
    setQuery("")
    document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const upsert = (q: Quote) => {
    const merge = (prev: Quote[]) => (prev.some((row) => row.id === q.id) ? prev.map((row) => (row.id === q.id ? q : row)) : [q, ...prev])
    setBoard(merge)
    setResults((prev) => (prev.some((row) => row.id === q.id) ? prev.map((row) => (row.id === q.id ? q : row)) : prev))
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
    setBoard((prev) => prev.map((row) => (row.id === q.id ? { ...row, stage } : row)))
    void quick(q, "stage", async () => (await patchQuoteV1(q.id, { stage })).quote)
  }

  const row = (q: Quote, showStage: boolean) => (
    <QuoteRow
      key={q.id}
      quote={q}
      showStage={showStage}
      busy={busyId.startsWith(`${q.id}:`) ? busyId.split(":")[1] : ""}
      onOpen={() => setOpenId(q.id)}
      onWhatsApp={() => whatsapp(q)}
      onCall={() => call(q)}
      onSnooze={(days) => snooze(q, days)}
      onWin={() => win(q)}
    />
  )

  const term = query.trim()

  return (
    <div className="-mx-2.5 -mt-3 sm:-mx-5 sm:-mt-5 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-6">
      <AppHeader
        title="Orçamentos"
        subtitle="Quem ligar hoje, o funil e quem voltou"
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

      <div className="mx-auto w-full max-w-[1400px] space-y-4 px-2.5 py-4 sm:space-y-6 sm:px-5 md:px-6 lg:px-8">
        <QuoteSummaryPanel summary={summary} board={board} onJump={jump} />

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--wq-text-muted)]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar em todos os orçamentos: nome, telefone ou código do pedido"
            className="h-11 rounded-[10px] bg-[var(--wq-surface)] pl-9 pr-10"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[var(--wq-text-muted)] hover:bg-[var(--wq-paper)]"
              aria-label="Limpar busca"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {term ? (
          <Section icon={Search} title="Resultado da busca" count={searching ? undefined : results.length} hint="Todas as etapas, inclusive os antigos">
            {searching && !results.length ? (
              <Loading label="Buscando" />
            ) : results.length ? (
              <List>{results.map((q) => row(q, true))}</List>
            ) : (
              <Empty title="Ninguém com esse nome ou telefone" text="Busque pelo nome, pelo telefone ou pelo código do pedido." />
            )}
          </Section>
        ) : loading ? (
          <Loading label="Carregando orçamentos" />
        ) : (
          <>
            <Section
              id="ligar-hoje"
              icon={PhoneCall}
              title="Ligar hoje"
              count={today.length}
              hint="Ordem por prioridade: retorno atrasado, motivo e valor"
            >
              {today.length ? (
                <>
                  <List>{todayShown.map((q) => row(q, false))}</List>
                  {today.length > TODAY_PREVIEW ? (
                    <button
                      type="button"
                      onClick={() => setShowAllToday((v) => !v)}
                      className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[var(--wq-brand-text)] hover:underline"
                    >
                      {showAllToday ? "Mostrar menos" : `Ver mais ${today.length - TODAY_PREVIEW}`}
                      <ChevronDown className={cn("h-4 w-4 transition", showAllToday && "rotate-180")} />
                    </button>
                  ) : null}
                </>
              ) : (
                <div className="flex items-center gap-3 rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] px-4 py-3.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <Check className="h-4 w-4" />
                  </span>
                  <p className="text-sm text-[var(--wq-text-muted)]">
                    <b className="font-semibold text-[var(--wq-text)]">Retornos em dia.</b> Quem você empurra para outro dia sai daqui e volta na data.
                  </p>
                </div>
              )}
            </Section>

            <Section id="funil" icon={KanbanSquare} title="Funil" count={board.length} hint="Abertos e fechados nos últimos 60 dias · arraste o cartão para mudar a etapa">
              {board.length ? (
                <QuoteBoard quotes={board} onOpen={setOpenId} onMove={moveStage} />
              ) : (
                <Empty
                  title="Nenhum orçamento ainda"
                  text="Quando o cliente não fechar, use “Cliente não fechou” no kanban, ou registre o orçamento do balcão aqui."
                  action={
                    <Button type="button" className="mt-4 rounded-[10px] bg-[var(--wq-brand)] text-white hover:bg-[var(--wq-brand-deep)]" onClick={() => setNewOpen(true)}>
                      <Plus className="mr-1 h-4 w-4" /> Novo orçamento
                    </Button>
                  }
                />
              )}
            </Section>

            <Section id="recuperados" icon={Trophy} title="Recuperados" hint="Quem voltou, por que tinha recusado e o que fez fechar">
              <RecoveredView onOpen={setOpenId} />
            </Section>
          </>
        )}
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
          setBoard((prev) => prev.filter((row) => row.id !== id))
          setResults((prev) => prev.filter((row) => row.id !== id))
          void loadBoard()
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

function Section({
  id,
  icon: Icon,
  title,
  count,
  hint,
  children,
}: {
  id?: string
  icon: LucideIcon
  title: string
  count?: number
  hint?: string
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <div className="mb-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--wq-text)]">
          <Icon className="h-4 w-4 text-[var(--wq-brand)]" />
          {title}
          {count != null ? (
            <span className="rounded-full bg-[var(--wq-paper)] px-2 py-0.5 text-xs font-semibold tabular-nums text-[var(--wq-text-muted)]">{count}</span>
          ) : null}
        </h2>
        {hint ? <p className="text-xs text-[var(--wq-text-muted)]">{hint}</p> : null}
      </div>
      {children}
    </section>
  )
}

function List({ children }: { children: ReactNode }) {
  return <ul className="divide-y divide-[var(--wq-border)] rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">{children}</ul>
}

function Loading({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-sm text-[var(--wq-text-muted)]">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {label}
    </div>
  )
}

function Empty({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--wq-border)] bg-[var(--wq-surface)] px-6 py-10 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-[var(--wq-text-muted)]">{text}</p>
      {action}
    </div>
  )
}
