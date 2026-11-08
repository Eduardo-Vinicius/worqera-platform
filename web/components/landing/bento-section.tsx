"use client"

import { useRef, type CSSProperties, type ReactNode } from "react"
import { useInView } from "motion/react"
import {
  BarChart3,
  Camera,
  DatabaseBackup,
  HandCoins,
  KanbanSquare,
  MessageCircle,
  Package,
  QrCode,
  Sparkles,
  Star,
  Tv,
  Wallet,
} from "lucide-react"
import { useLanguage } from "@/components/landing/language-provider"
import { PLAN_ROWS } from "@/components/landing/features-data"
import { RevealGroup, RevealItem } from "@/components/landing/fx/reveal"
import { Spotlight } from "@/components/landing/fx/spotlight"
import { QrGlyph } from "@/components/landing/how-visuals"
import { cn } from "@/lib/utils"

const ICONS = [KanbanSquare, Tv, QrCode, Camera, MessageCircle, HandCoins, Wallet, Package, Star, BarChart3, Sparkles, DatabaseBackup]

/** Row of the plan table that says which plan has each tile; `null` = comes with setup. */
const PLAN_ROW_OF = [
  "Kanban por setores",
  "Contas por setor e TVs",
  "Etiqueta, QR e consulta do cliente",
  "Kanban por setores",
  "WhatsApp com texto pronto",
  "CRM de orçamentos (Ligar hoje e funil)",
  "Financeiro, métricas e TV financeiro",
  "Produtos, estoque e venda no pedido",
  "Avaliações com convite ao Google",
  "Financeiro, métricas e TV financeiro",
  "IA (usos por mês)",
  null,
]

/** Tile order on the grid and how much room each one takes. */
const LAYOUT: Array<{ index: number; size: "big" | "wide" | "small" }> = [
  { index: 0, size: "big" },
  { index: 1, size: "small" },
  { index: 2, size: "small" },
  { index: 3, size: "small" },
  { index: 5, size: "small" },
  { index: 4, size: "wide" },
  { index: 6, size: "big" },
  { index: 7, size: "small" },
  { index: 8, size: "small" },
  { index: 9, size: "small" },
  { index: 11, size: "small" },
  { index: 10, size: "wide" },
]

function delay(seconds: number): CSSProperties {
  return { animationDelay: `${seconds}s` }
}

function KanbanMock({ cols }: { cols: string[] }) {
  return (
    <div className="relative grid h-full grid-cols-3 gap-2">
      {cols.map((name, index) => (
        <div key={name} className="h-full min-h-56 rounded-xl bg-[var(--mock-bg)] p-2">
          <p className="truncate text-[10px] font-semibold tracking-[0.1em] text-[var(--muted-foreground)] uppercase">{name}</p>
          <div className={cn("mt-2 h-8 rounded-lg border border-[var(--border)] bg-[var(--surface)]", index === 0 && "opacity-0")} />
          {Array.from({ length: 3 - (index % 2) }).map((_, row) => (
            <div key={row} className="mt-1.5 h-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] opacity-70" />
          ))}
        </div>
      ))}
      <div className="lp-b-travel absolute top-8 left-2 w-[calc((100%_-_1rem)/3_-_1rem)]">
        <div className="h-8 rounded-lg border border-[var(--primary)]/60 bg-[var(--surface)] px-2 py-1.5 shadow-[0_10px_24px_-12px_rgba(125,38,222,0.7)] ring-2 ring-[var(--primary)]/20">
          <span className="block h-1.5 w-3/4 rounded-full bg-[var(--primary)]/60" />
          <span className="mt-1 block h-1.5 w-1/2 rounded-full bg-[var(--muted)]" />
        </div>
      </div>
    </div>
  )
}

function TvMock({ rows, live }: { rows: string[]; live: string }) {
  return (
    <div className="rounded-xl bg-[#0b1020] p-2.5 text-white">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.12em] uppercase">
        <span className="lp-live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />
        {live}
      </p>
      <div className="mt-2 h-[60px] overflow-hidden">
        <div className="lp-b-rows space-y-1">
          {[...rows, ...rows.slice(0, 3)].map((label, index) => (
            <p key={`${label}-${index}`} className="truncate rounded bg-white/10 px-2 py-0.5 text-[11px]">
              {label}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}

function QrMock() {
  return (
    <div className="relative mx-auto w-fit rounded-xl bg-white p-2 text-[#0f172a]">
      <QrGlyph className="h-[4.5rem] w-[4.5rem]" />
      <span className="lp-b-scan absolute inset-x-1 top-2 h-0.5 rounded-full bg-[var(--primary)] shadow-[0_0_12px_2px_rgba(125,38,222,0.6)]" />
    </div>
  )
}

function PhotoMock({ before, after }: { before: string; after: string }) {
  return (
    <div className="relative h-24 overflow-hidden rounded-xl">
      <div className="absolute inset-0 flex items-end bg-gradient-to-br from-amber-900/60 via-stone-500/60 to-stone-700/70 p-2">
        <span className="ml-auto rounded bg-black/40 px-1.5 text-[10px] font-semibold text-white">{before}</span>
      </div>
      <div className="lp-b-split absolute inset-0 flex items-end bg-gradient-to-br from-white via-violet-100 to-teal-100 p-2">
        <span className="rounded bg-[var(--primary)] px-1.5 text-[10px] font-semibold text-white">{after}</span>
      </div>
      <span className="lp-b-split-line absolute top-0 bottom-0 w-0.5 -translate-x-1/2 bg-white shadow" />
    </div>
  )
}

function ChatMock({ lines }: { lines: string[] }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-[var(--wa-bg)] p-2.5">
      {lines.map((line, index) => (
        <p
          key={line}
          style={delay(index * 1.2)}
          className={cn(
            "lp-b-bubble max-w-[80%] rounded-lg px-2 py-1 text-[11px] text-[var(--ink)] shadow-sm",
            index === 1 ? "self-end bg-[var(--wa-out)]" : "self-start bg-[var(--wa-in)]"
          )}
        >
          {line}
        </p>
      ))}
    </div>
  )
}

function CrmMock({ from, to, card }: { from: string; to: string; card: string }) {
  return (
    <div className="relative grid grid-cols-2 gap-2">
      {[from, to].map((name) => (
        <div key={name} className="h-[4.5rem] rounded-xl bg-[var(--mock-bg)] p-1.5">
          <p className="truncate text-[10px] font-semibold text-[var(--muted-foreground)]">{name}</p>
        </div>
      ))}
      <div className="lp-b-crm absolute top-6 left-1.5 w-[calc(50%_-_1.25rem)] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-1.5 py-1 shadow-sm">
        <p className="truncate text-[10px] font-semibold text-[var(--ink)]">{card}</p>
        <span className="relative mt-0.5 block h-3.5">
          <span className="lp-b-chip-a absolute inset-0 w-fit rounded-full bg-amber-500/15 px-1.5 text-[9px] leading-[14px] font-semibold text-amber-600">{from}</span>
          <span className="lp-b-chip-b absolute inset-0 w-fit rounded-full bg-[color-mix(in_srgb,var(--ready)_16%,transparent)] px-1.5 text-[9px] leading-[14px] font-semibold text-[var(--ready)]">
            {to}
          </span>
        </span>
      </div>
    </div>
  )
}

function FinanceMock({ label, value }: { label: string; value: string }) {
  const bars = [38, 62, 45, 80, 56, 92, 70]
  return (
    <div className="flex h-full flex-col rounded-xl bg-[var(--mock-bg)] p-3">
      <p className="text-[11px] text-[var(--muted-foreground)]">{label}</p>
      <p className="lp-display text-2xl font-semibold text-[var(--ink)]">{value}</p>
      <div className="mt-3 flex min-h-40 flex-1 items-end gap-1.5">
        {bars.map((height, index) => (
          <span
            key={index}
            style={{ height: `${height}%`, ...delay(index * 0.12) }}
            className={cn("lp-b-bar flex-1 rounded-t-md", index === bars.length - 2 ? "bg-[var(--primary)]" : "bg-[var(--primary)]/35")}
          />
        ))}
      </div>
    </div>
  )
}

function StockMock({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-[var(--mock-bg)] px-3 py-2.5">
      <span className="text-xs text-[var(--muted-foreground)]">{label}</span>
      <span className="lp-display relative h-7 w-8 overflow-hidden text-xl font-semibold text-[var(--ink)]">
        <span className="lp-b-swap-out absolute inset-0 text-right">18</span>
        <span className="lp-b-swap-in absolute inset-0 text-right text-[var(--ready)]">17</span>
      </span>
    </div>
  )
}

function StarsMock() {
  return (
    <div className="flex items-center gap-2">
      <span className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star key={index} style={delay(index * 0.18)} className="lp-b-star h-5 w-5 fill-current" />
        ))}
      </span>
      <span className="lp-display text-lg font-semibold text-[var(--ink)]">4,9</span>
    </div>
  )
}

function GaugeMock({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 40 40" className="h-16 w-16 -rotate-90" aria-hidden>
        <circle cx="20" cy="20" r="15.9" fill="none" stroke="var(--muted)" strokeWidth="4" />
        <circle className="lp-b-gauge" cx="20" cy="20" r="15.9" fill="none" stroke="var(--primary)" strokeWidth="4" strokeLinecap="round" pathLength={100} />
      </svg>
      <span>
        <span className="lp-display block text-xl font-semibold text-[var(--ink)]">92%</span>
        <span className="text-xs text-[var(--muted-foreground)]">{label}</span>
      </span>
    </div>
  )
}

function AiMock({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-[var(--brand-soft)] px-3 py-2.5">
      <Sparkles className="h-4 w-4 shrink-0 text-[var(--primary)]" />
      <span className="lp-mono lp-b-type max-w-full text-xs text-[var(--ink)]" style={{ "--lp-type-w": `${text.length}ch` } as CSSProperties}>
        {text}
      </span>
    </div>
  )
}

function ImportMock({ label }: { label: string }) {
  return (
    <div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--muted)]">
        <span className="lp-b-fill block h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--action)]" />
      </div>
      <p className="mt-2 text-xs font-semibold text-[var(--ink)]">{label}</p>
    </div>
  )
}

/** Everything that comes with the system, as a mosaic of tiles that each show a tiny bit of the product moving. */
export function BentoSection() {
  const { t } = useLanguage()
  const ref = useRef<HTMLElement>(null)
  const play = useInView(ref, { margin: "100px 0px" })
  const items = t.included.items
  const mock = t.included.mock
  const plan = t.included.plan

  const planOf = (index: number) => {
    const label = PLAN_ROW_OF[index]
    if (!label) return plan.setup
    const row = PLAN_ROWS.find((r) => r.pt === label)
    if (!row || row.basic !== "no") return plan.all
    return row.pro !== "no" ? plan.pro : plan.business
  }

  const visuals: Record<number, ReactNode> = {
    0: <KanbanMock cols={mock.cols} />,
    1: <TvMock rows={mock.tvRows} live={mock.live} />,
    2: <QrMock />,
    3: <PhotoMock before={mock.before} after={mock.after} />,
    4: <ChatMock lines={mock.wa} />,
    5: <CrmMock from={mock.crmFrom} to={mock.crmTo} card={mock.crmCard} />,
    6: <FinanceMock label={mock.today} value={mock.todayValue} />,
    7: <StockMock label={mock.stock} />,
    8: <StarsMock />,
    9: <GaugeMock label={mock.onTime} />,
    10: <AiMock text={mock.ai} />,
    11: <ImportMock label={mock.imported} />,
  }

  return (
    <section ref={ref} id="recursos" data-play={play ? "true" : "false"} className="scroll-mt-24 border-t border-[var(--border)] py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--primary)] uppercase">{t.included.eyebrow}</p>
        <h2 className="lp-display mt-3 max-w-2xl text-balance text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-[2.6rem] sm:leading-[1.08]">
          {t.included.title}
        </h2>

        <RevealGroup stagger={0.05} className="mt-10 grid grid-flow-dense auto-rows-[minmax(200px,auto)] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {LAYOUT.map(({ index, size }) => {
            const item = items[index]
            const Icon = ICONS[index] || KanbanSquare
            return (
              <RevealItem
                key={item.title}
                className={cn(size === "big" && "sm:col-span-2 lg:row-span-2", size === "wide" && "sm:col-span-2")}
              >
                <Spotlight className="group flex h-full flex-col justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:border-[color-mix(in_srgb,var(--primary)_40%,var(--border))]">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--primary)] transition group-hover:scale-110">
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--muted-foreground)]">
                        {planOf(index)}
                      </span>
                    </div>
                    <h3 className={cn("lp-display mt-4 font-semibold text-[var(--ink)]", size === "big" ? "text-2xl" : "text-lg")}>{item.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--muted-foreground)]">{item.desc}</p>
                  </div>
                  <div aria-hidden className={cn(size === "big" && "flex min-h-0 flex-1 flex-col [&>*]:flex-1")}>
                    {visuals[index]}
                  </div>
                </Spotlight>
              </RevealItem>
            )
          })}
        </RevealGroup>
        <p className="mt-4 text-sm text-[var(--muted-foreground)]">{t.included.note}</p>
      </div>
    </section>
  )
}
