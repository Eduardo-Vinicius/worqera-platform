"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { getShopCurrentV1 } from "@/lib/apiV1"
import { contrastRatio, paintForBackground, resolveBrandColors } from "@/lib/shopBrand"
import { demoTiles, gridShape, loadTiles, paginate, type Tile } from "@/components/tv/clientTvData"
import { TvOrderCard } from "@/components/tv/TvOrderCard"
import { TvReadyPanel } from "@/components/tv/TvReadyPanel"
import { TvCelebration } from "@/components/tv/TvCelebration"
import { TvShopQr } from "@/components/tv/TvShopQr"

const DEFAULT_REFRESH_MS = 18_000
const DEFAULT_CAROUSEL_MS = 8_000
const DEFAULT_TILES = 8
const READY_PER_PAGE = 8
const CELEBRATION_MS = 7_000
const BG = "#0A0A12"
const CARD = "#151520"

/** Code size by grid density, in vmin so it scales with the TV instead of being stretched. */
function codeSize(cols: number) {
  if (cols <= 1) return "16vmin"
  if (cols === 2) return "12vmin"
  if (cols === 3) return "9.5vmin"
  return "7.6vmin"
}

/**
 * TV Cliente: what the customer sees on the shop's TV.
 * Everything is sized in vmin with solid colors (no blur, no gradients), so text
 * stays sharp on 720p TV browsers that upscale the page to 4K panels.
 */
export default function TvClientePage() {
  const [tiles, setTiles] = useState<Tile[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [fetchedAt, setFetchedAt] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())
  const [pageIndex, setPageIndex] = useState(0)
  const [reduceMotion, setReduceMotion] = useState(false)
  const [refreshMs, setRefreshMs] = useState(DEFAULT_REFRESH_MS)
  const [carouselMs, setCarouselMs] = useState(DEFAULT_CAROUSEL_MS)
  const [tilesPerPage, setTilesPerPage] = useState(DEFAULT_TILES)
  const [title, setTitle] = useState("Acompanhe seu pedido")
  const [brandName, setBrandName] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [showLogo, setShowLogo] = useState(true)
  const [primary, setPrimary] = useState("#7D26DE")
  const [accent, setAccent] = useState("#0D9488")
  const [reviewUrl, setReviewUrl] = useState("")
  const [phone, setPhone] = useState("")
  const [celebrating, setCelebrating] = useState<string | null>(null)
  const queue = useRef<string[]>([])
  const knownReady = useRef<Set<string> | null>(null)
  /** null until mounted: the URL is read on the client only. */
  const [demo, setDemo] = useState<boolean | null>(null)
  useEffect(() => {
    setDemo(new URLSearchParams(window.location.search).get("demo") === "1")
  }, [])

  const load = useCallback(async () => {
    try {
      const next = demo ? demoTiles() : await loadTiles()
      const readyNow = new Set(next.filter((t) => t.kind === "ready").map((t) => t.id))
      // Celebrate only orders that turned ready while the TV was on, not the ones already waiting.
      if (knownReady.current) {
        for (const tile of next) {
          if (tile.kind === "ready" && !knownReady.current.has(tile.id)) queue.current.push(tile.code)
        }
      }
      knownReady.current = readyNow
      setTiles(next)
      setError("")
      setFetchedAt(Date.now())
    } catch (err) {
      console.error("Erro ao buscar pedidos para TV cliente:", err)
      setError("Reconectando…")
    } finally {
      setLoading(false)
    }
  }, [demo])

  useEffect(() => {
    if (demo === null) return
    if (demo) {
      setBrandName("Sua loja")
      setReviewUrl("https://worqera.com")
      // Shows the "pedido pronto" moment a few seconds after opening the demo.
      const t = setTimeout(() => queue.current.push("0683"), 4000)
      return () => clearTimeout(t)
    }
    ;(async () => {
      try {
        const shop = await getShopCurrentV1()
        const doc = shop?.shop || shop
        const cfg = doc?.tvSettings?.client || {}
        if (cfg.refreshMs) setRefreshMs(Math.max(5000, Number(cfg.refreshMs) || DEFAULT_REFRESH_MS))
        if (cfg.carouselMs) setCarouselMs(Math.max(3000, Number(cfg.carouselMs) || DEFAULT_CAROUSEL_MS))
        if (cfg.tilesPerPage) setTilesPerPage(Math.min(12, Math.max(2, Number(cfg.tilesPerPage) || DEFAULT_TILES)))
        if (cfg.title) setTitle(String(cfg.title))
        if (cfg.showLogo === false) setShowLogo(false)
        setBrandName(doc?.branding?.displayName || doc?.name || "")
        setLogoUrl(doc?.branding?.logoUrl || "")
        setReviewUrl(String(doc?.branding?.reviewUrl || ""))
        setPhone(String(doc?.branding?.phone || ""))
        const colors = resolveBrandColors(doc?.branding)
        setPrimary(colors.primary)
        setAccent(colors.accent)
      } catch {
        // keep defaults
      }
    })()
  }, [demo])

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const apply = () => setReduceMotion(media.matches)
    apply()
    media.addEventListener("change", apply)
    return () => media.removeEventListener("change", apply)
  }, [])

  useEffect(() => {
    if (demo === null) return
    load()
    const interval = setInterval(load, refreshMs)
    return () => clearInterval(interval)
  }, [load, refreshMs, demo])

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  // One celebration at a time, from the queue.
  useEffect(() => {
    if (celebrating) {
      const t = setTimeout(() => setCelebrating(null), CELEBRATION_MS)
      return () => clearTimeout(t)
    }
    const t = setInterval(() => {
      const next = queue.current.shift()
      if (next) setCelebrating(next)
    }, 500)
    return () => clearInterval(t)
  }, [celebrating])

  const ready = useMemo(() => tiles.filter((t) => t.kind === "ready"), [tiles])
  const inProgress = useMemo(
    () => tiles.filter((t) => t.kind !== "ready").sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "progress" ? -1 : 1)),
    [tiles]
  )
  const progressPages = useMemo(() => paginate(inProgress, tilesPerPage), [inProgress, tilesPerPage])
  const readyPages = useMemo(() => paginate(ready, READY_PER_PAGE), [ready])
  const steps = Math.max(progressPages.length, readyPages.length, 1)

  useEffect(() => {
    if (pageIndex >= steps) setPageIndex(0)
  }, [pageIndex, steps])

  useEffect(() => {
    if (steps <= 1) return
    const interval = setInterval(() => setPageIndex((current) => (current + 1) % steps), carouselMs)
    return () => clearInterval(interval)
  }, [steps, carouselMs])

  const progressPage = progressPages.length ? pageIndex % progressPages.length : 0
  const readyPage = readyPages.length ? pageIndex % readyPages.length : 0
  const visible = progressPages[progressPage] || []
  const shape = gridShape(visible.length)

  const onAccent = contrastRatio("#FFFFFF", accent) >= 3 ? "#FFFFFF" : "#0A0A12"
  const barColor = paintForBackground(primary, CARD, 3)
  const brandOnBg = paintForBackground(primary, BG, 4.5)
  const clock = new Date(now).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  const todayRaw = new Date(now).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })
  const today = todayRaw.charAt(0).toUpperCase() + todayRaw.slice(1)
  const secondsAgo = Math.max(0, Math.floor((now - fetchedAt) / 1000))

  const vars = {
    "--tv-title": "clamp(1.4rem, 5vmin, 7rem)",
    "--tv-label": "clamp(1rem, 3vmin, 4rem)",
    "--tv-small": "clamp(0.85rem, 2.2vmin, 3rem)",
    "--tv-tiny": "clamp(0.75rem, 1.8vmin, 2.4rem)",
    "--tv-code": codeSize(shape.cols),
    "--tv-code-xl": "13vmin",
    background: BG,
  } as React.CSSProperties

  return (
    <div className="tv-root box-border flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden px-[3vmin] py-[2.6vmin] text-white" style={vars}>
      <header className="flex shrink-0 items-center justify-between gap-[3vmin]">
        <div className="flex min-w-0 items-center gap-[2.2vmin]">
          {showLogo && logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-[9vmin] w-auto max-w-[22vmin] shrink-0 rounded-[1.2vmin] bg-white object-contain p-[0.8vmin]" />
          ) : null}
          <div className="min-w-0">
            {showLogo ? (
              <p className="truncate font-semibold" style={{ fontSize: "var(--tv-small)", color: brandOnBg }}>
                {brandName || "Worqera"}
              </p>
            ) : null}
            <h1 className="truncate font-bold leading-tight tracking-tight" style={{ fontSize: "var(--tv-title)" }}>
              {title}
            </h1>
            <p className="truncate font-medium text-[#A9A9BC]" style={{ fontSize: "var(--tv-small)" }}>
              Procure o número do seu pedido na tela
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="tv-code font-bold leading-none" style={{ fontSize: "var(--tv-title)" }}>
            {clock}
          </p>
          <p className="mt-[0.6vmin] font-medium text-[#A9A9BC]" style={{ fontSize: "var(--tv-tiny)" }}>
            {today}
          </p>
        </div>
      </header>

      <main className="mt-[2.4vmin] grid min-h-0 flex-1 gap-[2.2vmin]" style={{ gridTemplateColumns: "minmax(0, 0.82fr) minmax(0, 1.5fr)" }}>
        <TvReadyPanel tiles={readyPages[readyPage] || []} page={readyPage} pages={readyPages.length} accent={accent} onAccent={onAccent} />

        <section className="flex min-h-0 flex-col">
          <div className="mb-[1.4vmin] flex shrink-0 items-baseline justify-between gap-[1vmin]">
            <p className="font-bold uppercase tracking-[0.14em] text-[#C9C9D6]" style={{ fontSize: "var(--tv-label)" }}>
              Em andamento
            </p>
            {progressPages.length > 1 ? (
              <div className="flex items-center gap-[0.8vmin]" aria-hidden>
                {progressPages.map((_, i) => (
                  <span
                    key={i}
                    className="block h-[1vmin] rounded-full transition-[width] duration-500"
                    style={{ width: i === progressPage ? "4vmin" : "1vmin", background: i === progressPage ? "#FFFFFF" : "#3A3A4E" }}
                  />
                ))}
              </div>
            ) : null}
          </div>

          {loading && !tiles.length ? (
            <p className="m-auto font-medium text-[#A9A9BC]" style={{ fontSize: "var(--tv-label)" }}>
              Carregando pedidos…
            </p>
          ) : visible.length ? (
            <div
              key={`p${progressPage}`}
              className="tv-fade grid min-h-0 flex-1 gap-[1.6vmin]"
              style={{
                gridTemplateColumns: `repeat(${shape.cols}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${shape.rows}, minmax(0, 1fr))`,
              }}
            >
              {visible.map((tile) => (
                <TvOrderCard key={tile.id} tile={tile} accent={barColor} compact={shape.cols >= 4} />
              ))}
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center rounded-[2vmin] text-center" style={{ background: CARD }}>
              <p className="font-bold" style={{ fontSize: "var(--tv-title)" }}>
                {ready.length ? "Tudo pronto por aqui!" : "Nenhum pedido em andamento"}
              </p>
              <p className="mt-[1vmin] font-medium text-[#A9A9BC]" style={{ fontSize: "var(--tv-label)" }}>
                Cuidado de verdade em cada pedido.
              </p>
            </div>
          )}
        </section>
      </main>

      <footer className="mt-[2vmin] flex shrink-0 items-center justify-between gap-[2vmin]">
        <div className="min-w-0">
          <p className="truncate font-semibold" style={{ fontSize: "var(--tv-label)" }}>
            {tiles.length
              ? `${tiles.length} ${tiles.length === 1 ? "pedido sendo cuidado" : "pedidos sendo cuidados"} agora${ready.length ? ` · ${ready.length} ${ready.length === 1 ? "pronto" : "prontos"}` : ""}`
              : "Sua vez está chegando"}
          </p>
          <p className="mt-[0.4vmin] truncate font-medium text-[#8A8AA0]" style={{ fontSize: "var(--tv-tiny)" }}>
            {error ? error : `Atualizado há ${secondsAgo}s`} · Worqera
          </p>
        </div>
        <TvShopQr reviewUrl={reviewUrl} phone={phone} />
      </footer>

      {celebrating ? (
        <TvCelebration code={celebrating} shopName={brandName} accent={accent} onAccent={onAccent} reduceMotion={reduceMotion} />
      ) : null}

      <style>{`
        .tv-root { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: geometricPrecision; }
        .tv-code { font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
        .tv-fade { animation: tvFade 600ms ease both; }
        .tv-pop { animation: tvPop 700ms cubic-bezier(.2,1.4,.4,1) both; }
        .tv-confetti { animation-name: tvFall; animation-timing-function: linear; animation-iteration-count: infinite; }
        @keyframes tvFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes tvPop { 0% { opacity: 0; transform: scale(.7); } 100% { opacity: 1; transform: none; } }
        @keyframes tvFall { from { transform: translateY(0) rotate(0deg); } to { transform: translateY(115vh) rotate(540deg); } }
        @media (prefers-reduced-motion: reduce) {
          .tv-fade, .tv-pop, .tv-confetti { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
