export const QUEUE_FOCUSES = ["late", "ready", "ready-stale", "ready-check", "due-today", "due-tomorrow"] as const
export type QueueFocus = (typeof QUEUE_FOCUSES)[number]

/** Same numbers as `counts` from GET /kanban. */
export type QueueCounts = {
  total: number
  late: number
  ready: number
  readyStale: number
  readyCheck: number
  readyOldestDays: number
  dueToday: number
  dueTomorrow: number
}

export const FOCUS_LABEL: Record<QueueFocus, string> = {
  late: "Só atrasados",
  ready: "Prateleira · todos os prontos",
  "ready-stale": "Prateleira · parados há 3+ dias",
  "ready-check": "Prateleira · conferir se já saíram",
  "due-today": "Só prazo de hoje",
  "due-tomorrow": "Só prazo de amanhã",
}

export const FOCUS_HINT: Record<QueueFocus, string> = {
  late: "o atraso mais antigo no topo de cada setor",
  ready: "quem espera há mais tempo primeiro",
  "ready-stale": "lembre o cliente; o mais antigo primeiro",
  "ready-check": "prontos há 7+ dias ou marcados: veja se ainda estão aqui",
  "due-today": "por prioridade e prazo",
  "due-tomorrow": "por prioridade e prazo",
}

export const FOCUS_CHIPS: Array<{ focus: QueueFocus; label: string; count: keyof QueueCounts }> = [
  { focus: "late", label: "Atrasados", count: "late" },
  { focus: "due-today", label: "Hoje", count: "dueToday" },
  { focus: "due-tomorrow", label: "Amanhã", count: "dueTomorrow" },
  { focus: "ready", label: "Prontos", count: "ready" },
]

export const READY_TABS: Array<{ focus: QueueFocus; label: string; count: keyof QueueCounts }> = [
  { focus: "ready", label: "Todos", count: "ready" },
  { focus: "ready-stale", label: "Parados 3+ dias", count: "readyStale" },
  { focus: "ready-check", label: "Conferir 7+ dias", count: "readyCheck" },
]

export function isReadyFocus(focus: QueueFocus | null): boolean {
  return focus === "ready" || focus === "ready-stale" || focus === "ready-check"
}

export function parseFocus(value: string | null | undefined): QueueFocus | null {
  const v = String(value || "").trim().toLowerCase()
  return (QUEUE_FOCUSES as readonly string[]).includes(v) ? (v as QueueFocus) : null
}

export function readQueueFocus(search: string | URLSearchParams): QueueFocus | null {
  const params =
    typeof search === "string"
      ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
      : search
  return parseFocus(params.get("focus")) || (params.get("late") === "1" ? "late" : null)
}

export function kanbanFocusHref(focus: QueueFocus | null): string {
  return focus ? `/kanban?focus=${focus}` : "/kanban"
}

export function replaceFocusSearch(search: string, focus: QueueFocus | null): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
  params.delete("late")
  if (focus) params.set("focus", focus)
  else params.delete("focus")
  const q = params.toString()
  return q ? `?${q}` : ""
}
