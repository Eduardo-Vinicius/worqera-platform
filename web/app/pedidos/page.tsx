"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Package, Search, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getPedidosConsultaService } from "@/lib/apiService"
import { SETORES_NOMES, SETORES_CORES } from "@/lib/setores"
import { toast } from "sonner"

type PedidoListItem = {
  id: string
  codigo?: string
  clientName?: string
  modeloTenis?: string
  status?: string
  setorAtual?: string
  precoTotal?: number
  dataCriacao?: string
}

export default function PedidosPage() {
  const [items, setItems] = useState<PedidoListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const result = await getPedidosConsultaService({ limit: 50 }, { forceRefresh: true })
        const list = Array.isArray(result?.data)
          ? result.data
          : Array.isArray(result?.items)
            ? result.items
            : Array.isArray(result?.pedidos)
              ? result.pedidos
              : Array.isArray(result)
                ? result
                : []
        if (!cancelled) setItems(list)
      } catch (err) {
        console.error(err)
        toast.error("Não foi possível carregar os pedidos")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = items.filter((p) => {
    if (!q.trim()) return true
    const hay = `${p.codigo || ""} ${p.clientName || ""} ${p.modeloTenis || ""} ${p.status || ""}`.toLowerCase()
    return hay.includes(q.trim().toLowerCase())
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-serif font-bold text-slate-800">Pedidos</h1>
              <p className="text-sm text-slate-500">Lista recente da oficina</p>
            </div>
          </div>
          <Link href="/pedidos/novo">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo pedido
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Buscar por código, cliente, modelo…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-600">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Carregando…
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-50" />
              Nenhum pedido encontrado.
              <div className="mt-4">
                <Link href="/pedidos/novo">
                  <Button variant="outline">Criar primeiro pedido</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map((p) => {
              const setorLabel = p.setorAtual
                ? SETORES_NOMES[p.setorAtual as keyof typeof SETORES_NOMES] || p.setorAtual
                : null
              const setorColor = p.setorAtual
                ? SETORES_CORES[p.setorAtual as keyof typeof SETORES_CORES]
                : undefined
              return (
                <Card key={p.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="py-4 flex flex-row items-center justify-between gap-4 space-y-0">
                    <div>
                      <CardTitle className="text-base font-semibold text-slate-800">
                        {p.codigo || p.id.slice(0, 8)}
                        <span className="font-normal text-slate-500"> · {p.clientName || "Cliente"}</span>
                      </CardTitle>
                      <p className="text-sm text-slate-500 mt-1">
                        {p.modeloTenis || "—"}
                        {p.dataCriacao ? ` · ${new Date(p.dataCriacao).toLocaleDateString("pt-BR")}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {setorLabel && (
                        <Badge style={setorColor ? { backgroundColor: `${setorColor}22`, color: setorColor } : undefined}>
                          {setorLabel}
                        </Badge>
                      )}
                      {p.status && <Badge variant="outline">{p.status}</Badge>}
                      <Link href={`/consultas?tab=pedidos&searchTerm=${encodeURIComponent(p.codigo || p.id)}`}>
                        <Button size="sm" variant="secondary">
                          Abrir
                        </Button>
                      </Link>
                    </div>
                  </CardHeader>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
