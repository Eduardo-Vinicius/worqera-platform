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
    <div className="flex min-h-screen items-center justify-center bg-[var(--wq-ink)] text-white">
      <p className="text-2xl text-white/60">Carregando TV Oficina…</p>
    </div>
  )
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
    <div className="flex min-h-screen flex-col bg-[var(--wq-ink)] p-8 text-white md:p-12">
      <header className="mb-10 flex items-end justify-between gap-6">
        <div>
          <p className="text-sm text-white/50">{brandName || "Worqera"}</p>
          <h1 className="text-4xl font-semibold md:text-5xl">{floorTitle}</h1>
          <p className="mt-1 text-lg text-white/60">
            Fila por setor
            {hot ? " · fila quente" : ""}
          </p>
        </div>
        <div className="text-right font-mono text-2xl tabular-nums md:text-3xl">
          {clock}
          <p className="font-sans text-sm text-white/50">Atualizado há {secondsAgo}s</p>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        {error && (
          <p className="mb-4 text-lg text-[var(--wq-warn)]" role="status">
            {error}
          </p>
        )}

        {loading && sectors.length === 0 ? (
          <p className="m-auto text-2xl text-white/60">Carregando setores…</p>
        ) : visible.length === 0 ? (
          <p className="m-auto text-2xl text-white/60">
            {hot ? "Nenhum pedido atrasado ou de alta prioridade" : "Nenhum setor cadastrado"}
          </p>
        ) : (
          <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((sector) => {
              const flashing = flashIds.includes(sector.id)
              return (
                <article
                  key={sector.id}
                  className={`flex flex-col rounded-3xl border bg-white/5 p-5 ${
                    flashing
                      ? "border-[var(--wq-action)] ring-2 ring-[var(--wq-action)]"
                      : "border-white/10"
                  } ${reduceMotion ? "" : "transition-[box-shadow,border-color] duration-300"}`}
                >
                  <div
                    className="mb-4 h-1.5 w-12 rounded-full"
                    style={{ backgroundColor: sector.color }}
                    aria-hidden="true"
                  />
                  <p className="text-sm uppercase tracking-[0.18em] text-white/50">Setor</p>
                  <h2 className="mt-1 truncate font-[family-name:var(--font-fraunces)] text-2xl">
                    {sector.name}
                  </h2>
                  <p
                    className="mt-3 font-mono text-6xl font-semibold tabular-nums leading-none md:text-7xl"
                    style={{ color: sector.color }}
                  >
                    {sector.count}
                  </p>
                  <p className="mt-2 text-sm text-white/50">
                    {sector.count === 1 ? "1 pedido" : `${sector.count} pedidos`}
                  </p>

                  <ul className="mt-5 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                    {sector.orders.length === 0 && (
                      <li className="text-sm text-white/40">Fila vazia</li>
                    )}
                    {sector.orders.map((order) => {
                      const overdue = isOverdue(order, now)
                      return (
                        <li
                          key={order.id}
                          className="flex items-baseline justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2"
                        >
                          <span className="font-mono text-xl tracking-wide md:text-2xl">
                            {order.code}
                          </span>
                          <span
                            className={`shrink-0 text-sm font-semibold tabular-nums ${
                              overdue
                                ? `text-[var(--wq-warn)] ${reduceMotion ? "" : "animate-pulse"}`
                                : "text-white/60"
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
