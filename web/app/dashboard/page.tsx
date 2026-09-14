"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Package, Clock, CheckCircle, Search, LogOut, Plus, BarChart3, TrendingUp, Calendar, AlertTriangle, Settings, User, Monitor, IdCard, BarChart4, Mail, DollarSign } from "lucide-react"
import { apiFetch, getDashboardService } from "@/lib/apiService"
import { SETORES_CORES, SETORES_NOMES } from "@/lib/setores"
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Worqera"
import Cookies from "js-cookie"
import Link from "next/link"

const ENABLE_EMAIL_AUDIT_SCREEN = false

// Interfaces para tipagem dos dados da API
interface DashboardStats {
  totalClients: number
  activeOrders: number
  pendingOrders: number
  completedToday: number
}

interface RecentOrder {
  id: string
  codigo?: string
  clientName: string
  clientCpf: string
  sneaker: string
  serviceType: string
  description: string
  price: number
  status: string
  createdDate: string
  expectedDate: string
  statusHistory: Array<{
    status: string
    date: string
    time: string
  }>
  // setor atual opcional
  setorAtual?: string
}

interface DashboardData {
  stats: DashboardStats
  recentOrders: RecentOrder[]
  user: {
    name: string
    role: string
    permissions: string[]
  }
}

const getStatusBadge = (status: string) => {
  if (["Atendimento - Recebido", "Atendimento - Orçado", "Atendimento - Aprovado"].includes(status)) {
    return (
      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
        Atendimento
      </Badge>
    )
  }
  if (["Lavagem - A Fazer", "Lavagem - Em Andamento", "Lavagem - Concluído"].includes(status)) {
    return (
      <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-300">
        Lavagem
      </Badge>
    )
  }
  if (["Pintura - A Fazer", "Pintura - Em Andamento", "Pintura - Concluído"].includes(status)) {
    return (
      <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-300">
        Pintura
      </Badge>
    )
  }
  if (status === "Atendimento - Finalizado") {
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-300">
        Finalizado
      </Badge>
    )
  }
  if (status === "Atendimento - Entregue") {
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-300">
        Entregue
      </Badge>
    )
  }
  return <Badge variant="outline">{status}</Badge>
}

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        const data = await getDashboardService()
        setDashboardData(data)
      } catch (err: any) {
        setError(err.message || "Erro ao carregar dados do dashboard")
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const handleLogout = () => {
    Cookies.remove("token")
    window.location.href = "/"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl font-semibold text-slate-700">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 text-xl mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Tentar novamente
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!dashboardData) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header Moderno */}
      <header className="bg-white shadow-lg border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-6">
              <img
                src="/worqera_icon.png"
                alt="Worqera"
                className="h-12 w-auto"
              />
              <div>
                <h1 className="text-2xl font-bold text-slate-800 font-serif">{APP_NAME}</h1>
                <p className="text-sm text-slate-600">Painel Administrativo</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm text-slate-600">Bem-vindo,</p>
                <p className="text-lg font-semibold text-slate-800">{dashboardData.user.name}</p>
              </div>
              <div className="flex items-center space-x-2">
                <Link href="/tv-dashboard">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-slate-600 border-slate-300 hover:bg-slate-50 hover:text-slate-800"
                    title="Dashboard para TV"
                  >
                    <Monitor className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">TV Dashboard</span>
                  </Button>
                </Link>
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-4xl font-bold text-slate-800 font-serif mb-2">
                Bem-vindo, {dashboardData.user.name.split(' ')[0]}! 👋
              </h2>
              <p className="text-slate-600 text-lg">
                Aqui está o resumo das operações de hoje
              </p>
            </div>
            <div className="hidden md:block">
              <div className="text-right">
                <p className="text-sm text-slate-500">Data de hoje</p>
                <p className="text-2xl font-bold text-slate-800">
                  {new Date().toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards Modernos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-100">Total de Clientes</CardTitle>
              <Users className="h-5 w-5 text-blue-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">{dashboardData.stats.totalClients}</div>
              <p className="text-xs text-blue-200">Clientes cadastrados</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-100">Pedidos Ativos</CardTitle>
              <Package className="h-5 w-5 text-green-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">{dashboardData.stats.activeOrders}</div>
              <p className="text-xs text-green-200">Em andamento</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-100">Pendentes</CardTitle>
              <Clock className="h-5 w-5 text-orange-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">{dashboardData.stats.pendingOrders}</div>
              <p className="text-xs text-orange-200">Aguardando início</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-100">Concluídos Hoje</CardTitle>
              <CheckCircle className="h-5 w-5 text-purple-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">{dashboardData.stats.completedToday}</div>
              <p className="text-xs text-purple-200">Finalizados hoje</p>
            </CardContent>
          </Card>
        </div>

        {/* Ações Rápidas - Design Moderno */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
            <Settings className="w-6 h-6 mr-3 text-blue-600" />
            Ações Rápidas
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-105 border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-blue-800">
                  <Users className="w-6 h-6 mr-3 text-blue-600" />
                  Gerenciar Clientes
                </CardTitle>
                <CardDescription className="text-blue-600">
                  Visualize e cadastre novos clientes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/clientes" className="block">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    <Users className="w-4 h-4 mr-2" />
                    Ver Todos
                  </Button>
                </Link>
                <Link href="/clientes/novo" className="block">
                  <Button variant="outline" className="w-full border-blue-300 text-blue-700 hover:bg-blue-50">
                    <Plus className="w-4 h-4 mr-2" />
                    Cadastrar Novo
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-105 border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-green-800">
                  <Package className="w-6 h-6 mr-3 text-green-600" />
                  Novo Pedido
                </CardTitle>
                <CardDescription className="text-green-600">
                  Criar pedido de reforma de tênis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/pedidos/novo" className="block">
                  <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Pedido
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-105 border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-purple-800">
                  <Search className="w-6 h-6 mr-3 text-purple-600" />
                  Consultas
                </CardTitle>
                <CardDescription className="text-purple-600">
                  Buscar clientes e pedidos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/consultas" className="block">
                  <Button variant="outline" className="w-full border-purple-300 text-purple-700 hover:bg-purple-50">
                    <Search className="w-4 h-4 mr-2" />
                    Fazer Consulta
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-105 border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-orange-800">
                  <BarChart3 className="w-6 h-6 mr-3 text-orange-600" />
                  Kanban
                </CardTitle>
                <CardDescription className="text-orange-600">
                  Fluxo de producao dos pedidos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/status" className="block">
                  <Button variant="outline" className="w-full border-orange-300 text-orange-700 hover:bg-orange-50">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Abrir Kanban
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {ENABLE_EMAIL_AUDIT_SCREEN && (
              <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-105 border-0 shadow-lg bg-gradient-to-br from-rose-50 to-rose-100 hover:from-rose-100 hover:to-rose-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-rose-800">
                    <Mail className="w-6 h-6 mr-3 text-rose-600" />
                    Auditoria de Emails
                  </CardTitle>
                  <CardDescription className="text-rose-600">
                    Acompanhar emails enviados e erros
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/emails" className="block">
                    <Button variant="outline" className="w-full border-rose-300 text-rose-700 hover:bg-rose-50">
                      <Mail className="w-4 h-4 mr-2" />
                      Abrir auditoria
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-105 border-0 shadow-lg bg-gradient-to-br from-teal-50 to-teal-100 hover:from-teal-100 hover:to-teal-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-teal-800">
                  <IdCard className="w-6 h-6 mr-3 text-teal-600" />
                  Funcionários
                </CardTitle>
                <CardDescription className="text-teal-600">
                  Cadastre e gerencie responsáveis por setor
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/funcionarios" className="block">
                  <Button variant="outline" className="w-full border-teal-300 text-teal-800 hover:bg-teal-50">
                    <IdCard className="w-4 h-4 mr-2" />
                    Abrir cadastro
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {dashboardData.user.role === "admin" && (
              <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-105 border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-cyan-100 hover:from-emerald-100 hover:to-cyan-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-emerald-900">
                    <DollarSign className="w-6 h-6 mr-3 text-emerald-700" />
                    Financeiro
                  </CardTitle>
                  <CardDescription className="text-emerald-700">
                    Receita, lucro, pendencias e servicos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/admin/financeiro" className="block">
                    <Button variant="outline" className="w-full border-emerald-300 text-emerald-900 hover:bg-emerald-50">
                      <DollarSign className="w-4 h-4 mr-2" />
                      Abrir financeiro
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {dashboardData.user.role === "admin" && (
              <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-105 border-0 shadow-lg bg-gradient-to-br from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-slate-800">
                    <BarChart4 className="w-6 h-6 mr-3 text-slate-700" />
                    Métricas (Admin)
                  </CardTitle>
                  <CardDescription className="text-slate-600">
                    Painel de indicadores e atrasos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/admin/metrics" className="block">
                    <Button variant="outline" className="w-full border-slate-300 text-slate-800 hover:bg-slate-50">
                      <BarChart4 className="w-4 h-4 mr-2" />
                      Abrir painel
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Pedidos Recentes - Design Moderno */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl text-slate-800 flex items-center">
                  <Calendar className="w-6 h-6 mr-3 text-slate-600" />
                  Pedidos Recentes
                </CardTitle>
                <CardDescription className="text-slate-600 mt-1">
                  Últimos pedidos registrados no sistema
                </CardDescription>
              </div>
              <Link href="/pedidos">
                <Button className="bg-slate-600 hover:bg-slate-700 text-white">
                  <Package className="w-4 h-4 mr-2" />
                  Ver Todos
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {dashboardData.recentOrders.slice(0, 5).map((order: RecentOrder) => (
                <div key={order.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-slate-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{order.clientName}</p>
                        <p className="text-sm text-slate-600">{order.sneaker}</p>
                        <p className="text-xs text-slate-500">
                          Criado em {new Date(order.createdDate).toLocaleDateString('pt-BR')}
                        </p>
                        {order.setorAtual && (
                          <div className="flex items-center gap-2 mt-1">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: SETORES_CORES[order.setorAtual] || '#ddd' }}
                            />
                            <span className="text-xs text-slate-600">
                              {SETORES_NOMES[order.setorAtual] || order.setorAtual}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm text-slate-500">Código #{order.codigo || order.id}</p>
                      <p className="text-sm font-medium text-slate-700">
                        R$ {order.price.toFixed(2)}
                      </p>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                </div>
              ))}
            </div>
            {dashboardData.recentOrders.length === 0 && (
              <div className="text-center py-8">
                <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">Nenhum pedido recente</p>
                <p className="text-slate-400 text-sm">Os novos pedidos aparecerão aqui</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-slate-500">
          <p className="text-sm">Sistema de Gestão de Pedidos • Versão 1.0</p>
        </div>
      </div>
    </div>
  )
}
