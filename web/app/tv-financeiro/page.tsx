"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getMetricsFinanceiroService, type MetricsFinanceiro } from "@/lib/apiService"
import { getShopCurrentV1 } from "@/lib/apiV1"

const REFRESH_MS = 60_000

type MonthBucket = {
  key: string
  label: string
  bruto: number
  previsto: number
  pedidos: number
}

function formatMoney(value: number, compact = false) {
  if (compact && Math.abs(value) >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
    })}M`
  }
  if (compact && Math.abs(value) >= 10_000) {
    return `R$ ${(value / 1_000).toLocaleString("pt-BR", {
      maximumFractionDigits: 0,
    })}k`
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value || 0)
}

function yearBounds(now = new Date()) {
  const y = now.getFullYear()
  const start = `${y}-01-01`
  const end = now.toISOString().slice(0, 10)
  return { start, end, year: y }
}

function buildMonths(data: MetricsFinanceiro | null, year: number): MonthBucket[] {
  const map = new Map<string, MonthBucket>()
  const now = new Date()
  const lastMonth = now.getFullYear() === year ? now.getMonth() : 11

  for (let m = 0; m <= lastMonth; m++) {
    const key = `${year}-${String(m + 1).padStart(2, "0")}`
    map.set(key, {
      key,
      label: new Date(year, m, 1).toLocaleDateString("pt-BR", { month: "short" }),
      bruto: 0,
      previsto: 0,
      pedidos: 0,
    })
  }

  for (const day of data?.evolucaoDiaria || []) {
    if (!day?.data) continue
    const key = String(day.data).slice(0, 7)
    const bucket = map.get(key)
    if (!bucket) continue
    bucket.bruto += Number(day.receitaRecebida) || 0
    bucket.previsto += Number(day.receitaPrevista) || 0
    bucket.pedidos += Number(day.pedidos) || 0
  }

  return Array.from(map.values())
}

function resolveMeta(ytdBruto: number, searchMeta: string | null): number {
  const fromQuery = Number(searchMeta)
  if (Number.isFinite(fromQuery) && fromQuery > 0) return fromQuery
  try {
    const stored = Number(localStorage.getItem("wq-finance-tv-meta") || "")
    if (Number.isFinite(stored) && stored > 0) return stored
  } catch {
    // ignore
  }
  return Math.max(ytdBruto * 2, 1)
}

function TvFinanceiroInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [data, setData] = useState<MetricsFinanceiro | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [fetchedAt, setFetchedAt] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())
  const [brandName, setBrandName] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [brandPrimary, setBrandPrimary] = useState("#7D26DE")
  const [allowed, setAllowed] = useState(false)

  const { start, end, year } = useMemo(() => yearBounds(new Date()), [])

  useEffect(() => {
    const role = String(localStorage.getItem("role") || "").toLowerCase()
    if (role !== "owner" && role !== "admin") {
      router.replace("/forbidden")
      return
    }
    setAllowed(true)
  }, [router])

  useEffect(() => {
    ;(async () => {
      try {
        const shop = await getShopCurrentV1()
        const doc = shop?.shop || shop
        setBrandName(doc?.branding?.displayName || doc?.name || "")
        setLogoUrl(doc?.branding?.logoUrl || "")
        const { resolveBrandColors } = await import("@/lib/shopBrand")
        setBrandPrimary(resolveBrandColors(doc?.branding).primary)
      } catch {
        // defaults
      }
    })()
  }, [])

  const load = useCallback(async () => {
    try {
      const finance = await getMetricsFinanceiroService({
        dataInicio: start,
        dataFim: end,
        limitServicos: 5,
      })
      setData(finance)
      setError("")
      setFetchedAt(Date.now())
    } catch (err: any) {
      setError(err?.message || "Não foi possível carregar o financeiro.")
    } finally {
      setLoading(false)
    }
  }, [start, end])

  useEffect(() => {
    if (!allowed) return
    load()
    const interval = setInterval(load, REFRESH_MS)
    return () => clearInterval(interval)
  }, [allowed, load])

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const resumo = data?.resumo
  const bruto = resumo?.receitaRecebida ?? 0
  const liquido = resumo?.lucroRealizado ?? 0
  const previsto = resumo?.receitaPrevista ?? 0
  const vendidos = resumo?.pedidosFinalizados ?? 0
  const pendente = resumo?.receitaPendente ?? 0
  const meta = resolveMeta(bruto, searchParams.get("meta"))
  const progress = Math.min(100, Math.round((bruto / meta) * 100))
  const months = buildMonths(data, year)
  const maxMonth = Math.max(...months.map((m) => m.bruto), 1)
  const topServices = (data?.topServicos || []).slice(0, 4)

  const clock = new Date(now).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
  const secondsAgo = Math.max(0, Math.floor((now - fetchedAt) / 1000))

  if (!allowed) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[var(--wq-ink)] text-white">
        <p className="text-xl text-white/60">Verificando acesso…</p>
      </div>
    )
  }

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
            <span className="rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-white/55">
              Privado · Admin
            </span>
          </div>
          <h1 className="truncate text-2xl font-semibold sm:text-3xl md:text-4xl">
            Financeiro {year}
          </h1>
          <p className="mt-0.5 text-sm text-white/55">
            Ano corrente · meta = 2× bruto realizado
            {searchParams.get("meta") ? " (meta custom)" : ""}
          </p>
        </div>
        <div className="shrink-0 text-right font-mono text-xl tabular-nums sm:text-2xl md:text-3xl">
          {clock}
          <p className="font-sans text-xs text-white/45 sm:text-sm">há {secondsAgo}s</p>
        </div>
      </header>

      {error ? (
        <p className="mb-2 shrink-0 text-sm text-[var(--wq-warn)]" role="status">
          {error}
        </p>
      ) : null}

      {loading && !data ? (
        <p className="m-auto text-xl text-white/60">Carregando financeiro…</p>
      ) : (
        <main className="grid min-h-0 flex-1 gap-3 overflow-hidden lg:grid-cols-[1.35fr_1fr] lg:gap-4">
          <section className="flex min-h-0 flex-col gap-3 overflow-hidden">
            <div className="grid shrink-0 gap-3 sm:grid-cols-[1.4fr_1fr]">
              <article className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                  Líquido no ano
                </p>
                <p
                  className="mt-2 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl"
                  style={{ color: brandPrimary }}
                >
                  {formatMoney(liquido)}
                </p>
                <p className="mt-2 text-sm text-white/55">
                  Bruto {formatMoney(bruto, true)} · previsto {formatMoney(previsto, true)}
                </p>
              </article>

              <article className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                  Meta anual
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                  {formatMoney(meta, true)}
                </p>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{
                      width: `${progress}%`,
                      background: brandPrimary,
                    }}
                  />
                </div>
                <p className="mt-2 text-sm text-white/60">
                  <span className="font-semibold text-white">{progress}%</span> do caminho · falta{" "}
                  {formatMoney(Math.max(0, meta - bruto), true)}
                </p>
              </article>
            </div>

            <article className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
              <div className="mb-3 flex shrink-0 items-end justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold sm:text-base">Meses de {year}</h2>
                  <p className="text-xs text-white/45">Bruto recebido por mês</p>
                </div>
                <p className="text-xs text-white/45">{months.length} mês(es)</p>
              </div>
              <div className="flex min-h-0 flex-1 items-end gap-1.5 sm:gap-2">
                {months.map((m) => {
                  const h = Math.max(6, Math.round((m.bruto / maxMonth) * 100))
                  return (
                    <div key={m.key} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                      <span className="truncate text-[10px] font-medium tabular-nums text-white/70 sm:text-xs">
                        {formatMoney(m.bruto, true)}
                      </span>
                      <div className="flex h-full w-full items-end">
                        <div
                          className="mx-auto w-full max-w-[48px] rounded-t-md"
                          style={{
                            height: `${h}%`,
                            background: `linear-gradient(180deg, ${brandPrimary}, color-mix(in srgb, ${brandPrimary} 35%, transparent))`,
                            minHeight: m.bruto > 0 ? "8px" : "2px",
                          }}
                          title={`${m.label}: ${formatMoney(m.bruto)}`}
                        />
                      </div>
                      <span className="truncate text-[10px] uppercase tracking-wide text-white/45 sm:text-[11px]">
                        {m.label.replace(".", "")}
                      </span>
                    </div>
                  )
                })}
              </div>
            </article>
          </section>

          <section className="grid min-h-0 grid-rows-[auto_1fr] gap-3 overflow-hidden">
            <div className="grid shrink-0 grid-cols-2 gap-3">
              {[
                { label: "Vendidos", value: String(vendidos) },
                { label: "A receber", value: formatMoney(pendente, true) },
                {
                  label: "Ticket médio",
                  value: formatMoney(resumo?.ticketMedio || 0, true),
                },
                {
                  label: "Caixa hoje",
                  value: formatMoney(data?.caixaHoje?.entradaHoje || 0, true),
                },
              ].map((card) => (
                <article
                  key={card.label}
                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 sm:px-4 sm:py-4"
                >
                  <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
                    {card.label}
                  </p>
                  <p className="mt-1.5 text-xl font-semibold tabular-nums sm:text-2xl">{card.value}</p>
                </article>
              ))}
            </div>

            <article className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
              <h2 className="shrink-0 text-sm font-semibold sm:text-base">Top serviços</h2>
              <p className="mb-3 shrink-0 text-xs text-white/45">Receita no ano</p>
              <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto">
                {topServices.length === 0 ? (
                  <li className="text-sm text-white/45">Sem serviços no período.</li>
                ) : (
                  topServices.map((s) => {
                    const max = Math.max(...topServices.map((x) => x.receita), 1)
                    return (
                      <li key={s.servico} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="truncate font-medium">{s.servico}</span>
                          <span className="shrink-0 font-mono tabular-nums" style={{ color: brandPrimary }}>
                            {formatMoney(s.receita, true)}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.round((s.receita / max) * 100)}%`,
                              background: brandPrimary,
                            }}
                          />
                        </div>
                      </li>
                    )
                  })
                )}
              </ul>
            </article>
          </section>
        </main>
      )}
    </div>
  )
}

export default function TvFinanceiroPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[100dvh] items-center justify-center bg-[var(--wq-ink)] text-white">
          <p className="text-xl text-white/60">Carregando TV Financeiro…</p>
        </div>
      }
    >
      <TvFinanceiroInner />
    </Suspense>
  )
}
