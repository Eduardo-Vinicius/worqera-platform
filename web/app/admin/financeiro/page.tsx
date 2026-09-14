"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, BarChart3, DollarSign, Loader2, PiggyBank, RefreshCw, Receipt, TrendingUp } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getMetricsFinanceiroService, type MetricsFinanceiro, type MetricsPeriodo } from "@/lib/apiService"

const PERIOD_OPTIONS: Array<{ value: MetricsPeriodo; label: string }> = [
  { value: "7d", label: "7 dias" },
  { value: "15d", label: "15 dias" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
  { value: "180d", label: "180 dias" },
  { value: "1y", label: "1 ano" },
]

const formatCurrency = (value: number) => new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
}).format(value || 0)

const formatDate = (value?: string) => {
  if (!value) return "-"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-BR")
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
        limitServicos: 8,
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

  const resumoCards = useMemo(() => {
    const resumo = data?.resumo
    if (!resumo) return []

    return [
      {
        title: "Receita prevista",
        value: formatCurrency(resumo.receitaPrevista),
        hint: `${resumo.totalPedidos} pedidos no periodo`,
        icon: DollarSign,
        tone: "from-emerald-500 to-green-600",
      },
      {
        title: "Receita recebida",
        value: formatCurrency(resumo.receitaRecebida),
        hint: `${resumo.pedidosFinalizados} finalizados`,
        icon: PiggyBank,
        tone: "from-blue-500 to-cyan-600",
      },
      {
        title: "Despesas",
        value: formatCurrency(resumo.despesas),
        hint: `Lucro realizado ${formatCurrency(resumo.lucroRealizado)}`,
        icon: Receipt,
        tone: "from-orange-500 to-amber-600",
      },
      {
        title: "Ticket medio",
        value: formatCurrency(resumo.ticketMedio),
        hint: `Margem prevista ${resumo.margemPrevista?.toFixed(2) || "0.00"}%`,
        icon: TrendingUp,
        tone: "from-violet-500 to-fuchsia-600",
      },
    ]
  }, [data])

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#13233f_0%,#071120_45%,#040814_100%)] text-white">
      <header className="border-b border-white/10 bg-slate-950/60 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <DollarSign className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Financeiro da Loja</h1>
              <p className="text-sm text-slate-300">Receita, lucro, pendencias e desempenho de servicos</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {lastUpdated && (
              <Badge variant="outline" className="border-white/20 bg-white/5 text-slate-100">
                Atualizado {new Date(lastUpdated).toLocaleString("pt-BR")}
              </Badge>
            )}
            <Link href="/admin/metrics">
              <Button variant="outline" size="sm" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
                <BarChart3 className="w-4 h-4 mr-2" />
                Metricas
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-slate-200 hover:text-white hover:bg-white/10">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <section className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-300">Periodo analisado</p>
            <h2 className="text-2xl font-semibold">
              {formatDate(data?.periodo?.inicio)} ate {formatDate(data?.periodo?.fim)}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((option) => (
              <Button
                key={option.value}
                size="sm"
                variant={periodo === option.value ? "default" : "outline"}
                className={periodo === option.value ? "bg-white text-slate-950 hover:bg-white/90" : "border-white/15 bg-white/5 text-white hover:bg-white/10"}
                onClick={() => setPeriodo(option.value)}
              >
                {option.label}
              </Button>
            ))}
            <Button
              size="sm"
              variant="outline"
              className="border-white/15 bg-white/5 text-white hover:bg-white/10"
              onClick={() => loadData(periodo)}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span className="ml-2">Atualizar</span>
            </Button>
          </div>
        </section>

        {error && (
          <Alert className="border-rose-500/40 bg-rose-500/10 text-rose-50">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {resumoCards.map((card) => {
            const Icon = card.icon
            return (
              <Card key={card.title} className="overflow-hidden border-white/10 bg-slate-900/70 shadow-2xl shadow-black/20">
                <div className={`h-1 bg-gradient-to-r ${card.tone}`} />
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-300">{card.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-3xl font-bold text-white">{card.value}</p>
                    <p className="text-xs text-slate-400 mt-1">{card.hint}</p>
                  </div>
                  <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${card.tone} flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-2 border-white/10 bg-slate-900/70">
            <CardHeader>
              <CardTitle className="text-white">Evolucao diaria</CardTitle>
              <CardDescription className="text-slate-400">Pedidos, receita prevista e receita recebida</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(data?.evolucaoDiaria || []).length === 0 && (
                  <p className="text-sm text-slate-400">Sem dados para o periodo selecionado.</p>
                )}
                {(data?.evolucaoDiaria || []).map((item) => {
                  const maxValue = Math.max(item.receitaPrevista || 0, item.receitaRecebida || 0, 1)
                  const receivedPct = Math.min((item.receitaRecebida / maxValue) * 100, 100)
                  const forecastPct = Math.min((item.receitaPrevista / maxValue) * 100, 100)
                  return (
                    <div key={item.data} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div>
                          <p className="font-medium text-white">{formatDate(item.data)}</p>
                          <p className="text-xs text-slate-400">{item.pedidos} pedido(s)</p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="text-cyan-300">Recebido {formatCurrency(item.receitaRecebida)}</p>
                          <p className="text-emerald-300">Previsto {formatCurrency(item.receitaPrevista)}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-[11px] text-slate-400 mb-1"><span>Receita recebida</span><span>{receivedPct.toFixed(0)}%</span></div>
                          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${receivedPct}%` }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-[11px] text-slate-400 mb-1"><span>Receita prevista</span><span>{forecastPct.toFixed(0)}%</span></div>
                          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-500" style={{ width: `${forecastPct}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-slate-900/70">
            <CardHeader>
              <CardTitle className="text-white">Resumo financeiro</CardTitle>
              <CardDescription className="text-slate-400">Indicadores consolidados do periodo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                ["Pedidos finalizados", data?.resumo?.pedidosFinalizados || 0],
                ["Pedidos em aberto", data?.resumo?.pedidosEmAberto || 0],
                ["Receita pendente", formatCurrency(data?.resumo?.receitaPendente || 0)],
                ["Lucro previsto", formatCurrency(data?.resumo?.lucroPrevisto || 0)],
                ["Lucro realizado", formatCurrency(data?.resumo?.lucroRealizado || 0)],
                ["Margem prevista", `${data?.resumo?.margemPrevista?.toFixed(2) || "0.00"}%`],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                  <span className="text-slate-300">{label}</span>
                  <span className="font-semibold text-white">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card className="border-white/10 bg-slate-900/70">
            <CardHeader>
              <CardTitle className="text-white">Receita por status</CardTitle>
              <CardDescription className="text-slate-400">Quanto cada etapa concentra de valor</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-400 border-b border-white/10">
                      <th className="pb-3 pr-4 font-medium">Status</th>
                      <th className="pb-3 pr-4 font-medium">Pedidos</th>
                      <th className="pb-3 pr-4 font-medium">Prevista</th>
                      <th className="pb-3 font-medium">Recebida</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.receitaPorStatus || []).map((item) => (
                      <tr key={item.status} className="border-b border-white/5 text-slate-100">
                        <td className="py-3 pr-4">{item.status}</td>
                        <td className="py-3 pr-4">{item.pedidos}</td>
                        <td className="py-3 pr-4 text-emerald-300">{formatCurrency(item.receitaPrevista)}</td>
                        <td className="py-3 text-cyan-300">{formatCurrency(item.receitaRecebida)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(data?.receitaPorStatus || []).length === 0 && <p className="text-sm text-slate-400">Sem dados.</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-slate-900/70">
            <CardHeader>
              <CardTitle className="text-white">Top servicos</CardTitle>
              <CardDescription className="text-slate-400">Servicos com maior volume de receita</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(data?.topServicos || []).map((item, index) => (
                <div key={`${item.servico}-${index}`} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <div>
                    <p className="font-medium text-white">{item.servico}</p>
                    <p className="text-xs text-slate-400">{item.pedidos} pedido(s)</p>
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-100 border border-emerald-500/30">{formatCurrency(item.receita)}</Badge>
                </div>
              ))}
              {(data?.topServicos || []).length === 0 && <p className="text-sm text-slate-400">Sem dados.</p>}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  )
}