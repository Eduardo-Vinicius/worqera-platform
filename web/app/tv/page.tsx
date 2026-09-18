"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { apiFetch, getOrdersService } from "@/lib/apiService"
import { getShopCurrentV1 } from "@/lib/apiV1"

const DEFAULT_REFRESH_MS = 18_000
const DEFAULT_CAROUSEL_MS = 8_000
const DEFAULT_TILES = 6

type OrderRow = {
  id?: string
  _id?: string
  code?: string
  codigo?: string
  status?: string
  currentSectorId?: string | { _id?: string; id?: string; name?: string }
  currentSector?: { name?: string }
  setorAtual?: string
}

type Tile = {
  id: string
  code: string
  label: string
  kind: "open" | "progress" | "ready"
}

function slug(value: string) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function isReadyStatus(status: string) {
  const s = slug(status)
  if (!s) return false
  if (s === "ready") return true
  if (/entregue|delivered|cancel/.test(s)) return false
  return /pronto|retir|aguardando retirada|finaliz/.test(s)
}

function isOpenStatus(status: string) {
  const s = slug(status)
  return s === "open" || /^(aberto|receb|orc|aprova|a fazer|inici|backlog|criado)/.test(s)
}

function isExcludedStatus(status: string) {
  const s = slug(status)
  if (!s) return false
  if (/entregue|delivered|cancelad/.test(s)) return true
  if (s === "cancelled" || s === "delivered") return true
  return false
}

function isClientRelevant(status: string) {
  const raw = String(status || "").trim()
  if (!raw) return true
  if (isExcludedStatus(raw)) return false
  const s = slug(raw)
  if (s === "open" || s === "in_progress" || s === "ready") return true
  if (isReadyStatus(raw) || isOpenStatus(raw)) return true
  return /andamento|process|lavag|pint|sapat|costur|acab|atendimento/.test(s)
}

function formatSectorLabel(name: string) {
  const trimmed = name.trim()
  if (!trimmed) return ""
  const s = slug(trimmed)
  if (/final|retir/.test(s)) return "Pronto pra retirar"
  if (/^em\s/.test(s)) return trimmed
  return `Em ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`
}

function sectorNameFromOrder(order: OrderRow, sectors: Record<string, string>) {
  const populated = order.currentSector?.name
  if (populated) return populated
  const nested = order.currentSectorId
  if (nested && typeof nested === "object" && nested.name) return nested.name
  const id =
    typeof nested === "object"
      ? String(nested._id || nested.id || "")
      : String(nested || order.setorAtual || "")
  return (id && sectors[id]) || ""
}

function humanLabel(status: string, sectorName: string) {
  if (isReadyStatus(status)) return "Pronto pra retirar"
  if (sectorName) {
    const fromSector = formatSectorLabel(sectorName)
    if (fromSector) return fromSector
  }
  const raw = String(status || "").trim()
  const match = raw.match(/^([^–\-]+)\s*[-–]/)
  if (match && !/^(open|in_progress|ready)$/i.test(match[1].trim())) {
    return formatSectorLabel(match[1].trim())
  }
  if (isOpenStatus(raw)) return "Recebido"
  if (raw && !/^(open|in_progress|ready)$/i.test(raw)) return raw
  return "Em andamento"
}

function tileKind(status: string): Tile["kind"] {
  if (isReadyStatus(status)) return "ready"
  if (isOpenStatus(status)) return "open"
  return "progress"
}

function kindRank(kind: Tile["kind"]) {
  if (kind === "ready") return 0
  if (kind === "progress") return 1
  return 2
}

function paginate<T>(items: T[], size: number) {
  if (items.length === 0) return [] as T[][]
  const pages: T[][] = []
  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size))
  return pages
}

async function loadSectorNames() {
  try {
    const json = await apiFetch("/sectors")
    const list = json?.sectors || json?.data || []
    const map: Record<string, string> = {}
    for (const sector of Array.isArray(list) ? list : []) {
      const id = String(sector?._id || sector?.id || "")
      const name = String(sector?.name || sector?.nome || "")
      if (id && name) map[id] = name
    }
    return map
  } catch {
    return {} as Record<string, string>
  }
}

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
  const [brandPrimary, setBrandPrimary] = useState("#7D26DE")

  const load = useCallback(async () => {
    try {
      const [raw, sectors] = await Promise.all([
        getOrdersService({ forceRefresh: true }),
        loadSectorNames(),
      ])
      const list = Array.isArray(raw) ? (raw as OrderRow[]) : []
      const next = list
        .filter((order) => isClientRelevant(order.status || ""))
        .map((order) => {
          const status = order.status || ""
          const id = String(order.id || order._id || order.code || order.codigo || "")
          return {
            id,
            code: String(order.code || order.codigo || id || "—"),
            label: humanLabel(status, sectorNameFromOrder(order, sectors)),
            kind: tileKind(status),
          } satisfies Tile
        })
        .filter((tile) => tile.id)
        .sort((a, b) => kindRank(a.kind) - kindRank(b.kind))
      setTiles(next)
      setError("")
      setFetchedAt(Date.now())
    } catch (err) {
      console.error("Erro ao buscar pedidos para TV cliente:", err)
      setError("Não foi possível atualizar os pedidos.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const shop = await getShopCurrentV1()
        const doc = shop?.shop || shop
        const cfg = doc?.tvSettings?.client || {}
        if (cfg.refreshMs) setRefreshMs(Number(cfg.refreshMs) || DEFAULT_REFRESH_MS)
        if (cfg.carouselMs) setCarouselMs(Number(cfg.carouselMs) || DEFAULT_CAROUSEL_MS)
        if (cfg.tilesPerPage) setTilesPerPage(Number(cfg.tilesPerPage) || DEFAULT_TILES)
        if (cfg.title) setTitle(String(cfg.title))
        if (cfg.showLogo === false) setShowLogo(false)
        setBrandName(doc?.branding?.displayName || doc?.name || "")
        setLogoUrl(doc?.branding?.logoUrl || "")
        const { resolveBrandColors } = await import("@/lib/shopBrand")
        setBrandPrimary(resolveBrandColors(doc?.branding).primary)
      } catch {
        // keep defaults
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

  const pages = useMemo(() => paginate(tiles, tilesPerPage), [tiles, tilesPerPage])

  useEffect(() => {
    if (pageIndex >= pages.length) setPageIndex(0)
  }, [pageIndex, pages.length])

  useEffect(() => {
    if (reduceMotion || pages.length <= 1) return
    const interval = setInterval(() => {
      setPageIndex((current) => (current + 1) % pages.length)
    }, carouselMs)
    return () => clearInterval(interval)
  }, [pages.length, reduceMotion, carouselMs])

  const clock = new Date(now).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
  const secondsAgo = Math.max(0, Math.floor((now - fetchedAt) / 1000))
  const visible = pages[pageIndex] || []

  return (
    <div className="flex min-h-screen flex-col bg-[var(--wq-ink)] p-8 text-white md:p-12">
      <header className="mb-10 flex items-end justify-between gap-6">
        <div>
          {showLogo ? (
            <div className="mb-2 flex items-center gap-3">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="h-10 w-auto object-contain" />
              ) : null}
              <p className="text-sm font-medium" style={{ color: brandPrimary }}>
                {brandName || "Worqera"}
              </p>
            </div>
          ) : (
            <p className="text-sm text-white/50">Worqera</p>
          )}
          <h1 className="text-4xl font-semibold md:text-5xl">{title}</h1>
        </div>
        <div className="text-right font-mono text-2xl tabular-nums md:text-3xl">
          {clock}
          <p className="font-sans text-sm text-white/50">Atualizado há {secondsAgo}s</p>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        {error && (
          <p className="mb-4 text-lg text-amber-200" role="status">
            {error}
          </p>
        )}

        {loading && tiles.length === 0 ? (
          <p className="m-auto text-2xl text-white/60">Carregando pedidos…</p>
        ) : tiles.length === 0 ? (
          <p className="m-auto text-2xl text-white/60">Nenhum pedido em andamento</p>
        ) : (
          <>
            <div
              key={pageIndex}
              className={`grid min-h-0 flex-1 grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 ${
                reduceMotion
                  ? ""
                  : "motion-safe:animate-[tvFade_500ms_ease] motion-reduce:animate-none"
              }`}
            >
              {visible.map((tile) => (
                <article
                  key={tile.id}
                  className={`flex flex-col items-center justify-center rounded-3xl border px-6 py-8 text-center ${
                    tile.kind === "ready"
                      ? "border-[var(--wq-action)]/50 bg-[var(--wq-action)]/15"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <p
                    className={`font-mono text-5xl font-semibold tracking-wide md:text-7xl ${
                      tile.kind === "ready" ? "text-teal-100" : "text-white"
                    }`}
                  >
                    {tile.code}
                  </p>
                  <p
                    className={`mt-4 text-2xl md:text-3xl ${
                      tile.kind === "ready" ? "text-teal-50" : "text-white/80"
                    }`}
                  >
                    {tile.label}
                  </p>
                </article>
              ))}
            </div>

            {pages.length > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3" aria-hidden="true">
                {pages.map((_, index) => (
                  <span
                    key={index}
                    className={`h-2.5 rounded-full ${
                      index === pageIndex ? "w-8 bg-white" : "w-2.5 bg-white/30"
                    } ${reduceMotion ? "" : "transition-[width,background-color] duration-500"}`}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <style>{`
        @keyframes tvFade {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes tvFade {
            from { opacity: 1; transform: none; }
            to { opacity: 1; transform: none; }
          }
        }
      `}</style>
    </div>
  )
}
