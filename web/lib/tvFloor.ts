export const REFRESH_MS = 18_000
export const FLASH_MS = 1_200
export const OVERDUE_HOURS_IN_SECTOR = 24
/** Alta (I) on the new-order form. Smaller number = more urgent. */
export const HIGH_PRIORITY_THRESHOLD = 1

export type FloorOrder = {
  id: string
  code: string
  client?: string
  hoursInSector: number
  dueAt?: string | null
  priority?: number | null
  /** In the final sector, waiting for the customer: not a production delay. */
  waiting?: boolean
  /** Server rule (past due and still in production). */
  late?: boolean
}

export type FloorSector = {
  id: string
  name: string
  color: string
  count: number
  orders: FloorOrder[]
  /** Final sector (ready, waiting for pickup): not counted as production. */
  terminal?: boolean
}

type HistoryEntry = {
  enteredAt?: string | Date | null
  leftAt?: string | Date | null
}

type OrderLike = {
  id?: string
  _id?: string
  code?: string
  codigo?: string
  client?: string | { name?: string; nome?: string } | null
  clientName?: string
  cliente?: string
  hoursInSector?: number
  tempoNoSetor?: number
  dueAt?: string | Date | null
  dataPrevistaEntrega?: string | Date | null
  expectedDate?: string | Date | null
  priority?: number | string | null
  prioridade?: number | string | null
  sectorHistory?: HistoryEntry[]
  itemInTerminal?: boolean
  status?: string | null
  waiting?: boolean
  late?: boolean
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
}

type SectorLike = {
  id?: string
  _id?: string
  sectorId?: string
  name?: string
  nome?: string
  color?: string
  cor?: string
  count?: number
  quantidade?: number
  order?: number
  isTerminal?: boolean
  orders?: OrderLike[]
  pedidos?: OrderLike[]
}

export function hoursInSector(order: OrderLike, now: number = Date.now()): number {
  if (typeof order.hoursInSector === "number" && Number.isFinite(order.hoursInSector)) {
    return Math.max(0, order.hoursInSector)
  }
  if (typeof order.tempoNoSetor === "number" && Number.isFinite(order.tempoNoSetor)) {
    return Math.max(0, order.tempoNoSetor)
  }
  const history = Array.isArray(order.sectorHistory) ? order.sectorHistory : []
  const open = [...history].reverse().find((entry) => !entry?.leftAt)
  const entered = open?.enteredAt || order.updatedAt || order.createdAt
  if (!entered) return 0
  const ts = new Date(entered).getTime()
  if (Number.isNaN(ts)) return 0
  return Math.max(0, (now - ts) / 3_600_000)
}

export function dueTimestamp(order: OrderLike): number | null {
  const raw = order.dueAt || order.dataPrevistaEntrega || order.expectedDate
  if (!raw) return null
  const ts = new Date(raw).getTime()
  return Number.isNaN(ts) ? null : ts
}

/** Late = past due and still in production (same rule as the API). Sitting long in a sector is "parado", not late. */
export function isOverdue(order: OrderLike, now: number = Date.now()): boolean {
  if (order.waiting || order.itemInTerminal || order.status === "ready") return false
  if (typeof order.late === "boolean") return order.late
  const due = dueTimestamp(order)
  return due != null && due < now
}

/** In the same sector for too long (shop setting, hours). Shown on the card, never counted as late. */
export function isStalled(order: OrderLike, now: number = Date.now(), hours: number = OVERDUE_HOURS_IN_SECTOR): boolean {
  if (order.waiting || order.itemInTerminal || order.status === "ready") return false
  return hoursInSector(order, now) >= Math.max(1, hours)
}

export function isHighPriority(priority?: number | string | null): boolean {
  if (priority == null || priority === "") return false
  const n = Number(priority)
  if (!Number.isFinite(n)) return false
  return n <= HIGH_PRIORITY_THRESHOLD
}

export function isHotOrder(order: OrderLike, now: number = Date.now()): boolean {
  const overdue = isOverdue(order, now)
  const raw = order.priority ?? order.prioridade
  if (raw == null || raw === "") return overdue
  return overdue || isHighPriority(raw)
}

export function isHotQuery(searchParams: { get: (key: string) => string | null }): boolean {
  return searchParams.get("hot") === "1"
}

function asId(value: unknown, fallback = ""): string {
  if (value == null) return fallback
  return String(value)
}

function asOrder(raw: OrderLike, now: number, terminal = false): FloorOrder {
  const id = asId(raw.id || raw._id || raw.code || raw.codigo)
  return {
    id,
    code: String(raw.code || raw.codigo || id || "—"),
    client:
      raw.clientName ||
      raw.cliente ||
      (typeof raw.client === "string" ? raw.client : raw.client?.name || raw.client?.nome) ||
      "",
    hoursInSector: hoursInSector(raw, now),
    dueAt: raw.dueAt ? String(raw.dueAt) : raw.dataPrevistaEntrega ? String(raw.dataPrevistaEntrega) : raw.expectedDate ? String(raw.expectedDate) : null,
    priority: raw.priority != null && raw.priority !== "" ? Number(raw.priority) : raw.prioridade != null && raw.prioridade !== "" ? Number(raw.prioridade) : null,
    waiting: terminal || Boolean(raw.itemInTerminal) || raw.status === "ready",
    ...(typeof raw.late === "boolean" ? { late: raw.late } : {}),
  }
}

function asSector(id: string, raw: SectorLike, now: number): FloorSector {
  const orders = (raw.orders || raw.pedidos || []).map((order) => asOrder(order, now, Boolean(raw.isTerminal)))
  const count = typeof raw.count === "number" ? raw.count : typeof raw.quantidade === "number" ? raw.quantidade : orders.length
  return {
    id,
    name: String(raw.name || raw.nome || "Setor"),
    color: String(raw.color || raw.cor || "#7C6CF0"),
    count,
    orders,
    terminal: Boolean(raw.isTerminal),
  }
}

function looksLikeSector(value: unknown): value is SectorLike {
  if (!value || typeof value !== "object") return false
  const row = value as SectorLike
  return Boolean(row.name || row.nome || row.orders || row.pedidos || row.count != null || row.quantidade != null)
}

export function normalizeStats(raw: unknown, now: number = Date.now()): FloorSector[] {
  if (!raw) return []

  if (Array.isArray(raw)) {
    return raw.filter(looksLikeSector).map((row, index) => asSector(asId(row.id || row._id || row.sectorId, `s${index}`), row, now))
  }

  if (typeof raw !== "object") return []
  const bag = raw as Record<string, unknown>
  const nested = bag.data || bag.sectors || bag.stats
  if (Array.isArray(nested)) return normalizeStats(nested, now)

  const entries = Object.entries(bag).filter(([, value]) => looksLikeSector(value))
  const sectors = entries.map(([key, value]) => {
    const row = value as SectorLike
    return asSector(asId(row.id || row._id || row.sectorId, key), row, now)
  })
  return sectors.sort((a, b) => b.count - a.count)
}

export function filterHotSectors(sectors: FloorSector[], hot: boolean, now: number = Date.now()): FloorSector[] {
  if (!hot) return sectors
  return sectors
    .map((sector) => {
      const orders = sector.orders.filter((order) => isHotOrder(order, now))
      return { ...sector, orders, count: orders.length }
    })
    .filter((sector) => sector.count > 0)
}

export function detectIncreasedSectors(
  prev: Record<string, number>,
  next: Record<string, number>
): string[] {
  return Object.keys(next).filter((id) => (next[id] || 0) > (prev[id] || 0))
}

export function formatHoursInSector(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return "—"
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}min`
  if (hours < 10) return `${hours.toFixed(1).replace(/\.0$/, "")}h`
  return `${Math.round(hours)}h`
}

export function totalsBySector(sectors: FloorSector[]): Record<string, number> {
  return Object.fromEntries(sectors.map((sector) => [sector.id, sector.count]))
}
