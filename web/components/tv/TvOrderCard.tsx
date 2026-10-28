import type { Tile } from "./clientTvData"

const STEPS = ["Recebido", "Produção", "Pronto"] as const

function stepOf(kind: Tile["kind"]) {
  if (kind === "ready") return 2
  if (kind === "progress") return 1
  return 0
}

/**
 * An order in progress: big number, where it is now, and a 3-step track the customer
 * reads from across the shop. `compact` (4 columns) drops the step names so nothing truncates.
 */
export function TvOrderCard({ tile, accent, compact }: { tile: Tile; accent: string; compact: boolean }) {
  const step = stepOf(tile.kind)
  return (
    <article className="flex min-h-0 flex-col justify-between overflow-hidden rounded-[1.6vmin] border-[0.25vmin] border-[#262637] bg-[#151520] px-[2.2vmin] py-[2vmin]">
      <p className="tv-code font-semibold leading-none text-white" style={{ fontSize: "var(--tv-code)" }}>
        {tile.code}
      </p>

      <div className="min-w-0">
        <p className="truncate font-semibold text-[#E7E7EF]" style={{ fontSize: compact ? "var(--tv-small)" : "var(--tv-label)" }}>
          {tile.label}
        </p>
        {tile.pairs > 1 ? (
          <p className="font-medium text-[#A9A9BC]" style={{ fontSize: "var(--tv-tiny)" }}>
            {tile.pairs} pares
          </p>
        ) : null}
        <div className="mt-[1.2vmin] grid grid-cols-3 gap-[0.8vmin]">
          {STEPS.map((name, index) => (
            <div key={name} className="min-w-0">
              <div className="h-[0.9vmin] rounded-full" style={{ background: index <= step ? accent : "#2A2A3A" }} />
              {!compact ? (
                <p
                  className="mt-[0.6vmin] truncate font-medium"
                  style={{ fontSize: "var(--tv-tiny)", color: index === step ? "#FFFFFF" : "#8A8AA0" }}
                >
                  {name}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </article>
  )
}
