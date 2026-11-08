import { ImageResponse } from "next/og"

export const OG_SIZE = { width: 1200, height: 630 }

const COLS = ["Recebido", "Produção", "Pronto", "Entregue"]

/** The 1200×630 share card: brand, a headline and a small kanban. Satori only knows flexbox. */
export function ogImage({ kicker, title }: { kicker: string; title: string }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          color: "white",
          background: "linear-gradient(135deg, #2e0a66 0%, #7d26de 55%, #c026d3 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "white",
              color: "#7d26de",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
              fontWeight: 800,
            }}
          >
            W
          </div>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700 }}>Worqera</div>
          <div
            style={{
              display: "flex",
              marginLeft: "auto",
              padding: "10px 20px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.16)",
              fontSize: 22,
            }}
          >
            7 dias grátis, sem cartão
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 26, color: "rgba(255,255,255,0.8)" }}>{kicker}</div>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2, maxWidth: 1000 }}>{title}</div>
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          {COLS.map((name, index) => (
            <div
              key={name}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                padding: 16,
                borderRadius: 20,
                background: "rgba(255,255,255,0.12)",
              }}
            >
              <div style={{ display: "flex", fontSize: 18, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "rgba(255,255,255,0.75)" }}>
                {name}
              </div>
              <div
                style={{
                  display: "flex",
                  height: 44,
                  borderRadius: 12,
                  background: index === 2 ? "white" : "rgba(255,255,255,0.22)",
                  color: "#7d26de",
                  alignItems: "center",
                  paddingLeft: 14,
                  fontSize: 20,
                  fontWeight: 700,
                }}
              >
                {index === 2 ? "#0048 · Pronto" : ""}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    OG_SIZE
  )
}
