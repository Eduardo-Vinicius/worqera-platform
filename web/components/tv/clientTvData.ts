import { apiFetch, getOrdersService } from "@/lib/apiService"

/** One order as the customer sees it on the shop TV: number and stage only, never names or values. */
export type Tile = {
  id: string
  code: string
  label: string
  kind: "open" | "progress" | "ready"
  pairs: number
}

type OrderRow = {
  id?: string
  _id?: string
  code?: string
  codigo?: string
  status?: string
  items?: unknown[]
  currentSectorId?: string | { _id?: string; id?: string; name?: string }
  currentSector?: { name?: string }
  setorAtual?: string
}

function slug(value: string) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function isReadyStatus(status: string) {
  const s = slug(status)
  if (!s) return false
  if (s === "ready") return true
  if (/entregue|delivered|cancel/.test(s)) return false
  return /pronto|retir|aguardando retirada|finaliz/.test(s)
}

function isOpenStatus(status: string) {
  const s = slug(status)
  return s === "open" || /^(aberto|receb|orc|aprova|a fazer|inici|backlog|criado)/.test(s)
}

function isClientRelevant(status: string) {
  const raw = String(status || "").trim()
  if (!raw) return true
  const s = slug(raw)
  if (/entregue|delivered|cancelad/.test(s) || s === "cancelled") return false
  if (s === "open" || s === "in_progress" || s === "ready") return true
  if (isReadyStatus(raw) || isOpenStatus(raw)) return true
  return /andamento|process|lavag|pint|sapat|costur|acab|atendimento/.test(s)
}

function formatSectorLabel(name: string) {
  const trimmed = name.trim()
  if (!trimmed) return ""
  const s = slug(trimmed)
  if (/final|retir/.test(s)) return "Pronto pra retirar"
  if (/^em\s/.test(s)) return trimmed
  return `Em ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`
}

function sectorNameFromOrder(order: OrderRow, sectors: Record<string, string>) {
  if (order.currentSector?.name) return order.currentSector.name
  const nested = order.currentSectorId
  if (nested && typeof nested === "object" && nested.name) return nested.name
  const id = typeof nested === "object" ? String(nested._id || nested.id || "") : String(nested || order.setorAtual || "")
  return (id && sectors[id]) || ""
}

function humanLabel(status: string, sectorName: string) {
  if (isReadyStatus(status)) return "Pronto pra retirar"
  if (sectorName) {
    const fromSector = formatSectorLabel(sectorName)
    if (fromSector) return fromSector
  }
  const raw = String(status || "").trim()
  const match = raw.match(/^([^–\-]+)\s*[-–]/)
  if (match && !/^(open|in_progress|ready)$/i.test(match[1].trim())) return formatSectorLabel(match[1].trim())
  if (isOpenStatus(raw)) return "Recebido"
  if (raw && !/^(open|in_progress|ready)$/i.test(raw)) return raw
  return "Em andamento"
}

function tileKind(status: string): Tile["kind"] {
  if (isReadyStatus(status)) return "ready"
  if (isOpenStatus(status)) return "open"
  return "progress"
}

async function loadSectorNames() {
  try {
    const json = await apiFetch("/sectors")
    const list = json?.sectors || json?.data || []
    const map: Record<string, string> = {}
    for (const sector of Array.isArray(list) ? list : []) {
      const id = String(sector?._id || sector?.id || "")
      const name = String(sector?.name || sector?.nome || "")
      if (id && name) map[id] = name
    }
    return map
  } catch {
    return {} as Record<string, string>
  }
}

export async function loadTiles(): Promise<Tile[]> {
  const [raw, sectors] = await Promise.all([getOrdersService({ forceRefresh: true }), loadSectorNames()])
  const list = Array.isArray(raw) ? (raw as OrderRow[]) : []
  return list
    .filter((order) => isClientRelevant(order.status || ""))
    .map((order) => {
      const status = order.status || ""
      const id = String(order.id || order._id || order.code || order.codigo || "")
      return {
        id,
        code: String(order.code || order.codigo || id || "—"),
        label: humanLabel(status, sectorNameFromOrder(order, sectors)),
        kind: tileKind(status),
        pairs: Array.isArray(order.items) ? order.items.length : 1,
      } satisfies Tile
    })
    .filter((tile) => tile.id)
}

/** `/tv?demo=1`: sample screen to show the shop how the TV looks. No real orders. */
export function demoTiles(): Tile[] {
  const stages: Array<[Tile["kind"], string]> = [
    ["progress", "Em lavagem"],
    ["progress", "Em costura"],
    ["open", "Recebido"],
    ["progress", "Em pintura"],
    ["progress", "Em acabamento"],
    ["open", "Recebido"],
    ["progress", "Em lavagem"],
    ["progress", "Em higienização"],
  ]
  const busy = stages.map(([kind, label], i) => ({ id: `d${i}`, code: String(684 + i).padStart(4, "0"), label, kind, pairs: i === 1 ? 2 : 1 }))
  const ready = ["0679", "0681", "0682"].map((code) => ({ id: `r${code}`, code, label: "Pronto pra retirar", kind: "ready" as const, pairs: 1 }))
  return [...ready, ...busy]
}

export function paginate<T>(items: T[], size: number) {
  if (items.length === 0) return [] as T[][]
  const pages: T[][] = []
  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size))
  return pages
}

/** Columns × rows that fill a 16:9 screen without tiny cards. */
export function gridShape(count: number) {
  if (count <= 1) return { cols: 1, rows: 1 }
  if (count === 2) return { cols: 2, rows: 1 }
  if (count <= 3) return { cols: 3, rows: 1 }
  if (count <= 4) return { cols: 2, rows: 2 }
  if (count <= 6) return { cols: 3, rows: 2 }
  if (count <= 8) return { cols: 4, rows: 2 }
  if (count <= 9) return { cols: 3, rows: 3 }
  return { cols: 4, rows: 3 }
}
