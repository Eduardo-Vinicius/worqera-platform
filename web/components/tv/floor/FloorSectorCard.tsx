import { formatHoursInSector, isHighPriority, isOverdue, dueTimestamp, type FloorOrder, type FloorSector } from "@/lib/tvFloor"

const CARD = "#151520"
const ROW = "#1D1D2A"

function endOfToday(now: number) {
  const d = new Date(now)
  d.setHours(23, 59, 59, 999)
  return d.getTime()
}

export type FloorFlag = "late" | "today" | "urgent" | null

/** What the floor needs to see first on each order. */
export function orderFlag(order: FloorOrder, now: number): { flag: FloorFlag; text: string } {
  const due = dueTimestamp(order)
  if (due != null && due < now) {
    const hours = (now - due) / 3_600_000
    return { flag: "late", text: hours >= 24 ? `Atrasado ${Math.floor(hours / 24)}d` : `Atrasado ${Math.max(1, Math.round(hours))}h` }
  }
  if (isOverdue(order, now)) return { flag: "late", text: `Parado ${formatHoursInSector(order.hoursInSector)}` }
  if (due != null && due <= endOfToday(now)) return { flag: "today", text: "Vence hoje" }
  if (isHighPriority(order.priority)) return { flag: "urgent", text: "Urgente" }
  return { flag: null, text: formatHoursInSector(order.hoursInSector) }
}

const FLAG_RANK: Record<string, number> = { late: 0, urgent: 1, today: 2, none: 3 }

/** Late first, then urgent, due today, and the ones sitting the longest. */
export function sortForFloor(orders: FloorOrder[], now: number) {
  return [...orders].sort((a, b) => {
    const fa = FLAG_RANK[orderFlag(a, now).flag || "none"]
    const fb = FLAG_RANK[orderFlag(b, now).flag || "none"]
    if (fa !== fb) return fa - fb
    const da = dueTimestamp(a) ?? Number.MAX_SAFE_INTEGER
    const db = dueTimestamp(b) ?? Number.MAX_SAFE_INTEGER
    if (da !== db) return da - db
    return b.hoursInSector - a.hoursInSector
  })
}

const FLAG_STYLE: Record<Exclude<FloorFlag, null>, { bg: string; fg: string }> = {
  late: { bg: "#E11D48", fg: "#FFFFFF" },
  today: { bg: "#F59E0B", fg: "#1A1300" },
  urgent: { bg: "#7C3AED", fg: "#FFFFFF" },
}

/** One sector: colored band, big queue count, the orders that need hands now. */
export function FloorSectorCard({
  sector,
  now,
  limit,
  flashing,
  countColor,
}: {
  sector: FloorSector
  now: number
  limit: number
  flashing: boolean
  countColor: string
}) {
  const orders = sortForFloor(sector.orders, now)
  const shown = orders.slice(0, limit)
  const rest = Math.max(0, sector.count - shown.length)
  const late = orders.filter((o) => orderFlag(o, now).flag === "late").length

  return (
    <article
      className="flex min-h-0 flex-col overflow-hidden rounded-[1.6vmin] border-[0.3vmin] transition-[border-color,box-shadow] duration-300"
      style={{
        background: CARD,
        borderColor: flashing ? "#2DD4BF" : "#262637",
        boxShadow: flashing ? "0 0 0 0.5vmin rgba(45,212,191,0.35)" : "none",
      }}
    >
      <div className="h-[1vmin] shrink-0" style={{ background: sector.color }} />
      <div className="flex shrink-0 items-start justify-between gap-[1vmin] px-[2vmin] pb-[1.2vmin] pt-[1.4vmin]">
        <div className="min-w-0">
          <h2 className="truncate font-bold leading-tight" style={{ fontSize: "var(--tv-label)" }}>
            {sector.name}
          </h2>
          <p className="mt-[0.4vmin] font-semibold" style={{ fontSize: "var(--tv-tiny)", color: late ? "#FB7185" : "#8A8AA0" }}>
            {late ? `${late} atrasado${late === 1 ? "" : "s"}` : sector.count ? "Em dia" : "Fila vazia"}
          </p>
        </div>
        <p className="tv-code shrink-0 font-bold leading-none" style={{ fontSize: "var(--tv-count)", color: countColor }}>
          {sector.count}
        </p>
      </div>

      <ul className="flex min-h-0 flex-1 flex-col gap-[0.8vmin] overflow-hidden px-[1.4vmin] pb-[1.4vmin]">
        {shown.map((order) => {
          const { flag, text } = orderFlag(order, now)
          const style = flag ? FLAG_STYLE[flag] : null
          return (
            <li
              key={order.id}
              className="flex min-h-0 items-center justify-between gap-[1vmin] rounded-[1vmin] px-[1.4vmin] py-[0.9vmin]"
              style={{ background: ROW, boxShadow: flag === "late" ? "inset 0.5vmin 0 0 #E11D48" : "none" }}
            >
              <span className="tv-code truncate font-bold leading-none" style={{ fontSize: "var(--tv-order)" }}>
                {order.code}
              </span>
              {style ? (
                <span
                  className={`shrink-0 rounded-full px-[1.1vmin] py-[0.4vmin] font-bold ${flag === "late" ? "tv-blink" : ""}`}
                  style={{ fontSize: "var(--tv-tiny)", background: style.bg, color: style.fg }}
                >
                  {text}
                </span>
              ) : (
                <span className="shrink-0 font-semibold tabular-nums text-[#8A8AA0]" style={{ fontSize: "var(--tv-tiny)" }}>
                  {text}
                </span>
              )}
            </li>
          )
        })}
        {!shown.length ? (
          <li className="flex flex-1 items-center justify-center font-semibold text-[#5E5E74]" style={{ fontSize: "var(--tv-small)" }}>
            Nada na fila
          </li>
        ) : null}
        {rest > 0 ? (
          <li className="mt-auto text-center font-semibold text-[#A9A9BC]" style={{ fontSize: "var(--tv-tiny)" }}>
            +{rest} na fila
          </li>
        ) : null}
      </ul>
    </article>
  )
}
