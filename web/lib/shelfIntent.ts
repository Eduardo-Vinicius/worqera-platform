export type ShelfMode = "all" | "stale" | "check"

export const SHELF_EVENT = "wq:shelf"

const HASH_MODE: Record<string, ShelfMode> = {
  prateleira: "all",
  "prateleira-parados": "stale",
  "prateleira-conferir": "check",
}

export function shelfModeFromHash(hash: string): ShelfMode | null {
  return HASH_MODE[String(hash || "").replace(/^#/, "")] || null
}

export function shelfModeFromHref(href: string): ShelfMode | null {
  const at = String(href || "").indexOf("#")
  return at >= 0 ? shelfModeFromHash(href.slice(at)) : null
}

/** Same-page links never re-fire a hash already in the URL, so the shelf listens for this event too. */
export function openShelf(mode: ShelfMode) {
  const hash = Object.keys(HASH_MODE).find((k) => HASH_MODE[k] === mode) || "prateleira"
  window.history.replaceState({}, "", `${window.location.pathname}${window.location.search}#${hash}`)
  window.dispatchEvent(new CustomEvent<ShelfMode>(SHELF_EVENT, { detail: mode }))
}
