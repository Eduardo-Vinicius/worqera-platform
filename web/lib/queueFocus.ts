export const QUEUE_FOCUSES = ["late", "ready", "due-today", "due-tomorrow"] as const
export type QueueFocus = (typeof QUEUE_FOCUSES)[number]

export const FOCUS_LABEL: Record<QueueFocus, string> = {
  late: "Mostrando só atrasados",
  ready: "Mostrando só prontos para retirar",
  "due-today": "Mostrando só prazo de hoje",
  "due-tomorrow": "Mostrando só prazo de amanhã",
}

export const FOCUS_CHIPS: Array<{ focus: QueueFocus; label: string }> = [
  { focus: "late", label: "Atrasados" },
  { focus: "due-today", label: "Hoje" },
  { focus: "due-tomorrow", label: "Amanhã" },
  { focus: "ready", label: "Prontos" },
]

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
