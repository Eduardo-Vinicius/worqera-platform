"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Banknote,
  BarChart3,
  DollarSign,
  Download,
  Loader2,
  PiggyBank,
  RefreshCw,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  getMetricsFinanceiroService,
  type MetricsFinanceiro,
  type MetricsPeriodo,
} from "@/lib/apiService"
import { AppHeader } from "@/components/shell/AppHeader"
import { toast } from "sonner"

const PERIOD_OPTIONS: Array<{ value: MetricsPeriodo; label: string }> = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "15d", label: "15 dias" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
  { value: "180d", label: "180 dias" },
  { value: "1y", label: "1 ano" },
]

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0)

const formatDate = (value?: string) => {
  if (!value) return "-"
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-BR")
}

function exportFinanceCsv(data: MetricsFinanceiro) {
  const rows: string[][] = [
    ["seção", "campo", "valor"],
    ["resumo", "total_pedidos", String(data.resumo?.totalPedidos ?? 0)],
    ["resumo", "finalizados", String(data.resumo?.pedidosFinalizados ?? 0)],
    ["resumo", "em_aberto", String(data.resumo?.pedidosEmAberto ?? 0)],
    ["resumo", "receita_prevista", String(data.resumo?.receitaPrevista ?? 0)],
    ["resumo", "receita_recebida", String(data.resumo?.receitaRecebida ?? 0)],
    ["resumo", "receita_pendente", String(data.resumo?.receitaPendente ?? 0)],
    ["resumo", "ticket_medio", String(data.resumo?.ticketMedio ?? 0)],
  ]
  ;(data.topServicos || []).forEach((s) => {
    rows.push(["servico", s.servico, String(s.receita)])
  })
  ;(data.receitaPorStatus || []).forEach((s) => {
    rows.push(["status", s.status, String(s.receitaRecebida)])
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
  const [lastUpdated, setLastUpdated] = useState<string>("")

  const loadData = async (selectedPeriodo: MetricsPeriodo) => {
    try {
      setLoading(true)
      setError(null)
      const response = await getMetricsFinanceiroService({
        periodo: selectedPeriodo,
        limitServicos: 10,
      })
      setData(response)
      setLastUpdated(new Date().toISOString())
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

  const caixa = data?.caixaHoje
  const maxService = Math.max(...(data?.topServicos || []).map((s) => s.receita || 0), 1)

  const resumoCards = useMemo(() => {
    const resumo = data?.resumo
    if (!resumo) return []

    return [
      {
        title: "Receita prevista",
        value: formatCurrency(resumo.receitaPrevista),
        hint: `${resumo.totalPedidos} pedidos no período`,
        icon: DollarSign,
        tone: "text-[var(--wq-action)]",
      },
      {
        title: "Receita recebida",
        value: formatCurrency(resumo.receitaRecebida),
        hint: `${resumo.pedidosFinalizados} finalizados`,
        icon: PiggyBank,
        tone: "text-[var(--wq-brand)]",
      },
      {
        title: "A receber",
        value: formatCurrency(resumo.receitaPendente),
        hint: `${resumo.pedidosEmAberto} em aberto`,
        icon: Wallet,
        tone: "text-[var(--wq-warn)]",
      },
      {
        title: "Ticket médio",
        value: formatCurrency(resumo.ticketMedio),
        hint: `Margem ${resumo.margemPrevista?.toFixed(1) || "0"}% · despesas ${formatCurrency(resumo.despesas)}`,
        icon: TrendingUp,
        tone: "text-[var(--wq-ink)]",
      },
    ]
  }, [data])

  return (
    <div className="-mx-0">
      <AppHeader
        title="Financeiro"
        subtitle="Caixa do dia · receita · serviços"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {lastUpdated ? (
              <Badge variant="outline" className="border-[var(--wq-border)] text-[11px] text-[var(--wq-text-muted)]">
                {new Date(lastUpdated).toLocaleString("pt-BR")}
              </Badge>
            ) : null}
            <Button asChild variant="outline" size="sm" className="rounded-[10px] border-[var(--wq-border)]">
              <Link href="/admin/metrics">
                <BarChart3 className="mr-2 h-4 w-4" />
                Métricas
              </Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-[10px] border-[var(--wq-border)]"
              disabled={!data}
              onClick={() => {
                if (!data) return
                exportFinanceCsv(data)
                toast.success("CSV baixado")
              }}
            >
              <Download className="mr-1.5 h-4 w-4" />
              CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-[10px] border-[var(--wq-border)]"
              onClick={() => loadData(periodo)}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        }
      />

      <div className="space-y-6 px-5 py-6 md:px-8">
        {/* Caixa de hoje — sempre visível */}
        <section className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
          <div className="flex flex-col gap-1 border-b border-[var(--wq-border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--wq-brand)_10%,var(--wq-surface)),var(--wq-surface)_60%)] px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--wq-text-muted)]">
                Caixa de hoje
              </p>
              <h2 className="text-lg font-semibold text-[var(--wq-text)]">
                {formatDate(caixa?.data)} · entrada {formatCurrency(caixa?.entradaHoje || 0)}
              </h2>
            </div>
            <Button asChild size="sm" className="rounded-[10px] bg-[var(--wq-brand)] text-white">
              <Link href="/kanban">Abrir kanban →</Link>
            </Button>
          </div>
          <div className="grid gap-px bg-[var(--wq-border)] sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Entregue hoje",
                value: formatCurrency(caixa?.entregueHoje || 0),
                hint: `${caixa?.entreguesCount || 0} pedido(s)`,
                icon: Banknote,
              },
              {
                label: "Sinais de hoje",
                value: formatCurrency(caixa?.sinaisHoje || 0),
                hint: `${caixa?.sinaisCount || 0} entrada(s)`,
                icon: Receipt,
              },
              {
                label: "A receber (prontos)",
                value: formatCurrency(caixa?.aReceberProntos || 0),
                hint: `${caixa?.prontosCount || 0} pronto(s) p/ retirada`,
                icon: Wallet,
              },
              {
                label: "Pendente na fila",
                value: formatCurrency(caixa?.aReceberAbertos || 0),
                hint: `${caixa?.abertosCount || 0} aberto(s)`,
                icon: DollarSign,
              },
            ].map((card) => {
              const Icon = card.icon
              return (
                <div key={card.label} className="bg-[var(--wq-surface)] px-5 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">
                        {card.label}
                      </p>
                      <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--wq-text)]">
                        {card.value}
                      </p>
                      <p className="mt-1 text-xs text-[var(--wq-text-muted)]">{card.hint}</p>
                    </div>
                    <Icon className="mt-0.5 h-4 w-4 text-[var(--wq-brand)]" strokeWidth={1.75} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-[var(--wq-text-muted)]">Período analisado</p>
            <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--wq-text)]">
              {formatDate(data?.periodo?.inicio)} até {formatDate(data?.periodo?.fim)}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((option) => {
              const active = periodo === option.value
              return (
                <Button
                  key={option.value}
                  size="sm"
                  variant={active ? "default" : "outline"}
                  className={
                    active
                      ? "rounded-[10px] border-transparent bg-[var(--wq-action)] text-white hover:bg-[var(--wq-action)]/90"
                      : "rounded-[10px] border-[var(--wq-border)] bg-[var(--wq-surface)] text-[var(--wq-text)] hover:bg-[var(--wq-paper)]"
                  }
                  onClick={() => setPeriodo(option.value)}
                >
                  {option.label}
                </Button>
              )
            })}
          </div>
        </section>

        {error ? (
          <Alert className="border-[var(--wq-danger)]/30 bg-[var(--wq-danger)]/5">
            <AlertDescription className="text-[var(--wq-danger)]">{error}</AlertDescription>
          </Alert>
        ) : null}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {resumoCards.map((card) => {
            const Icon = card.icon
            return (
              <div key={card.title} className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] uppercase tracking-[0.14em] text-[var(--wq-text-muted)]">
                    {card.title}
                  </span>
                  <Icon className={`h-4 w-4 ${card.tone}`} strokeWidth={1.7} />
                </div>
                <p className="mt-3 font-[family-name:var(--font-display)] text-[28px] leading-none text-[var(--wq-text)]">
                  {loading && !data ? "…" : card.value}
                </p>
                <p className="mt-2 text-xs text-[var(--wq-text-muted)]">{card.hint}</p>
              </div>
            )
          })}
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className="rounded-2xl border-[var(--wq-border)] bg-[var(--wq-surface)] shadow-none xl:col-span-2">
            <CardHeader>
              <CardTitle className="font-[family-name:var(--font-display)] text-[var(--wq-text)]">
                Evolução diária
              </CardTitle>
              <CardDescription className="text-[var(--wq-text-muted)]">
                Pedidos criados · previsto vs recebido
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(data?.evolucaoDiaria || []).length === 0 && (
                  <p className="text-sm text-[var(--wq-text-muted)]">Sem dados para o período.</p>
                )}
                {(data?.evolucaoDiaria || [])
                  .slice()
                  .reverse()
                  .slice(0, 14)
                  .map((item) => {
                    const maxValue = Math.max(item.receitaPrevista || 0, item.receitaRecebida || 0, 1)
                    const receivedPct = Math.min((item.receitaRecebida / maxValue) * 100, 100)
                    const forecastPct = Math.min((item.receitaPrevista / maxValue) * 100, 100)
                    return (
                      <div
                        key={item.data}
                        className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-paper)]/60 p-4"
                      >
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-medium text-[var(--wq-text)]">{formatDate(item.data)}</p>
                            <p className="text-xs text-[var(--wq-text-muted)]">{item.pedidos} pedido(s)</p>
                          </div>
                          <div className="text-right text-sm">
                            <p className="text-[var(--wq-action)]">Recebido {formatCurrency(item.receitaRecebida)}</p>
                            <p className="text-[var(--wq-brand)]">Previsto {formatCurrency(item.receitaPrevista)}</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="h-2 overflow-hidden rounded-full bg-[var(--wq-surface)]">
                            <div
                              className="h-full rounded-full bg-[var(--wq-action)]"
                              style={{ width: `${receivedPct}%` }}
                            />
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--wq-surface)]">
                            <div
                              className="h-full rounded-full bg-[var(--wq-brand)]/70"
                              style={{ width: `${forecastPct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[var(--wq-border)] bg-[var(--wq-surface)] shadow-none">
            <CardHeader>
              <CardTitle className="font-[family-name:var(--font-display)] text-[var(--wq-text)]">
                Top serviços
              </CardTitle>
              <CardDescription className="text-[var(--wq-text-muted)]">
                Por receita no período (inclui multi-par)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(data?.topServicos || []).map((item) => (
                <div key={item.servico} className="space-y-1.5">
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
                  <p className="text-[11px] text-[var(--wq-text-muted)]">{item.pedidos}× no período</p>
                </div>
              ))}
              {(data?.topServicos || []).length === 0 && (
                <p className="text-sm text-[var(--wq-text-muted)]">Sem dados.</p>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card className="rounded-2xl border-[var(--wq-border)] bg-[var(--wq-surface)] shadow-none">
            <CardHeader>
              <CardTitle className="font-[family-name:var(--font-display)] text-[var(--wq-text)]">
                Receita por status
              </CardTitle>
              <CardDescription className="text-[var(--wq-text-muted)]">
                Quanto cada etapa concentra de valor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--wq-border)] text-left text-[11px] uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">
                      <th className="pb-3 pr-4 font-medium">Status</th>
                      <th className="pb-3 pr-4 font-medium">Pedidos</th>
                      <th className="pb-3 pr-4 font-medium">Prevista</th>
                      <th className="pb-3 font-medium">Recebida</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.receitaPorStatus || []).map((item) => (
                      <tr key={item.status} className="border-b border-[var(--wq-border)] text-[var(--wq-text)]">
                        <td className="py-3 pr-4">{item.status}</td>
                        <td className="py-3 pr-4">{item.pedidos}</td>
                        <td className="py-3 pr-4 text-[var(--wq-brand)]">{formatCurrency(item.receitaPrevista)}</td>
                        <td className="py-3 text-[var(--wq-action)]">{formatCurrency(item.receitaRecebida)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(data?.receitaPorStatus || []).length === 0 && (
                  <p className="text-sm text-[var(--wq-text-muted)]">Sem dados.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[var(--wq-border)] bg-[var(--wq-surface)] shadow-none">
            <CardHeader>
              <CardTitle className="font-[family-name:var(--font-display)] text-[var(--wq-text)]">
                Lucro do período
              </CardTitle>
              <CardDescription className="text-[var(--wq-text-muted)]">
                Previsto vs realizado (despesas manuais no pedido)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                ["Lucro previsto", formatCurrency(data?.resumo?.lucroPrevisto || 0)],
                ["Lucro realizado", formatCurrency(data?.resumo?.lucroRealizado || 0)],
                ["Despesas", formatCurrency(data?.resumo?.despesas || 0)],
                ["Margem prevista", `${data?.resumo?.margemPrevista?.toFixed(2) || "0.00"}%`],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="flex items-center justify-between rounded-xl border border-[var(--wq-border)] bg-[var(--wq-paper)]/50 px-3 py-2 text-sm"
                >
                  <span className="text-[var(--wq-text-muted)]">{label}</span>
                  <span className="font-semibold text-[var(--wq-text)]">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
