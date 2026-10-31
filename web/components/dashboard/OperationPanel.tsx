"use client"

import Link from "next/link"
import { ArrowRight, Loader2, RefreshCw, Sparkles } from "lucide-react"
import { ACTION_ICON, TONE, useDailyBrief } from "@/components/ai/DailyBriefCard"
import { AiQuotaNotice } from "@/components/ai/AiQuotaNotice"
import { cn } from "@/lib/utils"

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })

type Sector = { sectorId: string; name: string; count: number }

/**
 * Visão geral → "Operação de hoje": the one block about the operation.
 * AI sentence, the four numbers that matter (each opens the right screen),
 * what to do first and where the queue is stuck.
 */
export function OperationPanel({ open, overdue, sectors }: { open: number; overdue: number; sectors: Sector[] }) {
  const { brief, quota, busy, hidden, load } = useDailyBrief()
  const shop = brief && brief.audience !== "sector" ? brief.numbers : null
  const stake = brief?.stake || 0
  const actions = brief?.actions || []

  const kpis = [
    { label: "Em andamento", value: open, href: "/kanban", tone: "" },
    { label: "Atrasados", value: overdue, href: "/kanban?late=1", tone: overdue ? "danger" : "" },
    { label: "Prontos para retirar", value: shop?.ready ?? 0, href: "/kanban", tone: shop?.ready ? "ok" : "" },
    { label: "Ligar hoje", value: shop?.callToday ?? 0, href: "/orcamentos", tone: shop?.callOverdue ? "warn" : shop?.callToday ? "brand" : "" },
  ]
  const top = [...sectors].sort((a, b) => (b.count || 0) - (a.count || 0))
  const shown = top.slice(0, 6)
  const max = Math.max(1, ...shown.map((s) => s.count || 0))

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
      <div className="flex items-start gap-3 px-4 pb-3 pt-4 sm:px-5">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--wq-brand)] text-white">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--wq-text-muted)]">
            Operação de hoje
            {brief?.ai ? <span className="rounded-full bg-[var(--wq-brand)] px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white">IA</span> : null}
            {stake > 0 ? (
              <span className="rounded-full bg-[var(--wq-brand-soft)] px-2 py-0.5 text-[11px] normal-case tracking-normal text-[var(--wq-brand-text)]">
                {brl(stake)} em jogo
              </span>
            ) : null}
          </p>
          <p className="mt-1 text-[15px] font-medium leading-snug text-[var(--wq-text)] sm:text-base">
            {brief
              ? brief.text
              : hidden
                ? `${open} pedido${open === 1 ? "" : "s"} em andamento${overdue ? `, ${overdue} atrasado${overdue === 1 ? "" : "s"}` : ", fila em dia"}.`
                : "Lendo a operação…"}
          </p>
          {brief?.tip ? <p className="mt-1 text-sm text-[var(--wq-text-muted)]">{brief.tip}</p> : null}
          <AiQuotaNotice quota={quota} className="mt-1.5" />
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={busy}
          className="rounded-lg p-1.5 text-[var(--wq-text-muted)] hover:bg-[var(--wq-paper)]"
          aria-label="Atualizar"
          title="Atualizar"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-px border-y border-[var(--wq-border)] bg-[var(--wq-border)] md:grid-cols-4">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className="group bg-[var(--wq-surface)] px-4 py-3 transition hover:bg-[var(--wq-paper)]">
            <p
              className={cn(
                "font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums leading-none sm:text-[28px]",
                k.tone === "danger" && "text-rose-600 dark:text-rose-400",
                k.tone === "warn" && "text-amber-600 dark:text-amber-400",
                k.tone === "ok" && "text-emerald-600 dark:text-emerald-400",
                k.tone === "brand" && "text-[var(--wq-brand)]"
              )}
            >
              {k.value}
            </p>
            <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-[var(--wq-text-muted)]">
              {k.label}
              <ArrowRight className="h-3 w-3 opacity-0 transition group-hover:opacity-100" />
            </p>
          </Link>
        ))}
      </div>

      <div className="grid gap-px bg-[var(--wq-border)] lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="bg-[var(--wq-surface)] px-4 py-3 sm:px-5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--wq-text-muted)]">Comece por aqui</p>
          {actions.length ? (
            <ol className="space-y-1">
              {actions.map((a, i) => {
                const Icon = ACTION_ICON[a.id] || ArrowRight
                const tone = TONE[a.tone] || TONE.muted
                return (
                  <li key={a.id}>
                    <Link href={a.href} className="group flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-[var(--wq-paper)]">
                      <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", tone.icon)}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-[var(--wq-text)]">
                          <span className="mr-1 text-[var(--wq-text-muted)]">{i + 1}.</span>
                          {a.title}
                        </span>
                        <span className="block truncate text-xs text-[var(--wq-text-muted)]">{a.detail}</span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-[var(--wq-text-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--wq-brand)]" />
                    </Link>
                  </li>
                )
              })}
            </ol>
          ) : (
            <p className="py-2 text-sm text-[var(--wq-text-muted)]">{brief || hidden ? "Nada urgente agora. Bom momento para adiantar a fila." : "Carregando…"}</p>
          )}
        </div>

        <div className="bg-[var(--wq-surface)] px-4 py-3 sm:px-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--wq-text-muted)]">Fila por setor</p>
            <Link href="/kanban" className="text-xs font-semibold text-[var(--wq-brand-text)] hover:underline">
              Kanban →
            </Link>
          </div>
          {shown.length ? (
            <ul className="space-y-2">
              {shown.map((s) => (
                <li key={String(s.sectorId)} className="grid grid-cols-[minmax(0,7rem)_1fr_2rem] items-center gap-2 text-sm">
                  <span className="truncate text-[var(--wq-text)]">{s.name}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-[var(--wq-paper)]">
                    <span className="block h-full rounded-full bg-[var(--wq-brand)]" style={{ width: `${Math.max(4, ((s.count || 0) / max) * 100)}%` }} />
                  </span>
                  <span className="text-right font-semibold tabular-nums">{s.count}</span>
                </li>
              ))}
              {top.length > shown.length ? (
                <li className="text-xs text-[var(--wq-text-muted)]">+{top.length - shown.length} setores</li>
              ) : null}
            </ul>
          ) : (
            <p className="py-2 text-sm text-[var(--wq-text-muted)]">Sem setores ativos.</p>
          )}
        </div>
      </div>
    </section>
  )
}
