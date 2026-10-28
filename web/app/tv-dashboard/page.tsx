"use client"

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { getSetoresEstatisticasService } from "@/lib/apiService"
import {
  FLASH_MS,
  REFRESH_MS,
  detectIncreasedSectors,
  dueTimestamp,
  filterHotSectors,
  isHighPriority,
  isHotQuery,
  normalizeStats,
  totalsBySector,
  type FloorSector,
} from "@/lib/tvFloor"
import { paintForBackground } from "@/lib/shopBrand"
import { gridShape } from "@/components/tv/clientTvData"
import { FloorSectorCard, orderFlag } from "@/components/tv/floor/FloorSectorCard"
import { demoFloor } from "@/components/tv/floor/floorDemo"

const BG = "#0A0A12"
const CARD = "#151520"
const QUIET_BEEP = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA="

function TvFloorFallback() {
  return (
    <div className="flex h-[100dvh] items-center justify-center text-white" style={{ background: BG }}>
      <p className="text-xl text-white/60">Carregando TV Oficina…</p>
    </div>
  )
}

/** How many orders fit in each sector card without scrolling (nobody scrolls a TV). */
function rowsPerCard(gridRows: number) {
  if (gridRows <= 1) return 8
  if (gridRows === 2) return 4
  return 3
}

function endOfToday(now: number) {
  const d = new Date(now)
  d.setHours(23, 59, 59, 999)
  return d.getTime()
}

/**
 * TV Oficina: the production floor at a glance. Sized in vmin with solid colors so it
 * stays sharp on 720p TV browsers; late orders jump out in red, the queue is never scrolled.
 */
function TvFloorInner() {
  const searchParams = useSearchParams()
  const hot = isHotQuery(searchParams)
  const demo = searchParams.get("demo") === "1"
  const [sectors, setSectors] = useState<FloorSector[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [fetchedAt, setFetchedAt] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())
  const [flashIds, setFlashIds] = useState<string[]>([])
  const [reduceMotion, setReduceMotion] = useState(false)
  const [refreshMs, setRefreshMs] = useState(REFRESH_MS)
  const [brandName, setBrandName] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [brandPrimary, setBrandPrimary] = useState("#7D26DE")
  const [floorTitle, setFloorTitle] = useState("TV Oficina")
  const prevTotalsRef = useRef<Record<string, number>>({})
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    try {
      const next = demo ? demoFloor() : normalizeStats(await getSetoresEstatisticasService({ forceRefresh: true }))
      setSectors(next)
      setError("")
      setFetchedAt(Date.now())
    } catch (err) {
      console.error("Erro ao buscar estatísticas de setores:", err)
      setError("Reconectando…")
    } finally {
      setLoading(false)
    }
  }, [demo])

  useEffect(() => {
    if (demo) {
      setBrandName("Sua loja")
      return
    }
    ;(async () => {
      try {
        const { getShopCurrentV1 } = await import("@/lib/apiV1")
        const shop = await getShopCurrentV1()
        const doc = shop?.shop || shop
        const cfg = doc?.tvSettings?.floor || {}
        if (cfg.refreshMs) setRefreshMs(Math.max(5000, Number(cfg.refreshMs) || REFRESH_MS))
        if (cfg.title) setFloorTitle(String(cfg.title))
        setBrandName(doc?.branding?.displayName || doc?.name || "")
        setLogoUrl(doc?.branding?.logoUrl || "")
        const { resolveBrandColors } = await import("@/lib/shopBrand")
        setBrandPrimary(resolveBrandColors(doc?.branding).primary)
      } catch {
        // defaults
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
    load()
    const interval = setInterval(load, refreshMs)
    return () => clearInterval(interval)
  }, [load, refreshMs])

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const visible = useMemo(() => filterHotSectors(sectors, hot, now), [sectors, hot, now])
  // More than 12 sectors: rotate pages instead of shrinking cards.
  const [page, setPage] = useState(0)
  const pageCount = Math.max(1, Math.ceil(visible.length / 12))
  useEffect(() => {
    if (pageCount <= 1) {
      setPage(0)
      return
    }
    const t = setInterval(() => setPage((p) => (p + 1) % pageCount), 12_000)
    return () => clearInterval(t)
  }, [pageCount])
  const onScreen = visible.slice((page % pageCount) * 12, (page % pageCount) * 12 + 12)

  // A sector whose queue grew lights up for a moment, with a quiet beep.
  useEffect(() => {
    const totals = totalsBySector(visible)
    const prev = prevTotalsRef.current
    const isFirst = Object.keys(prev).length === 0
    prevTotalsRef.current = totals
    if (isFirst || reduceMotion) return
    const increased = detectIncreasedSectors(prev, totals)
    if (increased.length === 0) return
    setFlashIds(increased)
    if (!audioRef.current) {
      audioRef.current = new Audio(QUIET_BEEP)
      audioRef.current.volume = 0.25
    }
    audioRef.current.play().catch(() => {})
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    flashTimerRef.current = setTimeout(() => setFlashIds([]), Math.max(FLASH_MS, 2500))
  }, [visible, reduceMotion])

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    }
  }, [])

  const all = visible.flatMap((s) => s.orders)
  const total = visible.reduce((sum, s) => sum + s.count, 0)
  const late = all.filter((o) => orderFlag(o, now).flag === "late").length
  const today = all.filter((o) => {
    const due = dueTimestamp(o)
    return due != null && due >= now && due <= endOfToday(now)
  }).length
  const urgent = all.filter((o) => isHighPriority(o.priority)).length

  const shape = gridShape(onScreen.length)
  const limit = rowsPerCard(shape.rows)
  const clock = new Date(now).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  const secondsAgo = Math.max(0, Math.floor((now - fetchedAt) / 1000))
  const brandOnBg = paintForBackground(brandPrimary, BG, 4.5)

  const vars = {
    "--tv-title": "clamp(1.4rem, 4.6vmin, 6.5rem)",
    "--tv-label": "clamp(1rem, 3vmin, 4rem)",
    "--tv-small": "clamp(0.85rem, 2.2vmin, 3rem)",
    "--tv-tiny": "clamp(0.75rem, 1.8vmin, 2.4rem)",
    "--tv-count": shape.cols <= 3 ? "9vmin" : "7vmin",
    "--tv-order": shape.cols <= 3 && shape.rows <= 2 ? "4.2vmin" : "3.4vmin",
    background: BG,
  } as React.CSSProperties

  const kpis = [
    { label: "Na produção", value: total, color: "#FFFFFF", bg: CARD },
    { label: "Atrasados", value: late, color: late ? "#FFFFFF" : "#8A8AA0", bg: late ? "#BE123C" : CARD },
    { label: "Vencem hoje", value: today, color: today ? "#1A1300" : "#8A8AA0", bg: today ? "#F59E0B" : CARD },
    { label: "Urgentes", value: urgent, color: urgent ? "#FFFFFF" : "#8A8AA0", bg: urgent ? "#6D28D9" : CARD },
  ]

  return (
    <div className="tv-root box-border flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden px-[2.6vmin] py-[2.2vmin] text-white" style={vars}>
      <header className="flex shrink-0 items-center justify-between gap-[3vmin]">
        <div className="flex min-w-0 items-center gap-[2vmin]">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-[8vmin] w-auto max-w-[20vmin] shrink-0 rounded-[1.2vmin] bg-white object-contain p-[0.7vmin]" />
          ) : null}
          <div className="min-w-0">
            <p className="truncate font-semibold" style={{ fontSize: "var(--tv-small)", color: brandOnBg }}>
              {brandName || "Worqera"}
            </p>
            <h1 className="truncate font-bold leading-tight tracking-tight" style={{ fontSize: "var(--tv-title)" }}>
              {floorTitle}
              {hot ? <span className="ml-[1.4vmin] align-middle text-[#FB7185]" style={{ fontSize: "var(--tv-label)" }}>· só o que pega fogo</span> : null}
            </h1>
          </div>
        </div>

        <div className="flex shrink-0 items-stretch gap-[1.2vmin]">
          {kpis.map((k) => (
            <div key={k.label} className="min-w-[13vmin] rounded-[1.4vmin] px-[1.8vmin] py-[1vmin] text-center" style={{ background: k.bg }}>
              <p className="tv-code font-bold leading-none" style={{ fontSize: "var(--tv-title)", color: k.color }}>
                {k.value}
              </p>
              <p className="mt-[0.4vmin] font-semibold" style={{ fontSize: "var(--tv-tiny)", color: k.bg === CARD ? "#A9A9BC" : k.color }}>
                {k.label}
              </p>
            </div>
          ))}
          <div className="flex min-w-[15vmin] flex-col items-end justify-center pl-[1vmin]">
            <p className="tv-code font-bold leading-none" style={{ fontSize: "var(--tv-title)" }}>
              {clock}
            </p>
            <p className="mt-[0.6vmin] font-medium text-[#8A8AA0]" style={{ fontSize: "var(--tv-tiny)" }}>
              {error || `há ${secondsAgo}s`}
            </p>
          </div>
        </div>
      </header>

      <main className="mt-[2vmin] flex min-h-0 flex-1 flex-col overflow-hidden">
        {loading && sectors.length === 0 ? (
          <p className="m-auto font-medium text-[#A9A9BC]" style={{ fontSize: "var(--tv-label)" }}>
            Carregando setores…
          </p>
        ) : visible.length === 0 ? (
          <div className="m-auto text-center">
            <p className="font-bold" style={{ fontSize: "var(--tv-title)" }}>
              {hot ? "Nada atrasado nem urgente agora" : "Nenhum setor cadastrado"}
            </p>
            <p className="mt-[1vmin] font-medium text-[#A9A9BC]" style={{ fontSize: "var(--tv-label)" }}>
              {hot ? "Bom trabalho, time!" : "Cadastre os setores em Configurações."}
            </p>
          </div>
        ) : (
          <div
            className="grid min-h-0 flex-1 gap-[1.6vmin]"
            style={{
              gridTemplateColumns: `repeat(${shape.cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${shape.rows}, minmax(0, 1fr))`,
            }}
          >
            {onScreen.map((sector) => (
              <FloorSectorCard
                key={sector.id}
                sector={sector}
                now={now}
                limit={limit}
                flashing={flashIds.includes(sector.id)}
                countColor={paintForBackground(sector.color, CARD, 3)}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="mt-[1.6vmin] flex shrink-0 items-center gap-[2.4vmin] text-[#8A8AA0]" style={{ fontSize: "var(--tv-tiny)" }}>
        <span className="flex items-center gap-[0.8vmin]">
          <i className="block h-[1.6vmin] w-[1.6vmin] rounded-full bg-[#E11D48]" /> Atrasado ou parado há 24h+
        </span>
        <span className="flex items-center gap-[0.8vmin]">
          <i className="block h-[1.6vmin] w-[1.6vmin] rounded-full bg-[#F59E0B]" /> Vence hoje
        </span>
        <span className="flex items-center gap-[0.8vmin]">
          <i className="block h-[1.6vmin] w-[1.6vmin] rounded-full bg-[#7C3AED]" /> Urgente
        </span>
        <span className="ml-auto">Mais antigos e atrasados primeiro · Worqera</span>
      </footer>

      <style>{`
        .tv-root { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: geometricPrecision; }
        .tv-code { font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
        .tv-blink { animation: tvBlink 1.6s ease-in-out infinite; }
        @keyframes tvBlink { 0%, 100% { opacity: 1; } 50% { opacity: .55; } }
        @media (prefers-reduced-motion: reduce) { .tv-blink { animation: none !important; } }
      `}</style>
    </div>
  )
}

export default function TvDashboardPage() {
  return (
    <Suspense fallback={<TvFloorFallback />}>
      <TvFloorInner />
    </Suspense>
  )
}
