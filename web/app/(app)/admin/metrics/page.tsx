"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  Award,
  BarChart3,
  Clock,
  DollarSign,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  getMetricsAtrasosService,
  getMetricsDepartamentosService,
  getMetricsFinanceiroService,
  getMetricsFuncionariosDesempenhoService,
  getMetricsFuncionariosService,
  getMetricsOverviewService,
  getMetricsResumoService,
  type MetricsAtrasos,
  type MetricsDepartamento,
  type MetricsFinanceiro,
  type MetricsFuncionario,
  type MetricsFuncionariosDesempenho,
  type MetricsFuncionariosMaisRapidos,
  type MetricsFuncionariosPedidos,
  type MetricsPeriodo,
  type MetricsResumo,
} from "@/lib/apiService"
import { AppHeader } from "@/components/shell/AppHeader"
import { AttendanceCard } from "@/components/metrics/AttendanceCard"

const PERIOD_OPTIONS: Array<{ value: MetricsPeriodo; label: string }> = [
  { value: "7d", label: "7 dias" },
  { value: "15d", label: "15 dias" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
  { value: "180d", label: "180 dias" },
  { value: "1y", label: "1 ano" },
]

const formatPct = (value: number) => `${value.toFixed(1)}%`

const formatDuration = (ms?: number) => {
  if (!ms || ms <= 0) return "0h"
  const hours = ms / (1000 * 60 * 60)
  if (hours < 24) return `${hours.toFixed(1)}h`
  return `${(hours / 24).toFixed(1)}d`
}

const formatCurrency = (value: number) => new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
}).format(value || 0)

type MetricsState = {
  resumo: MetricsResumo | null
  departamentos: MetricsDepartamento[]
  atrasos: MetricsAtrasos | null
  financeiro: MetricsFinanceiro | null
  desempenho: MetricsFuncionariosDesempenho | null
  funcionariosLegacy: MetricsFuncionario[]
}

const initialState: MetricsState = {
  resumo: null,
  departamentos: [],
  atrasos: null,
  financeiro: null,
  desempenho: null,
  funcionariosLegacy: [],
}

export default function AdminMetricsPage() {
  const [periodo, setPeriodo] = useState<MetricsPeriodo>("30d")
  const [data, setData] = useState<MetricsState>(initialState)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>("")

  const loadData = async (selectedPeriodo: MetricsPeriodo) => {
    try {
      setLoading(true)
      setError(null)

      try {
        const [overview, departamentos] = await Promise.all([
          getMetricsOverviewService({ periodo: selectedPeriodo, limit: 5, limitServicos: 6 }),
          getMetricsDepartamentosService({ periodo: selectedPeriodo }),
        ])

        setData({
          resumo: overview?.resumo || null,
          departamentos,
          atrasos: overview?.atrasos || null,
          financeiro: overview?.financeiro || null,
          desempenho: overview?.funcionarios || null,
          funcionariosLegacy: [],
        })
      } catch {
        const [resumoResult, departamentosResult, atrasosResult, desempenhoResult, financeiroResult, legacyFuncionarios] = await Promise.allSettled([
          getMetricsResumoService({ periodo: selectedPeriodo }),
          getMetricsDepartamentosService({ periodo: selectedPeriodo }),
          getMetricsAtrasosService({ periodo: selectedPeriodo }),
          getMetricsFuncionariosDesempenhoService({ periodo: selectedPeriodo, limit: 5 }),
          getMetricsFinanceiroService({ periodo: selectedPeriodo, limitServicos: 6 }),
          getMetricsFuncionariosService({ periodo: selectedPeriodo, limit: 5 }),
        ])

        setData({
          resumo: resumoResult.status === "fulfilled" ? resumoResult.value : null,
          departamentos: departamentosResult.status === "fulfilled" ? departamentosResult.value : [],
          atrasos: atrasosResult.status === "fulfilled" ? atrasosResult.value : null,
          desempenho: desempenhoResult.status === "fulfilled" ? desempenhoResult.value : null,
          financeiro: financeiroResult.status === "fulfilled" ? financeiroResult.value : null,
          funcionariosLegacy: legacyFuncionarios.status === "fulfilled" ? legacyFuncionarios.value : [],
        })
      }

      setLastUpdated(new Date().toISOString())
    } catch (err: any) {
      setError(err?.message || "Falha ao carregar métricas")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData(periodo)
  }, [periodo])

  const setoresList = useMemo(() => {
    return [...data.departamentos].sort((a, b) => b.total - a.total)
  }, [data.departamentos])

  const derived = useMemo(() => {
    const total = data.resumo?.total ?? 0
    const atrasados = data.atrasos?.totalAtrasados ?? data.resumo?.atrasados ?? 0
    const finalizados = data.resumo?.finalizados ?? 0
    const abertos = data.resumo?.abertos ?? 0
    const noPrazo = data.resumo?.noPrazo ?? Math.max(total - atrasados, 0)
    const taxaAtraso = data.resumo?.taxaAtraso ?? (total > 0 ? (atrasados / total) * 100 : 0)
    const onTimePct = total > 0 ? (noPrazo / total) * 100 : 0
    return {
      total,
      atrasados,
      finalizados,
      abertos,
      noPrazo,
      taxaAtraso,
      onTimePct,
      atrasoMedioMs: data.atrasos?.atrasoMedioMs || ((data.atrasos?.atrasoMedioHoras || 0) * 60 * 60 * 1000),
    }
  }, [data])

  const rankingProdutividade = useMemo<MetricsFuncionariosPedidos[]>(() => {
    if (data.desempenho?.topFuncionariosPorPedidos?.length) {
      return data.desempenho.topFuncionariosPorPedidos
    }

    return data.funcionariosLegacy.map((item) => ({
      funcionarioNome: item.funcionarioNome,
      pedidosComParticipacao: item.total,
      pedidosFinalizados: 0,
    }))
  }, [data.desempenho, data.funcionariosLegacy])

  const rankingVelocidade = useMemo<MetricsFuncionariosMaisRapidos[]>(() => {
    return data.desempenho?.topFuncionariosMaisRapidos || []
  }, [data.desempenho])

  const STATUS: Record<string, string> = {
    received: "Recebido",
    in_progress: "Em produção",
    ready: "Pronto",
    delivered: "Entregue",
    cancelled: "Cancelado",
  }
  const fin = data.financeiro?.resumo
  const periodLabel = PERIOD_OPTIONS.find((o) => o.value === periodo)?.label.toLowerCase() || periodo
  const kpis = [
    { title: "Pedidos", value: String(derived.total), hint: `${derived.abertos} em aberto · ${derived.finalizados} finalizados`, icon: BarChart3 },
    { title: "Entregues no prazo", value: formatPct(derived.onTimePct), hint: `${derived.noPrazo} de ${derived.total} pedidos`, icon: Award },
    { title: "Atrasados", value: String(derived.atrasados), hint: derived.atrasados ? `atraso médio ${formatDuration(derived.atrasoMedioMs)}` : "nenhum agora", icon: AlertTriangle, warn: derived.atrasados > 0 },
    { title: "Recebido", value: formatCurrency(fin?.receitaRecebida || 0), hint: `ticket médio ${formatCurrency(fin?.ticketMedio || 0)}`, icon: DollarSign },
  ]
  const late = data.atrasos?.itens || []

  return (
    <div className="-mx-0">
      <AppHeader group="relatorios"
        title="Métricas"
        subtitle="Como a loja foi no período"
        actions={
          <Button
            variant="outline"
            size="sm"
            className="rounded-[10px] border-[var(--wq-border)]"
            onClick={() => loadData(periodo)}
            disabled={loading}
            aria-label="Atualizar"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        }
      />

      <div className="space-y-6 px-5 py-6 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[var(--wq-text-muted)]">
            Últimos {periodLabel}
            {lastUpdated ? ` · atualizado às ${new Date(lastUpdated).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPeriodo(option.value)}
                className={
                  periodo === option.value
                    ? "rounded-full bg-[var(--wq-action)] px-3 py-1 text-xs font-semibold text-white"
                    : "rounded-full border border-[var(--wq-border)] bg-[var(--wq-surface)] px-3 py-1 text-xs font-semibold text-[var(--wq-text)] hover:bg-[var(--wq-paper)]"
                }
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <Alert className="border-[var(--wq-danger)]/30 bg-[var(--wq-danger)]/5">
            <AlertTriangle className="h-4 w-4 text-[var(--wq-danger)]" />
            <AlertDescription className="text-[var(--wq-danger)]">{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((card) => {
            const Icon = card.icon
            return (
              <div
                key={card.title}
                className={`rounded-2xl border bg-[var(--wq-surface)] p-5 ${card.warn ? "border-[var(--wq-warn)]/40" : "border-[var(--wq-border)]"}`}
              >
                <div className="flex items-center justify-between text-sm text-[var(--wq-text-muted)]">
                  <span>{card.title}</span>
                  <Icon className={`h-4 w-4 ${card.warn ? "text-[var(--wq-warn)]" : ""}`} strokeWidth={1.7} />
                </div>
                <p className="mt-2 font-[family-name:var(--font-display)] text-3xl leading-none text-[var(--wq-text)] tabular-nums">{card.value}</p>
                <p className="mt-2 text-xs text-[var(--wq-text-muted)]">{card.hint}</p>
              </div>
            )
          })}
        </div>

        {late.length > 0 && (
          <Card className="rounded-2xl border-[var(--wq-warn)]/40 bg-[var(--wq-surface)] shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-[var(--wq-text)]">
                <Clock className="h-4 w-4 text-[var(--wq-warn)]" />
                Atrasados para resolver
              </CardTitle>
              <CardDescription>Os que passaram do prazo, do mais atrasado para o menos</CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-[var(--wq-border)] p-0">
              {late.slice(0, 10).map((order) => {
                const atrasoMs = order.diasAtraso
                  ? order.diasAtraso * 24 * 60 * 60 * 1000
                  : Date.now() - new Date(order.dataPrevistaEntrega).getTime()
                return (
                  <Link
                    key={order.id}
                    href={`/pedidos/${order.id}`}
                    className="flex items-center justify-between gap-3 px-6 py-3 text-sm hover:bg-[var(--wq-paper)]"
                  >
                    <span className="min-w-0">
                      <span className="font-semibold text-[var(--wq-text)]">#{order.codigo || order.id}</span>
                      <span className="ml-2 text-xs text-[var(--wq-text-muted)]">
                        {STATUS[order.status] || order.status}
                        {order.funcionarioAtual ? ` · ${order.funcionarioAtual}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-xs text-[var(--wq-text-muted)]">
                      <Badge className="border-0 bg-[var(--wq-danger)]/10 text-[var(--wq-danger)]">{formatDuration(atrasoMs)} de atraso</Badge>
                      <span className="ml-2 hidden sm:inline">prazo {new Date(order.dataPrevistaEntrega).toLocaleDateString("pt-BR")}</span>
                    </span>
                  </Link>
                )
              })}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="rounded-2xl border-[var(--wq-border)] bg-[var(--wq-surface)] shadow-none lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base text-[var(--wq-text)]">Onde estão os pedidos</CardTitle>
              <CardDescription>Pedidos do período por setor</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {setoresList.length === 0 && <p className="text-sm text-[var(--wq-text-muted)]">Sem pedidos no período.</p>}
              {setoresList.map((item) => {
                const pct = derived.total ? (item.total / derived.total) * 100 : 0
                return (
                  <div key={item.setorId || item.setorNome || "setor"} className="space-y-1.5">
                    <div className="flex justify-between text-sm text-[var(--wq-text)]">
                      <span className="font-medium">{item.setorNome || item.setorId}</span>
                      <span className="tabular-nums text-[var(--wq-text-muted)]">{item.total}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--wq-paper)]">
                      <div className="h-full rounded-full bg-[var(--wq-brand)]" style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[var(--wq-border)] bg-[var(--wq-surface)] shadow-none">
            <CardHeader>
              <CardTitle className="text-base text-[var(--wq-text)]">Dinheiro</CardTitle>
              <CardDescription>Dos pedidos do período</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                ["A receber", formatCurrency(fin?.receitaPendente || 0)],
                ["Previsto no total", formatCurrency(fin?.receitaPrevista || 0)],
                ["Despesas", formatCurrency(fin?.despesas || 0)],
                ["Lucro", formatCurrency(fin?.lucroRealizado || 0)],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--wq-text-muted)]">{label}</span>
                  <span className="font-semibold tabular-nums text-[var(--wq-text)]">{value}</span>
                </div>
              ))}
              <Button asChild variant="outline" className="mt-3 w-full rounded-[10px] border-[var(--wq-border)]">
                <Link href="/admin/financeiro">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Abrir financeiro
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card className="rounded-2xl border-[var(--wq-border)] bg-[var(--wq-surface)] shadow-none">
            <CardHeader>
              <CardTitle className="text-base text-[var(--wq-text)]">Quem mais trabalhou nos pedidos</CardTitle>
              <CardDescription>Pedidos em que a pessoa participou</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {rankingProdutividade.length === 0 && <p className="text-sm text-[var(--wq-text-muted)]">Sem dados no período.</p>}
              {rankingProdutividade.map((item, idx) => (
                <div key={`${item.funcionarioNome}-${idx}`} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-3">
                    <span className="w-5 text-right text-xs tabular-nums text-[var(--wq-text-muted)]">{idx + 1}º</span>
                    <span>
                      <span className="font-medium text-[var(--wq-text)]">{item.funcionarioNome}</span>
                      <span className="ml-2 text-xs text-[var(--wq-text-muted)]">{item.pedidosFinalizados} finalizados</span>
                    </span>
                  </span>
                  <span className="font-semibold tabular-nums">{item.pedidosComParticipacao}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[var(--wq-border)] bg-[var(--wq-surface)] shadow-none">
            <CardHeader>
              <CardTitle className="text-base text-[var(--wq-text)]">Quem é mais rápido</CardTitle>
              <CardDescription>Tempo médio para concluir uma etapa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {rankingVelocidade.length === 0 && <p className="text-sm text-[var(--wq-text-muted)]">Sem etapas concluídas no período.</p>}
              {rankingVelocidade.map((item, idx) => (
                <div key={`${item.funcionarioNome}-${idx}`} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-3">
                    <span className="w-5 text-right text-xs tabular-nums text-[var(--wq-text-muted)]">{idx + 1}º</span>
                    <span>
                      <span className="font-medium text-[var(--wq-text)]">{item.funcionarioNome}</span>
                      <span className="ml-2 text-xs text-[var(--wq-text-muted)]">{item.etapasConcluidas} etapas</span>
                    </span>
                  </span>
                  <span className="font-semibold tabular-nums">{formatDuration(item.tempoMedioMs)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <AttendanceCard periodo={periodo} />
      </div>
    </div>
  )
}
