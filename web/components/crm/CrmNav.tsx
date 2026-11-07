"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { CrmSummary } from "@/lib/apiV1"
import { cn } from "@/lib/utils"
import { CRM_GROUPS, CRM_TABS, TAB_HINT, tabCount, type CrmTab } from "./crmUi"

function Badge({ tab, summary, active }: { tab: CrmTab; summary: CrmSummary | null; active: boolean }) {
  const n = tabCount(tab, summary as any)
  if (n == null) return null
  const todo = CRM_GROUPS[1].tabs.includes(tab) && n > 0
  return (
    <span
      className={cn(
        "ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
        active ? "bg-white/20 text-white" : todo ? "bg-[var(--wq-action)] text-white" : "bg-[var(--wq-paper)] text-[var(--wq-text-muted)]"
      )}
    >
      {n}
    </span>
  )
}

function Items({ tab, summary, onPick }: { tab: CrmTab; summary: CrmSummary | null; onPick: (t: CrmTab) => void }) {
  return (
    <div className="space-y-4">
      {CRM_GROUPS.map((g) => (
        <div key={g.title}>
          <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--wq-text-muted)]">{g.title}</p>
          <ul className="space-y-0.5">
            {g.tabs.map((id) => {
              const t = CRM_TABS.find((x) => x.id === id)!
              const active = tab === id
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => onPick(id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition",
                      active ? "bg-[var(--wq-brand)] text-white shadow-sm" : "hover:bg-[var(--wq-paper)]"
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{t.label}</span>
                      <span className={cn("block truncate text-[11px]", active ? "text-white/80" : "text-[var(--wq-text-muted)]")}>{TAB_HINT[id]}</span>
                    </span>
                    <Badge tab={id} summary={summary} active={active} />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

/** CRM sections grouped by intent: sidebar on desktop, one button + list on phones. */
export function CrmNav({ tab, summary, onTab }: { tab: CrmTab; summary: CrmSummary | null; onTab: (t: CrmTab) => void }) {
  const [open, setOpen] = useState(false)
  const current = CRM_TABS.find((t) => t.id === tab)
  const group = CRM_GROUPS.find((g) => g.tabs.includes(tab))
  const todo = CRM_GROUPS[1].tabs.reduce((n, id) => n + (tabCount(id, summary as any) || 0), 0)
  return (
    <>
      <aside className="hidden lg:block">
        <div className="sticky top-4 rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-2">
          <Items tab={tab} summary={summary} onPick={onTab} />
        </div>
      </aside>

      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 rounded-xl border border-[var(--wq-border)] bg-[var(--wq-surface)] px-3 py-2.5 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">{group?.title || "CRM"}</span>
            <span className="block truncate font-semibold">{current?.label}</span>
          </span>
          {todo > 0 && !CRM_GROUPS[1].tabs.includes(tab) ? (
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
