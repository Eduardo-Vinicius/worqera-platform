export type ShortcutTarget = {
  tagName?: string
  isContentEditable?: boolean
} | null

/** True when keydown should not move the kanban focus. */
export function shouldIgnoreKanbanShortcut(target: ShortcutTarget): boolean {
  if (!target) return false
  const tag = String(target.tagName || "").toUpperCase()
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true
  if (target.isContentEditable) return true
  return false
}
