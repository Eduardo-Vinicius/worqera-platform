"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Download,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  getMetricsFinanceiroService,
  type MetricsFinanceiro,
  type MetricsPeriodo,
} from "@/lib/apiService"
import { productSummaryV1 } from "@/lib/apiV1"
import { AppHeader } from "@/components/shell/AppHeader"
import { WeeklyInsightsCard } from "@/components/ai/WeeklyInsightsCard"
import { ReceivablesCard } from "@/components/ai/ReceivablesCard"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Panel, RankList, RevenueChart, SectorMoney, ServicesShare, toRevenuePoints } from "@/components/finance/FinanceCharts"

const PERIOD_OPTIONS: Array<{ value: MetricsPeriodo; label: string }> = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7d" },
  { value: "15d", label: "15d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "1y", label: "1 ano" },
]

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value || 0)

const formatCurrencyFull = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0)

function exportFinanceCsv(data: MetricsFinanceiro) {
  const rows: string[][] = [
    ["seção", "campo", "valor"],
    ["resumo", "bruto_previsto", String(data.resumo?.receitaPrevista ?? 0)],
    ["resumo", "bruto_recebido", String(data.resumo?.receitaRecebida ?? 0)],
    ["resumo", "liquido", String(data.resumo?.lucroRealizado ?? 0)],
    ["resumo", "a_receber", String(data.resumo?.receitaPendente ?? 0)],
    ["resumo", "despesas", String(data.resumo?.despesas ?? 0)],
    ["resumo", "vendidos", String(data.resumo?.pedidosFinalizados ?? 0)],
    ["resumo", "ticket_medio", String(data.resumo?.ticketMedio ?? 0)],
  ]
  ;(data.topServicos || []).forEach((s) => {
    rows.push(["servico", s.servico, String(s.receita)])
  })
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `financeiro-${data.periodo?.referencia || "periodo"}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function AdminFinanceiroPage() {
  const [periodo, setPeriodo] = useState<MetricsPeriodo>("30d")
  const [data, setData] = useState<MetricsFinanceiro | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stock, setStock] = useState<Awaited<ReturnType<typeof productSummaryV1>>["summary"] | null>(null)

  const loadData = async (selectedPeriodo: MetricsPeriodo) => {
    try {
      setLoading(true)
      setError(null)
      const finance = await getMetricsFinanceiroService({ periodo: selectedPeriodo, limitServicos: 8 })
      setData(finance)
    } catch (err: any) {
      setError(err?.message || "Falha ao carregar financeiro")
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData(periodo)
  }, [periodo])

  useEffect(() => {
    if (typeof window === "undefined" || localStorage.getItem("platformAdmin") !== "1") return
    productSummaryV1()
      .then((res) => setStock(res.summary))
      .catch(() => setStock(null))
  }, [])

  const resumo = data?.resumo
  const caixa = data?.caixaHoje
  const liquido = resumo?.lucroRealizado ?? 0
  const bruto = resumo?.receitaRecebida ?? 0
  const brutoPrevisto = resumo?.receitaPrevista ?? 0
  const vendidos = resumo?.pedidosFinalizados ?? 0
  const monthly = periodo === "90d" || periodo === "1y"
  const points = useMemo(() => toRevenuePoints(data?.evolucaoDiaria || [], monthly), [data, monthly])

  const secondary = useMemo(
    () => [
      {
        label: "Bruto recebido",
        value: formatCurrency(bruto),
        hint: "Entradas no período",
      },
      {
        label: "Bruto previsto",
        value: formatCurrency(brutoPrevisto),
        hint: `${resumo?.totalPedidos || 0} pedidos`,
      },
      {
        label: "A receber",
        value: formatCurrency(resumo?.receitaPendente || 0),
        hint: `${resumo?.pedidosEmAberto || 0} em aberto`,
      },
      {
        label: "Ticket médio",
        value: formatCurrencyFull(resumo?.ticketMedio || 0),
        hint: `Despesas ${formatCurrency(resumo?.despesas || 0)}`,
      },
    ],
    [bruto, brutoPrevisto, resumo]
  )

  return (
    <div className="-mx-2.5 -mt-3 sm:-mx-5 sm:-mt-5 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-6">
      <AppHeader
        title="Financeiro"
        subtitle="Líquido · bruto · vendidos · setores"
        actions={
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <Button asChild size="sm" variant="outline" className="h-9 rounded-[10px]">
              <Link href="/tv-financeiro" target="_blank">
                <ExternalLink className="mr-1.5 h-4 w-4" />
                <span className="hidden sm:inline">TV Financeiro</span>
                <span className="sm:hidden">TV</span>
              </Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9 rounded-[10px]"
              disabled={!data}
              onClick={() => {
                if (!data) return
                exportFinanceCsv(data)
                toast.success("CSV baixado")
              }}
            >
              <Download className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">CSV</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9 rounded-[10px]"
              onClick={() => loadData(periodo)}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        }
      />

      <div className="mx-auto w-full max-w-[1600px] space-y-4 px-2.5 pb-8 sm:space-y-5 sm:px-5 md:px-6 lg:px-8">
        {stock ? (
          <section className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--wq-text-muted)]">
              Produtos · admin Worqera
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              <div>
                <p className="text-xs text-[var(--wq-text-muted)]">Vendido</p>
                <p className="font-mono text-lg">{formatCurrencyFull(stock.salesTotal)}</p>
                <p className="text-xs text-[var(--wq-text-muted)]">{stock.salesUnits} un. entregues</p>
              </div>
              <div>
                <p className="text-xs text-[var(--wq-text-muted)]">Reservado</p>
                <p className="font-mono text-lg">{formatCurrencyFull(stock.reservedValue)}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--wq-text-muted)]">Estoque</p>
                <p className="font-mono text-lg">{formatCurrencyFull(stock.stockValue)}</p>
                <p className="text-xs text-[var(--wq-text-muted)]">{stock.availableUnits} un. disponíveis</p>
              </div>
              <div>
                <p className="text-xs text-[var(--wq-text-muted)]">Catálogo</p>
                <p className="font-mono text-lg">{stock.productCount}</p>
                <p className="text-xs text-[var(--wq-text-muted)]">{stock.low.length} no mínimo</p>
              </div>
            </div>
          </section>
        ) : null}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible">
          {PERIOD_OPTIONS.map((option) => {
            const active = periodo === option.value
            return (
              <Button
                key={option.value}
                size="sm"
                variant={active ? "default" : "outline"}
                className={cn(
                  "h-10 shrink-0 rounded-[10px]",
                  active
                    ? "bg-[var(--wq-action)] text-white hover:bg-[var(--wq-action)]/90"
                    : "border-[var(--wq-border)] bg-[var(--wq-surface)]"
                )}
                onClick={() => setPeriodo(option.value)}
              >
                {option.label}
              </Button>
            )
          })}
        </div>

        {error ? (
          <Alert className="border-[var(--wq-danger)]/30 bg-[var(--wq-danger)]/5">
            <AlertDescription className="text-[var(--wq-danger)]">{error}</AlertDescription>
          </Alert>
        ) : null}

        {/* Hero: líquido */}
        <section className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
          <div className="grid gap-px bg-[var(--wq-border)] lg:grid-cols-[1.2fr_1fr]">
            <div className="bg-[linear-gradient(145deg,color-mix(in_srgb,var(--wq-brand)_14%,var(--wq-surface)),var(--wq-surface)_55%)] px-4 py-5 sm:px-6 sm:py-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--wq-text-muted)]">
                Líquido do período
              </p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-[var(--wq-text)] sm:text-5xl">
                {loading && !data ? "…" : formatCurrencyFull(liquido)}
              </p>
              <p className="mt-2 text-sm text-[var(--wq-text-muted)]">
                Recebido − despesas · margem{" "}
                <span className="font-semibold text-[var(--wq-text)]">
                  {(resumo?.margemPrevista ?? 0).toFixed(1)}%
                </span>
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <div className="rounded-xl border border-[var(--wq-border)] bg-[var(--wq-surface)]/80 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-[var(--wq-text-muted)]">Vendidos</p>
                  <p className="text-lg font-semibold tabular-nums text-[var(--wq-text)]">{vendidos}</p>
                </div>
                <div className="rounded-xl border border-[var(--wq-border)] bg-[var(--wq-surface)]/80 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-[var(--wq-text-muted)]">Caixa hoje</p>
                  <p className="text-lg font-semibold tabular-nums text-[var(--wq-text)]">
                    {formatCurrency(caixa?.entradaHoje || 0)}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--wq-border)] bg-[var(--wq-surface)]/80 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-[var(--wq-text-muted)]">Prontos a receber</p>
                  <p className="text-lg font-semibold tabular-nums text-[var(--wq-text)]">
                    {formatCurrency(caixa?.aReceberProntos || 0)}
                  </p>
                </div>
                <Link
                  href="/orcamentos?view=recovered"
                  className="rounded-xl border border-emerald-300/60 bg-emerald-50/80 px-3 py-2 transition hover:border-emerald-500 dark:border-emerald-800 dark:bg-emerald-950/30"
                  title="Pedidos recusados que voltaram por Orçamentos neste período"
                >
                  <p className="text-[10px] uppercase tracking-wide text-emerald-800 dark:text-emerald-300">Recuperado</p>
                  <p className="text-lg font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(data?.recovered?.value || 0)}
                  </p>
                  <p className="text-[10px] text-emerald-800/80 dark:text-emerald-300/80">
                    {data?.recovered?.count || 0} {(data?.recovered?.count || 0) === 1 ? "pedido voltou" : "pedidos voltaram"}
                  </p>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px bg-[var(--wq-border)]">
              {secondary.map((card) => (
                <div key={card.label} className="bg-[var(--wq-surface)] px-3.5 py-4 sm:px-5 sm:py-5">
                  <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">
                    {card.label}
                  </p>
                  <p className="mt-2 text-xl font-semibold tracking-tight text-[var(--wq-text)] sm:text-2xl">
                    {loading && !data ? "…" : card.value}
                  </p>
                  <p className="mt-1 text-xs text-[var(--wq-text-muted)]">{card.hint}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Panel
          title="Faturamento"
          hint={monthly ? "Por mês · recebido e vendido no período" : "Por dia · recebido e vendido no período"}
        >
          <RevenueChart points={points} />
        </Panel>

        <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
          <Panel title="Serviços que mais faturam" hint="Fatia de cada serviço no faturamento do período">
            <ServicesShare rows={data?.topServicos || []} />
          </Panel>
          <Panel
            title="Dinheiro em cada setor"
            hint="Pedidos abertos agora, pelo setor onde cada item está"
            action={
              <Link href="/kanban" className="inline-flex items-center text-xs font-semibold text-[var(--wq-brand-text)]">
                Kanban <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            }
          >
            <SectorMoney rows={data?.sectorValue || []} />
          </Panel>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Panel title="Maiores pedidos" hint="Valor e líquido (menos despesas)">
            <RankList
              empty="Sem pedidos com valor no período."
              rows={(data?.topOrders || []).map((o) => ({
                key: o.id,
                label: `#${o.code} · ${o.clientName || "Cliente"}`,
                value: o.total,
                sub: `líquido ${formatCurrency(o.net)}`,
                href: `/pedidos?q=${encodeURIComponent(o.code)}`,
              }))}
            />
          </Panel>
          <Panel title="Melhores clientes" hint="Quem mais comprou no período">
            <RankList
              empty="Sem clientes no período."
              rows={(data?.topClients || []).map((c) => ({
                key: c.clientId || c.name,
                label: c.name,
                value: c.revenue,
                sub: `${c.orders} ${c.orders === 1 ? "pedido" : "pedidos"}`,
                href: c.clientId ? `/clientes/${c.clientId}` : undefined,
              }))}
            />
          </Panel>
          <Panel title="Quem mais vendeu" hint="Pelo “Aberto por” de cada pedido">
            <RankList
              empty="Os pedidos do período não têm “Aberto por”."
              rows={(data?.byAttendant || []).map((a) => ({
                key: a.name,
                label: a.name,
                value: a.revenue,
                sub: `${a.orders} ${a.orders === 1 ? "pedido" : "pedidos"}`,
                extra: `Ticket médio ${formatCurrencyFull(a.averageTicket || 0)}`,
              }))}
            />
          </Panel>
        </div>

        <ReceivablesCard />
        <WeeklyInsightsCard />
      </div>
    </div>
  )
}
