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
  TrendingUp,
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

  const kpiCards = [
    { title: "Total pedidos", value: derived.total, hint: "No período", icon: BarChart3, tone: "text-[var(--wq-brand)]" },
    { title: "Em aberto", value: derived.abertos, hint: "Fluxo ativo", icon: TrendingUp, tone: "text-[var(--wq-action)]" },
    { title: "Finalizados", value: derived.finalizados, hint: "Concluídos", icon: Award, tone: "text-[var(--wq-ink)]" },
    { title: "Em atraso", value: derived.atrasados, hint: "Atenção imediata", icon: AlertTriangle, tone: "text-[var(--wq-warn)]" },
    { title: "Taxa de atraso", value: formatPct(derived.taxaAtraso), hint: "Sobre o total", icon: Clock, tone: "text-[var(--wq-danger)]" },
  ]

  return (
    <div className="-mx-0">
      <AppHeader
        title="Métricas"
        subtitle="Operação, SLA e produtividade"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {lastUpdated && (
              <Badge variant="outline" className="border-[var(--wq-border)] text-[11px] text-[var(--wq-text-muted)]">
                {new Date(lastUpdated).toLocaleString("pt-BR")}
              </Badge>
            )}
            <Button asChild variant="outline" size="sm" className="rounded-[10px] border-[var(--wq-border)]">
              <Link href="/admin/financeiro">
                <DollarSign className="mr-2 h-4 w-4" />
                Financeiro
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-[10px] border-[var(--wq-border)]"
              onClick={() => loadData(periodo)}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        }
      />

      <div className="space-y-8 px-5 py-6 md:px-8">
        <section className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-[var(--wq-text-muted)]">Período da análise</p>
            <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--wq-text)]">
              {data.resumo?.periodo?.referencia || periodo}
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
                      : "rounded-[10px] border-[var(--wq-border)] bg-white text-[var(--wq-text)] hover:bg-[var(--wq-paper)]"
                  }
                  onClick={() => setPeriodo(option.value)}
                >
                  {option.label}
                </Button>
              )
            })}
          </div>
        </section>

        {error && (
          <Alert className="border-[var(--wq-danger)]/30 bg-[var(--wq-danger)]/5">
            <AlertTriangle className="h-4 w-4 text-[var(--wq-danger)]" />
            <AlertDescription className="text-[var(--wq-danger)]">{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {kpiCards.map((card) => {
            const Icon = card.icon
            return (
              <div
                key={card.title}
                className="rounded-2xl border border-[var(--wq-border)] bg-white p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[12px] uppercase tracking-[0.14em] text-[var(--wq-text-muted)]">
                    {card.title}
                  </span>
                  <Icon className={`h-4 w-4 ${card.tone}`} strokeWidth={1.7} />
                </div>
                <p className="mt-3 font-[family-name:var(--font-display)] text-[32px] leading-none text-[var(--wq-text)]">
                  {card.value}
                </p>
                <p className="mt-2 text-xs text-[var(--wq-text-muted)]">{card.hint}</p>
              </div>
            )
          })}
        </div>

        <Card className="rounded-2xl border-[var(--wq-border)] bg-white shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="font-[family-name:var(--font-display)] text-[var(--wq-text)]">
              Leitura executiva
            </CardTitle>
            <CardDescription className="text-[var(--wq-text-muted)]">
              SLA, prazo, atraso médio e pulso financeiro
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-[var(--wq-border)] bg-[var(--wq-paper)]/50 p-4">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">No prazo</p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[var(--wq-text)]">
                {derived.noPrazo}
              </p>
              <p className="mt-1 text-[11px] text-[var(--wq-text-muted)]">Pedidos dentro do SLA</p>
            </div>
            <div className="rounded-xl border border-[var(--wq-border)] bg-[var(--wq-paper)]/50 p-4">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">On-time</p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[var(--wq-action)]">
                {formatPct(derived.onTimePct)}
              </p>
              <p className="mt-1 text-[11px] text-[var(--wq-text-muted)]">Taxa de entregas no prazo</p>
            </div>
            <div className="rounded-xl border border-[var(--wq-border)] bg-[var(--wq-paper)]/50 p-4">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">Atraso médio</p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[var(--wq-warn)]">
                {formatDuration(derived.atrasoMedioMs)}
              </p>
              <p className="mt-1 text-[11px] text-[var(--wq-text-muted)]">Média dos pedidos atrasados</p>
            </div>
            <div className="rounded-xl border border-[var(--wq-border)] bg-[var(--wq-paper)]/50 p-4">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">Receita recebida</p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[var(--wq-brand)]">
                {formatCurrency(data.financeiro?.resumo?.receitaRecebida || 0)}
              </p>
              <p className="mt-1 text-[11px] text-[var(--wq-text-muted)]">Resumo financeiro do período</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="rounded-2xl border-[var(--wq-border)] bg-white shadow-none lg:col-span-2">
            <CardHeader>
              <CardTitle className="font-[family-name:var(--font-display)] text-[var(--wq-text)]">
                Pedidos por departamento
              </CardTitle>
              <CardDescription className="text-[var(--wq-text-muted)]">
                Distribuição atual por setor
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {setoresList.length === 0 && (
                <p className="text-sm text-[var(--wq-text-muted)]">Sem dados.</p>
              )}
              {setoresList.map((item) => {
                const pct = derived.total ? (item.total / derived.total) * 100 : 0
                return (
                  <div key={item.setorId || item.setorNome || "setor"} className="space-y-2">
                    <div className="flex justify-between text-sm text-[var(--wq-text)]">
                      <span className="font-medium">{item.setorNome || item.setorId}</span>
                      <span className="text-[var(--wq-text-muted)]">
                        {item.total} • {formatPct(pct)}
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-[var(--wq-paper)]">
                      <div
                        className="h-full rounded-full bg-[var(--wq-brand)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[var(--wq-border)] bg-white shadow-none">
            <CardHeader>
              <CardTitle className="font-[family-name:var(--font-display)] text-[var(--wq-text)]">
                Pulso financeiro
              </CardTitle>
              <CardDescription className="text-[var(--wq-text-muted)]">
                Indicadores resumidos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                ["Receita prevista", formatCurrency(data.financeiro?.resumo?.receitaPrevista || 0)],
                ["Receita pendente", formatCurrency(data.financeiro?.resumo?.receitaPendente || 0)],
                ["Despesas", formatCurrency(data.financeiro?.resumo?.despesas || 0)],
                ["Lucro realizado", formatCurrency(data.financeiro?.resumo?.lucroRealizado || 0)],
                ["Ticket médio", formatCurrency(data.financeiro?.resumo?.ticketMedio || 0)],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="flex items-center justify-between rounded-xl border border-[var(--wq-border)] bg-[var(--wq-paper)]/50 px-3 py-2 text-sm"
                >
                  <span className="text-[var(--wq-text-muted)]">{label}</span>
                  <span className="font-semibold text-[var(--wq-text)]">{value}</span>
                </div>
              ))}
              <Link href="/admin/financeiro" className="block pt-2">
                <Button className="w-full rounded-[10px] bg-[var(--wq-action)] text-white hover:bg-[var(--wq-action)]/90">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Abrir financeiro
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card className="rounded-2xl border-[var(--wq-border)] bg-white shadow-none">
            <CardHeader>
              <CardTitle className="font-[family-name:var(--font-display)] text-[var(--wq-text)]">
                Top funcionários por pedidos
              </CardTitle>
              <CardDescription className="text-[var(--wq-text-muted)]">
                Participação e pedidos finalizados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {rankingProdutividade.length === 0 && (
                <p className="text-sm text-[var(--wq-text-muted)]">Sem dados.</p>
              )}
              {rankingProdutividade.map((item, idx) => (
                <div
                  key={`${item.funcionarioNome}-${idx}`}
                  className="flex items-center justify-between rounded-xl border border-[var(--wq-border)] bg-[var(--wq-paper)]/50 px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--wq-border)] bg-white text-xs font-semibold text-[var(--wq-text-muted)]">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium text-[var(--wq-text)]">{item.funcionarioNome}</p>
                      <p className="text-[11px] text-[var(--wq-text-muted)]">
                        {item.pedidosFinalizados} finalizados
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-[var(--wq-action)]/30 bg-[var(--wq-action)]/10 text-[var(--wq-action)]"
                  >
                    {item.pedidosComParticipacao}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[var(--wq-border)] bg-white shadow-none">
            <CardHeader>
              <CardTitle className="font-[family-name:var(--font-display)] text-[var(--wq-text)]">
                Top funcionários mais rápidos
              </CardTitle>
              <CardDescription className="text-[var(--wq-text-muted)]">
                Tempo médio por etapa concluída
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {rankingVelocidade.length === 0 && (
                <div className="rounded-xl border border-dashed border-[var(--wq-border)] bg-[var(--wq-paper)]/40 p-4 text-sm text-[var(--wq-text-muted)]">
                  Ranking de velocidade indisponível para o período selecionado.
                </div>
              )}
              {rankingVelocidade.map((item, idx) => (
                <div
                  key={`${item.funcionarioNome}-${idx}`}
                  className="flex items-center justify-between rounded-xl border border-[var(--wq-border)] bg-[var(--wq-paper)]/50 px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--wq-border)] bg-white text-xs font-semibold text-[var(--wq-text-muted)]">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium text-[var(--wq-text)]">{item.funcionarioNome}</p>
                      <p className="text-[11px] text-[var(--wq-text-muted)]">
                        {item.etapasConcluidas} etapas • {item.pedidosComTempo} pedidos
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant="outline"
                      className="border-[var(--wq-brand)]/30 bg-[var(--wq-brand-soft)] text-[var(--wq-brand)]"
                    >
                      {item.tempoMedioHoras.toFixed(2)}h
                    </Badge>
                    <p className="mt-1 text-[11px] text-[var(--wq-text-muted)]">
                      {formatDuration(item.tempoMedioMs)}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl border-[var(--wq-border)] bg-white shadow-none">
          <CardHeader>
            <CardTitle className="font-[family-name:var(--font-display)] text-[var(--wq-text)]">
              Pedidos em atraso
            </CardTitle>
            <CardDescription className="text-[var(--wq-text-muted)]">
              Lista priorizada dos pedidos que passaram do prazo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data.atrasos?.itens?.length ?? 0) === 0 && (
              <p className="text-sm text-[var(--wq-text-muted)]">Sem pedidos em atraso.</p>
            )}
            {data.atrasos?.itens?.slice(0, 12).map((order) => {
              const atrasoMs = order.diasAtraso
                ? order.diasAtraso * 24 * 60 * 60 * 1000
                : Date.now() - new Date(order.dataPrevistaEntrega).getTime()
              return (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-xl border border-[var(--wq-border)] bg-[var(--wq-paper)]/50 px-4 py-3"
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-[var(--wq-text)]">#{order.codigo || order.id}</div>
                    <div className="text-xs text-[var(--wq-text-muted)]">Status: {order.status}</div>
                    {order.funcionarioAtual && (
                      <div className="text-xs text-[var(--wq-text-muted)]">Resp.: {order.funcionarioAtual}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <Badge className="border-0 bg-[var(--wq-danger)]/10 text-[var(--wq-danger)]">
                      {formatDuration(atrasoMs)}
                    </Badge>
                    <div className="mt-1 text-xs text-[var(--wq-text-muted)]">
                      Venc. {new Date(order.dataPrevistaEntrega).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <p className="text-xs text-[var(--wq-text-muted)]">
          Dados compostos via overview com fallback para endpoints individuais quando necessário.
        </p>
      </div>
    </div>
  )
}
