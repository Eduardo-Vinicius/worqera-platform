"use client"

import { useMemo, useState } from "react"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import type { Quote, QuoteStage } from "@/lib/apiV1"
import { cn } from "@/lib/utils"
import { STAGES, brl, followUpLabel, followUpTone, priorityDot, stageTone } from "./quoteUi"

const STAGE_IDS = new Set<string>(STAGES.map((s) => s.id))

/** Prefer the column under the pointer; fall back to overlap when the pointer is between columns. */
const collision: CollisionDetection = (args) => {
  const within = pointerWithin(args)
  return within.length ? within : rectIntersection(args)
}

function CardBody({ quote: q, lifted = false }: { quote: Quote; lifted?: boolean }) {
  const open = q.stage !== "won" && q.stage !== "lost"
  return (
    <div
      className={cn(
        "w-full rounded-xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-3 text-left shadow-[0_1px_0_rgba(15,23,42,0.04)]",
        lifted && "rotate-[1.5deg] scale-[1.03] border-[var(--wq-brand)]/50 shadow-2xl"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="flex min-w-0 items-center gap-2 font-semibold">
          {open ? <span className={cn("h-2 w-2 shrink-0 rounded-full", priorityDot(q.priority.level))} /> : null}
          <span className="truncate">{q.name}</span>
        </p>
        <p className="shrink-0 text-sm font-semibold tabular-nums">{q.value ? brl(q.value) : ""}</p>
      </div>
      <p className="mt-1 line-clamp-2 text-xs text-[var(--wq-text-muted)]">{q.what || "Sem descrição"}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {q.reasonLabel ? (
          <span className="rounded-md bg-[var(--wq-paper)] px-1.5 py-0.5 text-[11px] text-[var(--wq-text-muted)]">{q.reasonLabel}</span>
        ) : null}
        {open ? (
          <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", followUpTone(q.followUp.state))}>
            {followUpLabel(q)}
          </span>
        ) : null}
        {q.orderCode ? <span className="font-mono text-[11px] text-[var(--wq-text-muted)]">#{q.orderCode}</span> : null}
      </div>
    </div>
  )
}

function DraggableCard({ quote, onOpen }: { quote: Quote; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: quote.id })
  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onOpen}
      {...attributes}
      {...listeners}
      className={cn(
        "block w-full cursor-grab rounded-xl text-left outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-[var(--wq-brand)] active:cursor-grabbing",
        isDragging && "opacity-30"
      )}
    >
      <CardBody quote={quote} />
    </button>
  )
}

function Column({
  stage,
  label,
  hint,
  quotes,
  dragging,
  onOpen,
}: {
  stage: QuoteStage
  label: string
  hint: string
  quotes: Quote[]
  dragging: boolean
  onOpen: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  const total = quotes.reduce((sum, q) => sum + (q.value || 0), 0)
  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex w-[82vw] max-w-[300px] shrink-0 flex-col rounded-2xl border bg-[var(--wq-paper)] transition-colors sm:w-[280px]",
        isOver
          ? "border-[var(--wq-brand)] bg-[var(--wq-brand-soft)]/40 ring-2 ring-[var(--wq-brand)]/25"
          : dragging
            ? "border-dashed border-[var(--wq-border)]"
            : "border-[var(--wq-border)]"
      )}
    >
      <header className="flex items-start justify-between gap-2 border-b border-[var(--wq-border)] px-3.5 py-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", stageTone(stage))}>{label}</span>
            <span className="tabular-nums text-[var(--wq-text-muted)]">{quotes.length}</span>
          </p>
          <p className="mt-1 text-[11px] text-[var(--wq-text-muted)]">{hint}</p>
        </div>
        <p className="text-xs font-semibold tabular-nums text-[var(--wq-text-muted)]">{total ? brl(total) : ""}</p>
      </header>
      <div className="flex min-h-40 flex-1 flex-col gap-2 p-2.5">
        {isOver ? (
          <div className="rounded-xl border-2 border-dashed border-[var(--wq-brand)]/50 py-4 text-center text-xs font-semibold text-[var(--wq-brand)]">
            Soltar em {label}
          </div>
        ) : null}
        {quotes.length === 0 && !isOver ? (
          <p className="rounded-xl border border-dashed border-[var(--wq-border)] px-3 py-6 text-center text-xs text-[var(--wq-text-muted)]">
            Arraste para cá
          </p>
        ) : (
          quotes.map((q) => <DraggableCard key={q.id} quote={q} onOpen={() => onOpen(q.id)} />)
        )}
      </div>
    </section>
  )
}

/** Funnel board. The dragged card floats above every column, so it never hides behind the scroll area. */
export function QuoteBoard({
  quotes,
  onOpen,
  onMove,
}: {
  quotes: Quote[]
  onOpen: (id: string) => void
  onMove: (quote: Quote, stage: QuoteStage) => void
}) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 8 } }),
    useSensor(KeyboardSensor)
  )
  const [activeId, setActiveId] = useState<string | null>(null)

  const byStage = useMemo(() => {
    const map: Record<QuoteStage, Quote[]> = { new: [], contact: [], followup: [], won: [], lost: [] }
    for (const q of quotes) map[q.stage]?.push(q)
    map.new.sort((a, b) => b.priority.score - a.priority.score)
    map.contact.sort((a, b) => b.priority.score - a.priority.score)
    map.followup.sort((a, b) => b.priority.score - a.priority.score)
    return map
  }, [quotes])

  const active = activeId ? quotes.find((q) => q.id === activeId) || null : null

  const onDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id))
  const onDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const overId = event.over?.id ? String(event.over.id) : ""
    const stage = STAGE_IDS.has(overId) ? (overId as QuoteStage) : quotes.find((q) => q.id === overId)?.stage
    const quote = quotes.find((q) => q.id === event.active.id)
    if (quote && stage && stage !== quote.stage) onMove(quote, stage)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
      autoScroll={{ threshold: { x: 0.15, y: 0.2 } }}
    >
      <div className="-mx-2.5 flex gap-3 overflow-x-auto px-2.5 pb-4 sm:mx-0 sm:px-0">
        {STAGES.map((s) => (
          <Column
            key={s.id}
            stage={s.id}
            label={s.label}
            hint={s.hint}
            quotes={byStage[s.id]}
            dragging={Boolean(activeId)}
            onOpen={onOpen}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 160, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
        {active ? (
          <div className="w-[260px]">
            <CardBody quote={active} lifted />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
