"use client"

import { useState } from "react"
import {
  BellRing,
  Cake,
  ChevronDown,
  Crown,
  HandCoins,
  LayoutDashboard,
  Repeat,
  Search,
  Sparkle,
  Star,
  UserMinus,
  UserPlus,
  type LucideIcon,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { CrmSummary } from "@/lib/apiV1"
import { cn } from "@/lib/utils"
import { CRM_GROUPS, CRM_TABS, TAB_HINT, tabCount, type CrmTab } from "./crmUi"

export const TAB_ICON: Record<CrmTab, LucideIcon> = {
  base: LayoutDashboard,
  devendo: HandCoins,
  voltar: BellRing,
  aniversariantes: Cake,
  feedback: Star,
  voltaram: Repeat,
  novos: UserPlus,
  recorrentes: Sparkle,
  vip: Crown,
  sumidos: UserMinus,
  todos: Search,
}

const TODO = new Set<CrmTab>(CRM_GROUPS[1].tabs)

function Count({ tab, summary, active }: { tab: CrmTab; summary: CrmSummary | null; active: boolean }) {
  const n = tabCount(tab, summary as any)
  if (n == null || (n === 0 && !TODO.has(tab))) return null
  if (TODO.has(tab) && n > 0) {
    return (
      <span className="ml-auto min-w-[1.5rem] shrink-0 rounded-full bg-[var(--wq-action)] px-1.5 py-0.5 text-center text-[11px] font-semibold tabular-nums text-white">
        {n}
      </span>
    )
  }
  return (
    <span className={cn("ml-auto shrink-0 text-xs tabular-nums", active ? "text-[var(--wq-brand-text)]" : "text-[var(--wq-text-muted)]")}>
      {n}
    </span>
  )
}

function Items({ tab, summary, onPick, roomy = false }: { tab: CrmTab; summary: CrmSummary | null; onPick: (t: CrmTab) => void; roomy?: boolean }) {
  return (
    <div className="space-y-5">
      {CRM_GROUPS.map((g) => (
        <div key={g.title}>
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--wq-text-muted)]/80">{g.title}</p>
          <ul className="space-y-px">
            {g.tabs.map((id) => {
              const t = CRM_TABS.find((x) => x.id === id)!
              const Icon = TAB_ICON[id]
              const active = tab === id
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => onPick(id)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm transition",
                      roomy ? "py-2.5" : "py-2",
                      active
                        ? "bg-[var(--wq-brand-soft)] font-semibold text-[var(--wq-brand-text)]"
                        : "text-[var(--wq-text)] hover:bg-[var(--wq-paper)]"
                    )}
                  >
                    {active ? <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-[var(--wq-brand)]" /> : null}
                    <Icon className={cn("h-4 w-4 shrink-0", active ? "text-[var(--wq-brand)]" : "text-[var(--wq-text-muted)]")} />
                    <span className="min-w-0 flex-1 truncate">{t.label}</span>
                    <Count tab={id} summary={summary} active={active} />
                  </button>
                  {roomy ? <p className="px-3 pb-1 pl-[2.6rem] text-[11px] text-[var(--wq-text-muted)]">{TAB_HINT[id]}</p> : null}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

/** Section title + what it is for (once, above the content, instead of in every menu item). */
export function CrmSectionTitle({ tab }: { tab: CrmTab }) {
  const t = CRM_TABS.find((x) => x.id === tab)
  return (
    <div className="hidden lg:block">
      <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">{t?.label}</h2>
      <p className="text-sm text-[var(--wq-text-muted)]">{TAB_HINT[tab]}</p>
    </div>
  )
}

/** CRM sections grouped by intent: quiet sidebar on desktop, one button + list on phones. */
export function CrmNav({ tab, summary, onTab }: { tab: CrmTab; summary: CrmSummary | null; onTab: (t: CrmTab) => void }) {
  const [open, setOpen] = useState(false)
  const current = CRM_TABS.find((t) => t.id === tab)
  const Icon = TAB_ICON[tab]
  const todo = CRM_GROUPS[1].tabs.reduce((n, id) => n + (tabCount(id, summary as any) || 0), 0)
  return (
    <>
      <aside className="hidden lg:block">
        <nav className="sticky top-4" aria-label="Seções do CRM">
          <Items tab={tab} summary={summary} onPick={onTab} />
        </nav>
      </aside>

      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 rounded-xl border border-[var(--wq-border)] bg-[var(--wq-surface)] px-3.5 py-3 text-left"
        >
          <Icon className="h-4 w-4 shrink-0 text-[var(--wq-brand)]" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{current?.label}</span>
            <span className="block truncate text-xs text-[var(--wq-text-muted)]">{TAB_HINT[tab]}</span>
          </span>
          {todo > 0 && !TODO.has(tab) ? (
            <span className="shrink-0 rounded-full bg-[var(--wq-action)] px-2 py-0.5 text-[11px] font-semibold text-white">{todo} para hoje</span>
          ) : null}
          <ChevronDown className="h-4 w-4 shrink-0 text-[var(--wq-text-muted)]" />
        </button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Clientes</DialogTitle>
            </DialogHeader>
            <Items
              roomy
              tab={tab}
              summary={summary}
              onPick={(t) => {
                onTab(t)
                setOpen(false)
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}
