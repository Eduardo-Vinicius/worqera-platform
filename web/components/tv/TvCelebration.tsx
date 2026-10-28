const BITS = Array.from({ length: 36 }, (_, i) => i)

/** Full-screen moment when an order turns ready: the "TCHAM" customers in the shop see. */
export function TvCelebration({
  code,
  shopName,
  accent,
  onAccent,
  reduceMotion,
}: {
  code: string
  shopName: string
  accent: string
  onAccent: string
  reduceMotion: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden text-center"
      style={{ background: accent, color: onAccent }}
      role="status"
      aria-live="assertive"
    >
      {!reduceMotion ? (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {BITS.map((i) => (
            <span
              key={i}
              className="tv-confetti absolute top-[-4vmin] block rounded-[0.3vmin]"
              style={{
                left: `${(i * 97) % 100}%`,
                width: `${1 + (i % 3) * 0.6}vmin`,
                height: `${1.8 + (i % 4) * 0.5}vmin`,
                background: ["#FFFFFF", "#FDE68A", "#A7F3D0", "#FBCFE8"][i % 4],
                animationDelay: `${(i % 12) * 0.12}s`,
                animationDuration: `${2.6 + (i % 5) * 0.35}s`,
              }}
            />
          ))}
        </div>
      ) : null}
      <p className="relative font-bold uppercase tracking-[0.2em]" style={{ fontSize: "var(--tv-title)" }}>
        Pedido pronto!
      </p>
      <p className={`tv-code relative mt-[2vmin] font-bold leading-none ${reduceMotion ? "" : "tv-pop"}`} style={{ fontSize: "26vmin" }}>
        {code}
      </p>
      <p className="relative mt-[3vmin] font-semibold" style={{ fontSize: "var(--tv-title)" }}>
        Pode retirar no balcão{shopName ? ` da ${shopName}` : ""}.
      </p>
    </div>
  )
}
