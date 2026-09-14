"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowLeft,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur supports-[backdrop-filter]:bg-slate-950/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-16 flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-3 min-w-[240px]">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-semibold text-white leading-tight">Painel de Metricas</h1>
              <p className="text-xs text-slate-300">Operacao, SLA, produtividade e visao financeira</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
            {lastUpdated && (
              <Badge variant="outline" className="border-white/20 bg-white/5 text-slate-100 text-[11px]">
                Atualizado {new Date(lastUpdated).toLocaleString("pt-BR")}
              </Badge>
            )}
            <Link href="/admin/financeiro">
              <Button variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/10 h-9 px-3">
                <DollarSign className="w-4 h-4 mr-2" />
                Financeiro
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={() => loadData(periodo)} disabled={loading} className="border-white/30 text-white hover:bg-white/10 h-9 px-3">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span className="ml-2 text-sm">Atualizar</span>
            </Button>
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="h-9 text-slate-200 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <section className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-300">Periodo da analise</p>
            <h2 className="text-2xl font-semibold text-white">{data.resumo?.periodo?.referencia || periodo}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((option) => (
              <Button
                key={option.value}
                size="sm"
                variant={periodo === option.value ? "default" : "outline"}
                className={periodo === option.value ? "bg-white text-slate-950 hover:bg-white/90" : "border-white/20 bg-white/5 text-white hover:bg-white/10"}
                onClick={() => setPeriodo(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </section>

        {error && (
          <Alert variant="destructive" className="bg-rose-950/70 border-rose-700 text-rose-100">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {[
            { title: "Total pedidos", value: derived.total, hint: "No periodo", icon: BarChart3, bg: "from-sky-500/80 to-indigo-500/80" },
            { title: "Em aberto", value: derived.abertos, hint: "Fluxo ativo", icon: TrendingUp, bg: "from-blue-500/80 to-cyan-500/80" },
            { title: "Finalizados", value: derived.finalizados, hint: "Concluidos", icon: Award, bg: "from-emerald-500/80 to-teal-500/80" },
            { title: "Em atraso", value: derived.atrasados, hint: "Atencao imediata", icon: AlertTriangle, bg: "from-amber-500/90 to-orange-500/80" },
            { title: "Taxa de atraso", value: formatPct(derived.taxaAtraso), hint: "Sobre o total", icon: Clock, bg: "from-rose-500/80 to-pink-500/80" },
          ].map((card) => {
            const Icon = card.icon
            return (
              <Card key={card.title} className="relative overflow-hidden border border-white/10 bg-gradient-to-br shadow-xl shadow-black/30">
                <div className={`absolute inset-0 bg-gradient-to-br ${card.bg}`} />
                <CardHeader className="pb-1 relative text-white">
                  <CardTitle className="text-sm font-semibold text-white/80">{card.title}</CardTitle>
                </CardHeader>
                <CardContent className="relative flex items-center justify-between text-white">
                  <div>
                    <div className="text-3xl font-bold leading-tight">{card.value}</div>
                    <p className="text-sm text-white/80">{card.hint}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/15 border border-white/10">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Card className="shadow-2xl shadow-black/30 border border-white/10 bg-slate-900/80 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-white">Leitura executiva</CardTitle>
            <CardDescription className="text-slate-300">SLA, prazo, atraso medio e pulso financeiro</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs uppercase tracking-wide text-slate-200">No prazo</p>
              <p className="text-2xl font-semibold text-white">{derived.noPrazo}</p>
              <p className="text-[11px] text-slate-300">Pedidos dentro do SLA</p>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs uppercase tracking-wide text-slate-200">On-time</p>
              <p className="text-2xl font-semibold text-emerald-200">{formatPct(derived.onTimePct)}</p>
              <p className="text-[11px] text-slate-300">Taxa de entregas no prazo</p>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs uppercase tracking-wide text-slate-200">Atraso medio</p>
              <p className="text-2xl font-semibold text-amber-300">{formatDuration(derived.atrasoMedioMs)}</p>
              <p className="text-[11px] text-slate-300">Media dos pedidos atrasados</p>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs uppercase tracking-wide text-slate-200">Receita recebida</p>
              <p className="text-2xl font-semibold text-cyan-200">{formatCurrency(data.financeiro?.resumo?.receitaRecebida || 0)}</p>
              <p className="text-[11px] text-slate-300">Resumo financeiro do periodo</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 shadow-xl shadow-black/20 border border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="text-white">Pedidos por departamento</CardTitle>
              <CardDescription className="text-slate-300">Distribuicao atual por setor</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {setoresList.length === 0 && <p className="text-sm text-slate-300">Sem dados.</p>}
              {setoresList.map((item) => {
                const pct = derived.total ? (item.total / derived.total) * 100 : 0
                return (
                  <div key={item.setorId || item.setorNome || "setor"} className="space-y-2">
                    <div className="flex justify-between text-sm text-slate-100">
                      <span className="font-medium">{item.setorNome || item.setorId}</span>
                      <span className="text-slate-300">{item.total} • {formatPct(pct)}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-400 to-indigo-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card className="shadow-xl shadow-black/20 border border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="text-white">Pulso financeiro</CardTitle>
              <CardDescription className="text-slate-300">Indicadores resumidos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                ["Receita prevista", formatCurrency(data.financeiro?.resumo?.receitaPrevista || 0)],
                ["Receita pendente", formatCurrency(data.financeiro?.resumo?.receitaPendente || 0)],
                ["Despesas", formatCurrency(data.financeiro?.resumo?.despesas || 0)],
                ["Lucro realizado", formatCurrency(data.financeiro?.resumo?.lucroRealizado || 0)],
                ["Ticket medio", formatCurrency(data.financeiro?.resumo?.ticketMedio || 0)],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex items-center justify-between text-sm text-white/90 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                  <span className="text-slate-300">{label}</span>
                  <span className="font-semibold text-white">{value}</span>
                </div>
              ))}
              <Link href="/admin/financeiro" className="block pt-2">
                <Button className="w-full bg-white text-slate-950 hover:bg-slate-100">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Abrir financeiro
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card className="shadow-xl shadow-black/20 border border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="text-white">Top funcionarios por pedidos</CardTitle>
              <CardDescription className="text-slate-300">Participacao e pedidos finalizados</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {rankingProdutividade.length === 0 && <p className="text-sm text-slate-300">Sem dados.</p>}
              {rankingProdutividade.map((item, idx) => (
                <div key={`${item.funcionarioNome}-${idx}`} className="flex items-center justify-between text-sm text-white/90 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold text-white/80">{idx + 1}</div>
                    <div>
                      <p className="font-medium text-white">{item.funcionarioNome}</p>
                      <p className="text-[11px] text-slate-300">{item.pedidosFinalizados} finalizados</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-100 border-emerald-500/30">{item.pedidosComParticipacao}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-xl shadow-black/20 border border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="text-white">Top funcionarios mais rapidos</CardTitle>
              <CardDescription className="text-slate-300">Tempo medio por etapa concluida</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {rankingVelocidade.length === 0 && (
                <div className="rounded-lg border border-dashed border-white/10 p-4 text-sm text-slate-300">
                  Backend ainda nao retornou ranking de velocidade para o periodo selecionado.
                </div>
              )}
              {rankingVelocidade.map((item, idx) => (
                <div key={`${item.funcionarioNome}-${idx}`} className="flex items-center justify-between text-sm text-white/90 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold text-white/80">{idx + 1}</div>
                    <div>
                      <p className="font-medium text-white">{item.funcionarioNome}</p>
                      <p className="text-[11px] text-slate-300">{item.etapasConcluidas} etapas • {item.pedidosComTempo} pedidos</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-100 border-cyan-500/30">{item.tempoMedioHoras.toFixed(2)}h</Badge>
                    <p className="text-[11px] text-slate-400 mt-1">{formatDuration(item.tempoMedioMs)}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-2xl shadow-black/25 border border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="text-white">Pedidos em atraso</CardTitle>
            <CardDescription className="text-slate-300">Lista priorizada dos pedidos que passaram do prazo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data.atrasos?.itens?.length ?? 0) === 0 && <p className="text-sm text-slate-300">Sem pedidos em atraso.</p>}
            {data.atrasos?.itens?.slice(0, 12).map((order) => {
              const atrasoMs = order.diasAtraso
                ? order.diasAtraso * 24 * 60 * 60 * 1000
                : Date.now() - new Date(order.dataPrevistaEntrega).getTime()
              return (
                <div key={order.id} className="flex items-center justify-between rounded-lg px-4 py-3 border border-white/10 bg-gradient-to-r from-rose-950/50 to-rose-900/30 text-white">
                  <div className="space-y-1">
                    <div className="font-semibold">#{order.codigo || order.id}</div>
                    <div className="text-xs text-rose-100/80">Status: {order.status}</div>
                    {order.funcionarioAtual && <div className="text-xs text-rose-100/80">Resp.: {order.funcionarioAtual}</div>}
                  </div>
                  <div className="text-right">
                    <Badge variant="destructive" className="bg-rose-600 text-white border-rose-500/60">{formatDuration(atrasoMs)}</Badge>
                    <div className="text-xs text-rose-100/80 mt-1">Venc. {new Date(order.dataPrevistaEntrega).toLocaleDateString("pt-BR")}</div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card className="shadow-xl shadow-black/20 border border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="text-white">Observacoes de integracao</CardTitle>
            <CardDescription className="text-slate-300">Fallbacks aplicados enquanto o backend novo nao estiver completo</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="font-medium text-white mb-2">Overview</p>
              <p className="text-slate-300">Se `GET /metrics/overview` nao existir, a tela usa chamadas separadas e continua funcionando.</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="font-medium text-white mb-2">Ranking de velocidade</p>
              <p className="text-slate-300">So aparece completo quando `GET /metrics/funcionarios/desempenho` devolver tempos por etapa.</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="font-medium text-white mb-2">Financeiro</p>
              <p className="text-slate-300">Os cards usam `GET /metrics/financeiro`; sem esse endpoint os valores ficam zerados e a tela segue navegavel.</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
