import type { Tile } from "./clientTvData"

/** Number size that always fits the panel: fewer ready orders, bigger numbers. */
function readySize(count: number) {
  if (count <= 1) return "17vmin"
  if (count === 2) return "13vmin"
  if (count === 3) return "9.5vmin"
  if (count === 4) return "7.5vmin"
  return "6.8vmin"
}

/**
 * "Pronto pra retirar": the part of the screen the customer looks for first.
 * Solid brand color, the biggest numbers on the screen.
 */
export function TvReadyPanel({
  tiles,
  page,
  pages,
  accent,
  onAccent,
}: {
  tiles: Tile[]
  page: number
  pages: number
  accent: string
  onAccent: string
}) {
  const twoCols = tiles.length > 4
  const rows = twoCols ? Math.ceil(tiles.length / 2) : Math.max(1, tiles.length)
  return (
    <section
      className="flex min-h-0 flex-col overflow-hidden rounded-[2vmin] px-[3vmin] py-[2.6vmin]"
      style={{ background: accent, color: onAccent }}
    >
      <div className="flex shrink-0 items-center justify-between gap-[1vmin]">
        <p className="font-bold uppercase tracking-[0.14em]" style={{ fontSize: "var(--tv-label)" }}>
          Pronto pra retirar
        </p>
        {pages > 1 ? (
          <p className="font-semibold opacity-80" style={{ fontSize: "var(--tv-small)" }}>
            {page + 1}/{pages}
          </p>
        ) : null}
      </div>

      {tiles.length ? (
        <>
          <div
            key={`${page}-${tiles.map((t) => t.id).join(",")}`}
            className="tv-fade mt-[2vmin] grid min-h-0 flex-1 gap-[1.4vmin]"
            style={{
              gridTemplateColumns: twoCols ? "repeat(2, minmax(0, 1fr))" : "minmax(0, 1fr)",
              gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
            }}
          >
            {tiles.map((tile) => (
              <div
                key={tile.id}
                className="tv-code flex min-h-0 items-center justify-center rounded-[1.4vmin] font-bold leading-none"
                style={{ background: "rgba(255,255,255,0.18)", fontSize: readySize(tiles.length) }}
              >
                {tile.code}
              </div>
            ))}
          </div>
          <p className="mt-[1.8vmin] shrink-0 font-semibold" style={{ fontSize: "var(--tv-label)" }}>
            Viu seu número? Retire no balcão.
          </p>
        </>
      ) : (
        <div className="flex flex-1 flex-col justify-center">
          <p className="font-bold leading-tight" style={{ fontSize: "var(--tv-title)" }}>
            Seu número aparece aqui quando ficar pronto.
          </p>
          <p className="mt-[1.4vmin] font-medium opacity-85" style={{ fontSize: "var(--tv-label)" }}>
            A gente avisa você também.
          </p>
        </div>
      )}
    </section>
  )
}
