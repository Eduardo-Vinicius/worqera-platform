"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Download,
  ExternalLink,
  Loader2,
  RefreshCw,
  Layers,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  getMetricsDepartamentosService,
  getMetricsFinanceiroService,
  type MetricsDepartamento,
  type MetricsFinanceiro,
  type MetricsPeriodo,
} from "@/lib/apiService"
import { AppHeader } from "@/components/shell/AppHeader"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

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
  const [sectors, setSectors] = useState<MetricsDepartamento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async (selectedPeriodo: MetricsPeriodo) => {
    try {
      setLoading(true)
      setError(null)
      const [finance, deps] = await Promise.all([
        getMetricsFinanceiroService({ periodo: selectedPeriodo, limitServicos: 8 }),
        getMetricsDepartamentosService({ periodo: selectedPeriodo }).catch(() => []),
      ])
      setData(finance)
      setSectors(Array.isArray(deps) ? deps : [])
    } catch (err: any) {
      setError(err?.message || "Falha ao carregar financeiro")
      setData(null)
      setSectors([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData(periodo)
  }, [periodo])

  const resumo = data?.resumo
  const caixa = data?.caixaHoje
  const liquido = resumo?.lucroRealizado ?? 0
  const bruto = resumo?.receitaRecebida ?? 0
  const brutoPrevisto = resumo?.receitaPrevista ?? 0
  const vendidos = resumo?.pedidosFinalizados ?? 0
  const maxService = Math.max(...(data?.topServicos || []).map((s) => s.receita || 0), 1)
  const maxSector = Math.max(...sectors.map((s) => Number(s.total) || 0), 1)

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

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
            <div className="flex items-center justify-between border-b border-[var(--wq-border)] px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-[var(--wq-text)]">Setores (fila aberta)</h2>
                <p className="text-[11px] text-[var(--wq-text-muted)]">Pedidos em andamento por coluna</p>
              </div>
              <Link href="/kanban" className="inline-flex items-center text-xs font-semibold text-[var(--wq-brand)]">
                Kanban <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </div>
            <ul className="max-h-[320px] space-y-3 overflow-y-auto px-4 py-3">
              {sectors.length === 0 && (
                <li className="flex items-center gap-2 py-6 text-sm text-[var(--wq-text-muted)]">
                  <Layers className="h-4 w-4" />
                  Sem fila aberta no período.
                </li>
              )}
              {sectors.map((s) => {
                const name = s.setorNome || (s as any).name || "Setor"
                const total = Number(s.total) || 0
                return (
                  <li key={String(s.setorId || name)} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate font-medium text-[var(--wq-text)]">{name}</span>
                      <span className="font-mono text-[var(--wq-brand)]">{total}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--wq-paper)]">
                      <div
                        className="h-full rounded-full bg-[var(--wq-brand)]"
                        style={{ width: `${Math.round((total / maxSector) * 100)}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
            <div className="border-b border-[var(--wq-border)] px-4 py-3">
              <h2 className="text-sm font-semibold text-[var(--wq-text)]">Top serviços</h2>
              <p className="text-[11px] text-[var(--wq-text-muted)]">Receita bruta no período</p>
            </div>
            <ul className="max-h-[320px] space-y-3 overflow-y-auto px-4 py-3">
              {(data?.topServicos || []).length === 0 && (
                <li className="py-6 text-sm text-[var(--wq-text-muted)]">Sem serviços no período.</li>
              )}
              {(data?.topServicos || []).map((item) => (
                <li key={item.servico} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium text-[var(--wq-text)]">{item.servico}</span>
                    <span className="shrink-0 font-mono text-[var(--wq-brand)]">
                      {formatCurrency(item.receita)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--wq-paper)]">
                    <div
                      className="h-full rounded-full bg-[var(--wq-brand)]"
                      style={{ width: `${Math.round((item.receita / maxService) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-[var(--wq-text-muted)]">{item.pedidos}×</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
          <div className="border-b border-[var(--wq-border)] px-4 py-3">
            <h2 className="text-sm font-semibold text-[var(--wq-text)]">Últimos dias</h2>
            <p className="text-[11px] text-[var(--wq-text-muted)]">Recebido vs previsto</p>
          </div>
          <div className="divide-y divide-[var(--wq-border)]">
            {(data?.evolucaoDiaria || []).length === 0 && (
              <p className="px-4 py-6 text-sm text-[var(--wq-text-muted)]">Sem evolução no período.</p>
            )}
            {(data?.evolucaoDiaria || [])
              .slice()
              .reverse()
              .slice(0, 10)
              .map((item) => {
                const maxValue = Math.max(item.receitaPrevista || 0, item.receitaRecebida || 0, 1)
                const receivedPct = Math.min(((item.receitaRecebida || 0) / maxValue) * 100, 100)
                const day = item.data
                  ? new Date(`${item.data}T12:00:00`).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    })
                  : "—"
                return (
                  <div key={item.data} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-16 shrink-0 text-sm font-medium text-[var(--wq-text)]">{day}</div>
                    <div className="min-w-0 flex-1">
                      <div className="h-2 overflow-hidden rounded-full bg-[var(--wq-paper)]">
                        <div
                          className="h-full rounded-full bg-[var(--wq-action)]"
                          style={{ width: `${receivedPct}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-[var(--wq-text-muted)]">
                        {item.pedidos} pedido(s) · previsto {formatCurrency(item.receitaPrevista || 0)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-sm font-semibold tabular-nums text-[var(--wq-text)]">
                      {formatCurrency(item.receitaRecebida || 0)}
                    </div>
                  </div>
                )
              })}
          </div>
        </section>
      </div>
    </div>
  )
}
