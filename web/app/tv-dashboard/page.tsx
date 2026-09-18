"use client"

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { getSetoresEstatisticasService } from "@/lib/apiService"
import {
  FLASH_MS,
  REFRESH_MS,
  detectIncreasedSectors,
  filterHotSectors,
  formatHoursInSector,
  isHotQuery,
  isOverdue,
  normalizeStats,
  totalsBySector,
  type FloorSector,
} from "@/lib/tvFloor"

const QUIET_BEEP =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA="

function TvFloorFallback() {
  return (
    <div className="flex h-[100dvh] items-center justify-center bg-[var(--wq-ink)] text-white">
      <p className="text-xl text-white/60">Carregando TV Oficina…</p>
    </div>
  )
}

function gridColsClass(count: number) {
  if (count <= 1) return "grid-cols-1"
  if (count === 2) return "grid-cols-1 sm:grid-cols-2"
  if (count === 3) return "grid-cols-1 sm:grid-cols-3"
  if (count <= 4) return "grid-cols-2 lg:grid-cols-4"
  if (count <= 6) return "grid-cols-2 lg:grid-cols-3"
  return "grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
}

function TvFloorInner() {
  const searchParams = useSearchParams()
  const hot = isHotQuery(searchParams)
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
      const raw = await getSetoresEstatisticasService({ forceRefresh: true })
      const next = normalizeStats(raw)
      setSectors(next)
      setError("")
      setFetchedAt(Date.now())
    } catch (err) {
      console.error("Erro ao buscar estatísticas de setores:", err)
      setError("Não foi possível atualizar a fila por setor.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const { getShopCurrentV1 } = await import("@/lib/apiV1")
        const shop = await getShopCurrentV1()
        const doc = shop?.shop || shop
        const cfg = doc?.tvSettings?.floor || {}
        if (cfg.refreshMs) setRefreshMs(Number(cfg.refreshMs) || REFRESH_MS)
        if (cfg.title) setFloorTitle(String(cfg.title))
        setBrandName(doc?.branding?.displayName || doc?.name || "")
        setLogoUrl(doc?.branding?.logoUrl || "")
        const { resolveBrandColors } = await import("@/lib/shopBrand")
        setBrandPrimary(resolveBrandColors(doc?.branding).primary)
      } catch {
        // defaults
      }
    })()
  }, [])

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
    flashTimerRef.current = setTimeout(() => setFlashIds([]), FLASH_MS)
  }, [visible, reduceMotion])

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    }
  }, [])

  const clock = new Date(now).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
  const secondsAgo = Math.max(0, Math.floor((now - fetchedAt) / 1000))

  return (
    <div className="box-border flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-[var(--wq-ink)] px-4 py-3 text-white sm:px-6 sm:py-4 md:px-8 md:py-5">
      <header className="mb-3 flex shrink-0 items-center justify-between gap-4 sm:mb-4">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2.5">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-7 w-auto object-contain sm:h-8" />
            ) : null}
            <p className="truncate text-xs font-medium sm:text-sm" style={{ color: brandPrimary }}>
              {brandName || "Worqera"}
            </p>
          </div>
          <h1 className="truncate text-2xl font-semibold sm:text-3xl md:text-4xl">{floorTitle}</h1>
          <p className="mt-0.5 text-sm text-white/55">
            Fila por setor
            {hot ? " · fila quente" : ""}
          </p>
        </div>
        <div className="shrink-0 text-right font-mono text-xl tabular-nums sm:text-2xl md:text-3xl">
          {clock}
          <p className="font-sans text-xs text-white/45 sm:text-sm">há {secondsAgo}s</p>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {error && (
          <p className="mb-2 shrink-0 text-sm text-[var(--wq-warn)]" role="status">
            {error}
          </p>
        )}

        {loading && sectors.length === 0 ? (
          <p className="m-auto text-xl text-white/60">Carregando setores…</p>
        ) : visible.length === 0 ? (
          <p className="m-auto text-xl text-white/60">
            {hot ? "Nenhum pedido atrasado ou de alta prioridade" : "Nenhum setor cadastrado"}
          </p>
        ) : (
          <div
            className={`grid min-h-0 flex-1 gap-3 overflow-hidden ${gridColsClass(visible.length)}`}
            style={{ gridAutoRows: "minmax(0, 1fr)" }}
          >
            {visible.map((sector) => {
              const flashing = flashIds.includes(sector.id)
              return (
                <article
                  key={sector.id}
                  className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-white/5 p-3 sm:p-4 ${
                    flashing
                      ? "border-[var(--wq-action)] ring-2 ring-[var(--wq-action)]"
                      : "border-white/10"
                  } ${reduceMotion ? "" : "transition-[box-shadow,border-color] duration-300"}`}
                >
                  <div className="mb-2 flex shrink-0 items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div
                        className="mb-1.5 h-1 w-10 rounded-full"
                        style={{ backgroundColor: sector.color }}
                        aria-hidden="true"
                      />
                      <h2 className="truncate text-base font-semibold sm:text-lg md:text-xl">
                        {sector.name}
                      </h2>
                    </div>
                    <p
                      className="shrink-0 font-mono text-3xl font-semibold tabular-nums leading-none sm:text-4xl md:text-5xl"
                      style={{ color: sector.color }}
                    >
                      {sector.count}
                    </p>
                  </div>

                  <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain pr-0.5">
                    {sector.orders.length === 0 && (
                      <li className="text-sm text-white/40">Fila vazia</li>
                    )}
                    {sector.orders.map((order) => {
                      const overdue = isOverdue(order, now)
                      return (
                        <li
                          key={order.id}
                          className="flex items-baseline justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5"
                        >
                          <span className="font-mono text-base tracking-wide sm:text-lg md:text-xl">
                            {order.code}
                          </span>
                          <span
                            className={`shrink-0 text-xs font-semibold tabular-nums sm:text-sm ${
                              overdue
                                ? `text-[var(--wq-warn)] ${reduceMotion ? "" : "animate-pulse"}`
                                : "text-white/55"
                            }`}
                          >
                            {formatHoursInSector(order.hoursInSector)}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </article>
              )
            })}
          </div>
        )}
      </main>
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
