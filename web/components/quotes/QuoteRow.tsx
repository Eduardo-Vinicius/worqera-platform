"use client"

import { useState } from "react"
import { CalendarClock, Check, Loader2, MessageCircle, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Quote } from "@/lib/apiV1"
import { cn } from "@/lib/utils"
import { STAGE_LABEL, brl, followUpLabel, followUpTone, formatPhone, initials, priorityDot, stageTone } from "./quoteUi"

const SNOOZE = [
  { days: 1, label: "Amanhã" },
  { days: 3, label: "Em 3 dias" },
  { days: 7, label: "Em 1 semana" },
  { days: 30, label: "Em 1 mês" },
]

/** One line of a quote list: who, what, value, when to call and the quick moves (WhatsApp, ligar, outro dia, fechou). */
export function QuoteRow({
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
    <li className="relative transition first:rounded-t-2xl last:rounded-b-2xl hover:bg-[var(--wq-paper)]/60">
      <div className="flex flex-col gap-2.5 px-3 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-4">
        <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--wq-brand-soft)] text-sm font-semibold text-[var(--wq-brand)]">
            {initials(q.name)}
            {open ? (
              <span className={cn("absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full ring-2 ring-[var(--wq-surface)]", priorityDot(q.priority.level))} />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="truncate font-semibold">{q.name}</p>
              {q.orderCode ? (
                <span className="rounded-md bg-[var(--wq-paper)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--wq-text-muted)]">#{q.orderCode}</span>
              ) : null}
              {showStage ? (
                <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", stageTone(q.stage))}>{STAGE_LABEL[q.stage]}</span>
              ) : null}
            </div>
            <p className="mt-0.5 truncate text-sm text-[var(--wq-text-muted)]">
              {q.what || "Sem descrição"}
              {q.reasonLabel ? ` · ${q.reasonLabel}` : ""}
              {open && q.priority.hint ? <span className="hidden lg:inline"> · {q.priority.hint}</span> : null}
            </p>
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
              <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", followUpTone(q.followUp.state))}>{followUpLabel(q)}</span>
            ) : null}
          </div>
          {open ? (
            <>
              <Button
                type="button"
                size="icon"
                className="h-9 w-9 rounded-[10px] bg-[#25D366] text-[#073018] hover:bg-[#1ebe5d]"
                disabled={!q.phoneDigits || busy === "wa"}
                onClick={onWhatsApp}
                aria-label="WhatsApp com texto pronto"
                title="WhatsApp com texto pronto"
              >
                {busy === "wa" ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
              </Button>
              {q.phone ? (
                <Button asChild type="button" size="icon" variant="outline" className="h-9 w-9 rounded-[10px]" title="Ligar">
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
                  className="h-9 w-9 rounded-[10px]"
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
                    <div className="absolute right-0 top-10 z-20 w-40 overflow-hidden rounded-xl border border-[var(--wq-border)] bg-[var(--wq-surface)] py-1 shadow-xl">
                      {SNOOZE.map((opt) => (
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
                className="h-9 rounded-[10px] bg-[var(--wq-action)] px-3 text-white hover:bg-[var(--wq-action)]/90"
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
