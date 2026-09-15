/** Order-level warranty helpers (create + list filters). */

export type WarrantyLike = {
  ativa?: boolean
  active?: boolean
  preco?: number
  price?: number
  duracao?: string
  duration?: string
  data?: string
  endsAt?: string
} | null | undefined

export type WarrantyNormalized = {
  ativa: boolean
  preco: number
  duracao: string
  data: string
}

export function warrantyEndDate(from: Date = new Date(), months = 3): string {
  const d = new Date(from.getTime())
  d.setUTCMonth(d.getUTCMonth() + months)
  return d.toISOString().slice(0, 10)
}

export function normalizeWarranty(
  raw: WarrantyLike,
  from: Date = new Date()
): WarrantyNormalized {
  if (!raw || typeof raw !== "object") {
    return { ativa: false, preco: 0, duracao: "", data: "" }
  }
  const ativa = Boolean(raw.ativa ?? raw.active)
  const preco = Number(raw.preco ?? raw.price) || 0
  const duracao = String(raw.duracao ?? raw.duration ?? (ativa ? "3 meses" : ""))
  let data = String(raw.data || raw.endsAt || "")
  if (ativa && !data) data = warrantyEndDate(from, 3)
  return { ativa, preco, duracao, data: ativa ? data : "" }
}

export function isWarrantyActive(raw: WarrantyLike): boolean {
  if (!raw || typeof raw !== "object") return false
  return Boolean(raw.ativa ?? raw.active)
}

export function isWarrantyExpiringSoon(
  raw: WarrantyLike,
  withinDays = 30,
  now: Date = new Date()
): boolean {
  if (!isWarrantyActive(raw)) return false
  const end = String(raw?.data || raw?.endsAt || "")
  if (!end) return false
  const endMs = new Date(`${end}T23:59:59.999Z`).getTime()
  if (Number.isNaN(endMs)) return false
  const nowMs = now.getTime()
  if (endMs < nowMs) return false
  const limit = nowMs + withinDays * 24 * 60 * 60 * 1000
  return endMs <= limit
}
