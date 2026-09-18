/** Early Bird: 10 seats. Update TAKEN when a shop locks Early. */
export const EARLY_TOTAL = 10

/** How many Early seats already assigned (your first clients). Override via env. */
export function getEarlySeatsTaken(): number {
  const raw = process.env.NEXT_PUBLIC_EARLY_SEATS_TAKEN
  const n = raw != null && raw !== "" ? Number(raw) : 3
  if (!Number.isFinite(n) || n < 0) return 3
  return Math.min(Math.floor(n), EARLY_TOTAL)
}

export function getEarlySeatsLeft(): number {
  return Math.max(0, EARLY_TOTAL - getEarlySeatsTaken())
}
