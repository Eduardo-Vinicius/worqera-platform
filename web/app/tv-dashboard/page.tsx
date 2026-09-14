"use client"
import { useState, useEffect, useMemo } from "react"
import { getOrdersService } from "@/lib/apiService"
import { Package, CheckCircle, Timer, TrendingUp, AlertTriangle, Play, Clock, Sparkles } from "lucide-react"

type Order = {
  id: string;
  status?: string;
  clientName?: string;
  cliente?: string;
  codigo?: string;
  expectedDate?: string;
  dataPrevistaEntrega?: string;
};

const isCompletedStatus = (status: string = "") => /entreg|conclu|finaliz/i.test(status)
const isPendingStatus = (status: string = "") => /receb|orç|apro|a fazer|inici|backlog/i.test(status)
const isProgressStatus = (status: string = "") => /andamento|process|lavag|pint|sapat|costur|acab/i.test(status)

const getExpectedDate = (o: Order) => o.expectedDate || o.dataPrevistaEntrega || ""

const isOverdue = (o: Order) => {
  const raw = getExpectedDate(o)
  if (!raw) return false
  const ts = new Date(raw).getTime()
  if (Number.isNaN(ts)) return false
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  return ts < startOfToday.getTime() && !isCompletedStatus(o.status)
}

export default function TvDashboardPage() {
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [lastUpdate, setLastUpdate] = useState(() => new Date())

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const data = await getOrdersService()
        if (!data || !Array.isArray(data)) {
          setError("Dados inválidos recebidos da API")
          setAllOrders([])
          return
        }
        setAllOrders(data as Order[])
        setError("")
        setLastUpdate(new Date())
      } catch (err: any) {
        console.error("Erro ao buscar pedidos:", err)
        setError(err.message || "Erro ao carregar dados")
        setAllOrders([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 30 * 1000)
    return () => clearInterval(interval)
  }, [])

  const totalOrders = allOrders.length

  const buckets = useMemo(() => {
    const pending: Order[] = []
    const progress: Order[] = []
    const ready: Order[] = []
    const overdueList: Order[] = []

    allOrders.forEach((o) => {
      const status = o.status || ""
      if (isOverdue(o)) overdueList.push(o)
      if (isCompletedStatus(status)) {
        ready.push(o)
        return
      }
      if (isProgressStatus(status)) {
        progress.push(o)
        return
      }
      if (isPendingStatus(status)) {
        pending.push(o)
        return
      }
      // fallback para qualquer outro status em andamento
      progress.push(o)
    })

    // ordenar por data prevista (quando existir) para deixar visual mais didático
    const sortByEta = (list: Order[]) => list.slice().sort((a, b) => {
      const ta = new Date(getExpectedDate(a) || 0).getTime()
      const tb = new Date(getExpectedDate(b) || 0).getTime()
      return ta - tb
    })

    return {
      pending: sortByEta(pending),
      progress: sortByEta(progress),
      ready: sortByEta(ready),
      overdue: sortByEta(overdueList)
    }
  }, [allOrders])

  const completionRate = useMemo(() => {
    const completed = buckets.ready.length
    return totalOrders > 0 ? Math.round((completed / totalOrders) * 100) : 0
  }, [buckets.ready.length, totalOrders])

  const InfoCard = ({ title, value, icon: Icon, tone }: { title: string; value: string | number; icon: any; tone: string }) => (
    <div className="rounded-2xl bg-white/6 border border-white/10 shadow-xl p-6 flex items-center justify-between">
      <div>
        <p className="text-sm text-slate-200/80">{title}</p>
        <div className="text-5xl font-black text-white drop-shadow-sm">{value}</div>
      </div>
      <div className="h-14 w-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${tone}22` }}>
        <Icon className="w-7 h-7" style={{ color: tone }} />
      </div>
    </div>
  )

  const Section = ({ title, children, tone }: { title: string; children: React.ReactNode; tone?: string }) => (
    <div className="rounded-3xl border border-white/10 bg-white/5 shadow-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
          {tone && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tone }} />}
          {title}
        </h3>
        <span className="text-xs uppercase tracking-[0.2em] text-slate-300">Atualiza a cada 30s</span>
      </div>
      {children}
    </div>
  )

  const renderList = (list: Order[], emptyText: string, accent: string) => (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {list.length === 0 && (
        <div className="col-span-full text-sm text-slate-300/80">{emptyText}</div>
      )}
      {list.map((o) => (
        <div key={o.id} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold text-white">#{o.codigo || o.id}</div>
            <span className="text-[11px] px-2 py-1 rounded-full" style={{ backgroundColor: `${accent}22`, color: accent }}>
              {o.status || "Em andamento"}
            </span>
          </div>
          <p className="text-sm text-slate-200 truncate mt-1">{o.clientName || o.cliente || "Cliente"}</p>
          <div className="mt-2 text-xs text-slate-300 flex items-center gap-2">
            <Clock className="w-3 h-3" />
            {(() => {
              const raw = getExpectedDate(o)
              if (!raw) return <span>Sem previsão</span>
              const dt = new Date(raw)
              return <span>Entrega: {dt.toLocaleDateString("pt-BR")}</span>
            })()}
            {isOverdue(o) && (
              <span className="ml-auto flex items-center gap-1 text-amber-300 font-semibold">
                <AlertTriangle className="w-3 h-3" /> Atrasado
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-sky-400 mx-auto mb-6"></div>
          <p className="text-2xl font-light text-slate-200">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <header className="bg-white/5 border-b border-white/10 backdrop-blur py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Worqera Experience</p>
            <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tight">Painel da Loja</h1>
            <p className="text-lg text-slate-200/90">Pedidos em tempo real para clientes e equipe</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-300">Atualizado</p>
            <p className="text-2xl font-mono text-white">{lastUpdate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
            <p className="text-xs text-slate-400">Auto refresh a cada 30s</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        {error && (
          <div className="p-4 rounded-xl border border-amber-400/40 bg-amber-500/10 text-amber-100">
            <p className="font-semibold">Erro ao carregar pedidos</p>
            <p className="text-sm opacity-80">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <InfoCard title="Total na loja" value={totalOrders} icon={Package} tone="#38bdf8" />
          <InfoCard title="Em andamento" value={buckets.progress.length} icon={Play} tone="#60a5fa" />
          <InfoCard title="Prontos / entregues" value={buckets.ready.length} icon={CheckCircle} tone="#34d399" />
          <InfoCard title="Atrasados" value={buckets.overdue.length} icon={AlertTriangle} tone="#fb7185" />
        </div>

        <Section title="Em andamento agora" tone="#60a5fa">
          {renderList(buckets.progress, "Nenhum pedido em processamento", "#60a5fa")}
        </Section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Section title="Aguardando início" tone="#fbbf24">
            {renderList(buckets.pending, "Tudo iniciado ou concluído", "#fbbf24")}
          </Section>
          <Section title="Prontos para retirada / entregues" tone="#34d399">
            {renderList(buckets.ready, "Ainda sem pedidos prontos", "#34d399")}
          </Section>
        </div>

        <Section title="Pedidos atrasados" tone="#fb7185">
          <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4 shadow-xl">
            {buckets.overdue.length === 0 ? (
              <p className="text-sm text-rose-50/90">Nenhum pedido atrasado. \o/</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {buckets.overdue.map((o) => (
                  <div key={o.id} className="rounded-xl border border-rose-400/50 bg-white/5 px-4 py-3 shadow-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-semibold">#{o.codigo || o.id}</span>
                      <span className="text-[11px] text-rose-100 bg-rose-500/20 px-2 py-1 rounded-full border border-rose-400/50">Atrasado</span>
                    </div>
                    <p className="text-sm text-slate-100 truncate">{o.clientName || o.cliente || "Cliente"}</p>
                    <p className="text-xs text-rose-100/80 mt-1">Status: {o.status || "Em andamento"}</p>
                    <p className="text-xs text-rose-50 mt-1">
                      Previsto: {(() => {
                        const raw = getExpectedDate(o)
                        if (!raw) return "sem data"
                        const dt = new Date(raw)
                        return dt.toLocaleDateString("pt-BR")
                      })()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

        <div className="text-center text-slate-400 pt-4 pb-8 text-sm flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4" />
          Atualização contínua para transparência na loja
        </div>
      </div>
    </div>
  )
}