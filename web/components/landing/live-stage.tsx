"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, m, useInView, useReducedMotion } from "motion/react"
import { ArrowRight, Bell, CheckCheck, MessageCircle, QrCode, RotateCcw, Star } from "lucide-react"
import { useLanguage } from "@/components/landing/language-provider"
import { RollNumber } from "@/components/landing/fx/roll-number"
import { cn } from "@/lib/utils"

const LAST = 4
const STEP_MS = 2600
const HOLD_MS = 3800
const IDLE_MS = 8000
const STOCK = 18
/** Which pane a phone screen shows on each step: team board, customer page, WhatsApp. */
const PANE_FOR_STEP = [0, 1, 2, 0, 1]
const GHOSTS: Array<Array<{ code: string; late?: boolean }>> = [
  [{ code: "#0412" }, { code: "#0409" }],
  [{ code: "#0405", late: true }, { code: "#0401" }, { code: "#0398" }],
  [{ code: "#0390" }],
  [{ code: "#0377" }, { code: "#0371" }],
]
const SPRING = { type: "spring", stiffness: 260, damping: 26 } as const

type StageProps = {
  /** Item on the order card, e.g. the trade's item name. */
  item?: string
  service?: string
  /** Four sector names, from received to delivered. */
  cols?: string[]
  className?: string
}

/** Where the card sits on the board for each step. */
const columnOf = (step: number) => Math.min(step, 3)

/**
 * One order living through the whole operation, in sync on three screens: the team's kanban,
 * the customer's tracking page and the WhatsApp chat. Plays on its own while visible;
 * "Move order" lets the visitor drive it and autoplay comes back after a few idle seconds.
 */
export function LiveStage({ item, service, cols, className }: StageProps) {
  const { t } = useLanguage()
  const s = t.stage
  const columns = cols && cols.length >= 4 ? cols.slice(0, 4) : s.cols
  const card = { item: item || s.item, service: service || s.service }

  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.3 })
  const reduced = useReducedMotion()
  const [autoStep, setStep] = useState(0)
  const [touches, setTouches] = useState(0)
  const touched = useRef(false)
  const [paneChoice, setPaneChoice] = useState<number | null>(null)
  const step = reduced ? LAST : autoStep

  useEffect(() => {
    if (reduced || !inView) return
    const wait = touched.current ? IDLE_MS : step === LAST ? HOLD_MS : STEP_MS
    touched.current = false
    const timer = window.setTimeout(() => {
      setPaneChoice(null)
      setStep((current) => (current >= LAST ? 0 : current + 1))
    }, wait)
    return () => window.clearTimeout(timer)
  }, [step, inView, reduced, touches])

  const advance = () => {
    touched.current = true
    setPaneChoice(null)
    setStep((current) => (current >= LAST ? 0 : current + 1))
    setTouches((n) => n + 1)
  }

  const choosePane = (pane: number) => {
    touched.current = true
    setPaneChoice(pane)
    setTouches((n) => n + 1)
  }

  const pane = paneChoice ?? PANE_FOR_STEP[step]

  return (
    <figure
      ref={ref}
      className={cn(
        "lp-glass relative rounded-[1.75rem] border border-[var(--border)] p-2 shadow-[var(--shadow-lg)] sm:p-3",
        className
      )}
    >
      <figcaption className="sr-only">{s.beats[step]}</figcaption>

      <div className="flex flex-wrap items-center justify-between gap-3 px-2 pt-1 pb-3 sm:px-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="lp-live-dot absolute inline-flex h-full w-full rounded-full bg-[var(--ready)]" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--ready)]" />
          </span>
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--muted-foreground)] uppercase">{s.live}</p>
          <p className="lp-mono text-xs text-[var(--muted-foreground)]">{s.code}</p>
        </div>

        <div className="flex w-full items-center gap-3 sm:w-auto">
          <div className="flex flex-1 gap-1 sm:w-32 sm:flex-none" aria-hidden>
            {Array.from({ length: LAST + 1 }).map((_, index) => (
              <span key={index} className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--muted)]">
                <m.span
                  className="block h-full origin-left rounded-full bg-[var(--primary)]"
                  initial={false}
                  animate={{ scaleX: index <= step ? 1 : 0 }}
                  transition={{ duration: 0.4 }}
                />
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={advance}
            className="lp-cta lp-shine inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold"
          >
            {step >= LAST ? (
              <>
                <RotateCcw className="h-3.5 w-3.5" />
                {s.restart}
              </>
            ) : (
              <>
                {s.next}
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      <div className="mx-2 mb-3 grid grid-cols-3 gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1 lg:hidden" role="tablist">
        {s.panes.map((label, index) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={pane === index}
            onClick={() => choosePane(index)}
            className={cn(
              "relative isolate rounded-full py-1.5 text-xs font-semibold transition-colors",
              pane === index ? "text-[var(--primary-foreground)]" : "text-[var(--muted-foreground)]"
            )}
          >
            {pane === index ? (
              <m.span layoutId="lp-stage-tab" className="absolute inset-0 -z-10 rounded-full bg-[var(--primary)]" transition={SPRING} />
            ) : null}
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.65fr)_252px_minmax(0,1fr)]">
        <div className={cn(pane === 0 ? "block" : "hidden", "lg:block")}>
          <BoardPane step={step} columns={columns} card={card} />
        </div>
        <div className={cn(pane === 1 ? "flex" : "hidden", "justify-center lg:flex")}>
          <PhonePane step={step} columns={columns} card={card} />
        </div>
        <div className={cn(pane === 2 ? "block" : "hidden", "lg:block")}>
          <ChatPane step={step} />
        </div>
      </div>

      <div className="flex min-h-11 items-center gap-2 px-3 pt-3 pb-1" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <m.p
            key={step}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-2 text-sm text-[var(--ink)]"
          >
            <span className="lp-mono flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--brand-soft)] px-1.5 text-[11px] font-semibold text-[var(--primary)]">
              {step + 1}
            </span>
            {s.beats[step]}
          </m.p>
        </AnimatePresence>
      </div>
    </figure>
  )
}

type PaneProps = { step: number; columns: string[]; card: { item: string; service: string } }

function BoardPane({ step, columns, card }: PaneProps) {
  const { t } = useLanguage()
  const s = t.stage
  const column = columnOf(step)
  const scroller = useRef<HTMLDivElement>(null)
  const delivered = step >= 3

  useEffect(() => {
    const el = scroller.current
    if (!el || el.scrollWidth <= el.clientWidth) return
    const target = el.children[column] as HTMLElement | undefined
    if (target) el.scrollTo({ left: target.offsetLeft - 8, behavior: "smooth" })
  }, [column])

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-3 py-2.5">
        <span className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </span>
        <span className="lp-mono flex-1 truncate rounded-md bg-[var(--muted)] px-2.5 py-1 text-[11px] text-[var(--muted-foreground)]">{s.url}</span>
        <span className="hidden text-xs font-semibold text-[var(--ink)] sm:inline">{s.board}</span>
      </div>

      <div ref={scroller} className="grid flex-1 snap-x grid-cols-[repeat(4,minmax(140px,1fr))] gap-2 lg:grid-cols-4 overflow-x-auto bg-[var(--mock-bg)] p-2.5 sm:p-3 [scrollbar-width:none]">
        {columns.map((name, index) => {
          const here = column === index
          const count = GHOSTS[index].length + (here ? 1 : 0)
          return (
            <div key={`${name}-${index}`} className="flex min-h-[300px] snap-start flex-col gap-2 rounded-xl bg-[var(--mock-col)] p-2">
              <div className="flex items-center justify-between px-1 pt-0.5">
                <p className={cn("truncate text-[11px] font-semibold tracking-[0.08em] uppercase", here ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]")}>
                  {name}
                </p>
                <span className="lp-mono rounded-full bg-[var(--muted)] px-1.5 text-[11px] font-semibold text-[var(--ink)]">
                  <RollNumber value={String(count)} />
                </span>
              </div>

              {here ? (
                <m.article
                  layoutId="lp-stage-card"
                  transition={SPRING}
                  className="relative rounded-lg border border-[var(--primary)]/50 bg-[var(--surface)] p-2.5 shadow-[0_12px_28px_-16px_rgba(125,38,222,0.7)] ring-2 ring-[var(--primary)]/20"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="lp-mono text-xs font-semibold text-[var(--primary)]">{s.code}</p>
                    <QrCode className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                  </div>
                  <p className="mt-1 truncate text-[13px] font-semibold text-[var(--ink)]">
                    {s.customer} · {card.item}
                  </p>
                  <p className="truncate text-[11px] text-[var(--muted-foreground)]">{card.service}</p>
                  <div className="mt-2 flex items-center justify-between gap-1">
                    <span className="truncate rounded-full bg-[var(--muted)] px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)]">{s.due}</span>
                    <AnimatePresence initial={false}>
                      {step >= 2 ? (
                        <m.span
                          key={delivered ? "paid" : "ready"}
                          initial={{ opacity: 0, scale: 0.7 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.7 }}
                          className={cn(
                            "shrink-0 rounded-full bg-[color-mix(in_srgb,var(--ready)_16%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--ready)]",
                            !delivered && "lp-ready-pulse"
                          )}
                        >
                          {delivered ? s.paid : s.ready}
                        </m.span>
                      ) : null}
                    </AnimatePresence>
                  </div>
                </m.article>
              ) : null}

              {GHOSTS[index].map((ghost) => (
                <div key={ghost.code} className="rounded-lg border border-[var(--border)] bg-[var(--surface)]/70 p-2.5 opacity-80">
                  <div className="flex items-center justify-between">
                    <p className="lp-mono text-[11px] text-[var(--muted-foreground)]">{ghost.code}</p>
                    {ghost.late ? (
                      <span className="lp-late-pulse rounded-full bg-[color-mix(in_srgb,var(--late)_14%,transparent)] px-1.5 text-[10px] font-semibold text-[var(--late)]">
                        {s.late}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 h-1.5 w-4/5 rounded-full bg-[var(--muted)]" />
                  <div className="mt-1.5 h-1.5 w-1/2 rounded-full bg-[var(--muted)]" />
                </div>
              ))}
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] px-3 py-2.5 text-xs">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors duration-500",
            delivered ? "border-[var(--ready)]/40 bg-[color-mix(in_srgb,var(--ready)_12%,transparent)] text-[var(--ink)]" : "border-[var(--border)] text-[var(--muted-foreground)]"
          )}
        >
          {s.product} ·
          <RollNumber value={String(delivered ? STOCK - 1 : STOCK)} className="font-semibold" />
          {s.stock}
        </span>
        <span className="hidden text-[var(--muted-foreground)] sm:inline">{columns[column]}</span>
      </div>
    </div>
  )
}

function PhonePane({ step, columns, card }: PaneProps) {
  const { t } = useLanguage()
  const s = t.stage
  const column = columnOf(step)

  return (
    <div className="relative h-[470px] w-[252px] shrink-0 rounded-[2.6rem] bg-[#0b0b12] p-[9px] shadow-[0_30px_60px_-30px_rgba(15,23,42,0.8)]">
      <div className="relative h-full overflow-hidden rounded-[2.05rem] bg-[var(--paper)]">
        <div className="absolute top-2 left-1/2 z-20 h-[22px] w-[84px] -translate-x-1/2 rounded-full bg-[#0b0b12]" aria-hidden />
        <div className="flex items-center justify-between px-6 pt-2.5 text-[11px] font-semibold text-[var(--ink)]" aria-hidden>
          <span>9:41</span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-3 rounded-[2px] border border-current" />
          </span>
        </div>

        <AnimatePresence>
          {step === 2 ? (
            <m.div
              key="notify"
              initial={{ y: -90, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -90, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 24, delay: 0.5 }}
              className="lp-glass absolute inset-x-2 top-9 z-10 flex items-start gap-2 rounded-2xl border border-[var(--border)] p-2.5 shadow-lg"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--wa)] text-white">
                <MessageCircle className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold text-[var(--ink)]">WhatsApp · {s.wa.contact}</span>
                <span className="block truncate text-[11px] text-[var(--muted-foreground)]">{s.phone.notify}</span>
              </span>
            </m.div>
          ) : null}
        </AnimatePresence>

        <div className="px-4 pt-7">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--primary)] text-sm font-bold text-[var(--primary-foreground)]">
              {s.phone.shop.charAt(0)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-[var(--ink)]">{s.phone.shop}</p>
              <p className="lp-mono truncate text-[10px] text-[var(--muted-foreground)]">{s.phone.url}</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
            <p className="text-[10px] font-semibold tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
              {s.phone.order} {s.code}
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-[var(--ink)]">{card.item}</p>
            <p className="truncate text-[11px] text-[var(--muted-foreground)]">{card.service}</p>

            <ol className="mt-3 space-y-0">
              {columns.map((name, index) => {
                const reached = index <= column
                const current = index === column
                return (
                  <li key={`${name}-${index}`} className="relative flex gap-2.5 pb-3 last:pb-0">
                    {index < columns.length - 1 ? (
                      <span className="absolute top-4 left-[7px] h-[calc(100%_-_8px)] w-0.5 overflow-hidden rounded-full bg-[var(--muted)]" aria-hidden>
                        <m.span
                          className="block w-full origin-top bg-[var(--primary)]"
                          style={{ height: "100%" }}
                          initial={false}
                          animate={{ scaleY: index < column ? 1 : 0 }}
                          transition={{ duration: 0.5 }}
                        />
                      </span>
                    ) : null}
                    <m.span
                      initial={false}
                      animate={{ scale: current ? 1.15 : 1 }}
                      className={cn(
                        "relative z-[1] mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-300",
                        reached ? "border-[var(--primary)] bg-[var(--primary)]" : "border-[var(--border)] bg-[var(--surface)]"
                      )}
                    >
                      {reached ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                    </m.span>
                    <span className={cn("text-xs", current ? "font-semibold text-[var(--ink)]" : reached ? "text-[var(--ink)]" : "text-[var(--muted-foreground)]")}>
                      {name}
                    </span>
                  </li>
                )
              })}
            </ol>
          </div>

          <p className="mt-3 flex items-center justify-between rounded-xl bg-[var(--brand-soft)] px-3 py-2 text-[11px] text-[var(--ink)]">
            <span className="text-[var(--muted-foreground)]">{s.phone.due}</span>
            <span className="font-semibold">{s.due}</span>
          </p>

          <AnimatePresence>
            {step === LAST ? (
              <m.div
                key="rate"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 text-center"
              >
                <p className="text-[11px] font-semibold text-[var(--ink)]">{s.phone.rate}</p>
                <div className="mt-1.5 flex justify-center gap-1">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <m.span
                      key={index}
                      initial={{ scale: 0.4, opacity: 0.3 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.3 + index * 0.12, type: "spring", stiffness: 500, damping: 15 }}
                    >
                      <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                    </m.span>
                  ))}
                </div>
                <m.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="mt-1.5 text-[10px] text-[var(--muted-foreground)]">
                  {s.phone.thanks}
                </m.p>
              </m.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

type Message = { id: string; at: number; from: "shop" | "me"; text: string; time: string; stars?: boolean }

function ChatPane({ step }: { step: number }) {
  const { t } = useLanguage()
  const wa = t.stage.wa
  const [typedStep, setTypedStep] = useState(-1)

  const messages: Message[] = [
    { id: "received", at: 0, from: "shop", text: wa.received, time: "09:12" },
    { id: "ready", at: 2, from: "shop", text: wa.ready, time: "16:40" },
    { id: "reply", at: 3, from: "me", text: wa.reply, time: "16:42" },
    { id: "review", at: 4, from: "shop", text: wa.review, time: "18:20" },
    { id: "stars", at: 4, from: "me", text: wa.stars, time: "18:21", stars: true },
  ]
  const shopTalks = messages.some((msg) => msg.at === step && msg.from === "shop")

  const typing = shopTalks && typedStep !== step

  useEffect(() => {
    if (!shopTalks) return
    const timer = window.setTimeout(() => setTypedStep(step), 800)
    return () => window.clearTimeout(timer)
  }, [step, shopTalks])

  const visible = messages.filter((msg) => msg.at < step || (msg.at === step && !typing))

  return (
    <div className="flex h-[470px] flex-col overflow-hidden rounded-2xl border border-[var(--border)]">
      <div className="flex items-center gap-2.5 bg-[#075e54] px-3 py-2.5 text-white">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-bold">{wa.contact.charAt(0)}</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{wa.contact}</p>
          <p className="text-[11px] text-white/75">{typing ? wa.typing : wa.status}</p>
        </div>
        <Bell className="ml-auto h-4 w-4 text-white/70" />
      </div>

      <div className="flex flex-1 flex-col justify-end gap-2 overflow-hidden bg-[var(--wa-bg)] p-3">
        <AnimatePresence initial={false}>
          {visible.map((msg) => (
            <m.div
              key={msg.id}
              layout
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, delay: msg.from === "me" && msg.at === step ? 0.9 : 0 }}
              className={cn(
                "max-w-[85%] rounded-xl px-2.5 py-1.5 text-[12.5px] leading-snug text-[var(--ink)] shadow-sm",
                msg.from === "shop" ? "self-start rounded-tl-sm bg-[var(--wa-in)]" : "self-end rounded-tr-sm bg-[var(--wa-out)]"
              )}
            >
              {msg.stars ? (
                <span className="mb-0.5 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </span>
              ) : null}
              {msg.text}
              <span className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-[var(--muted-foreground)]">
                {msg.time}
                {msg.from === "me" ? <CheckCheck className="h-3 w-3 text-sky-500" /> : null}
              </span>
            </m.div>
          ))}
          {typing ? (
            <m.div
              key="typing"
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="lp-typing flex w-fit gap-1 self-start rounded-xl rounded-tl-sm bg-[var(--wa-in)] px-3 py-2.5 text-[var(--muted-foreground)]"
            >
              <span />
              <span />
              <span />
            </m.div>
          ) : null}
        </AnimatePresence>
      </div>
      <p className="border-t border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[10.5px] leading-snug text-[var(--muted-foreground)]">{wa.note}</p>
    </div>
  )
}
