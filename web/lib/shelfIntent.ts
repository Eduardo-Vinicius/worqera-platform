export type ShelfMode = "all" | "stale" | "check"

const HASH_MODE: Record<string, ShelfMode> = {
  prateleira: "all",
  "prateleira-parados": "stale",
  "prateleira-conferir": "check",
}

export function shelfModeFromHash(hash: string): ShelfMode | null {
  return HASH_MODE[String(hash || "").replace(/^#/, "")] || null
}

/** The kanban recorte that works the same list, with Avisar / Conferir / Entregue on each card. */
export function shelfKanbanHref(mode: ShelfMode): string {
  return mode === "check" ? "/kanban?focus=ready-check" : mode === "stale" ? "/kanban?focus=ready-stale" : "/kanban?focus=ready"
}
