"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, RefreshCw, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getKanbanV1, moveKanbanOrderV1 } from "@/lib/apiV1"
import { toast } from "sonner"

type Column = {
  sector: { _id: string; name: string; color: string }
  orders: Array<{
    _id: string
    code: string
    clientName: string
    shoeModel?: string
    priority?: number
    dueAt?: string
  }>
}

export default function KanbanV1Page() {
  const [columns, setColumns] = useState<Column[]>([])
  const [loading, setLoading] = useState(true)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getKanbanV1()
      setColumns(res.columns || [])
    } catch (err: any) {
      toast.error(err?.message || "Erro ao carregar kanban v1")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const onDrop = async (toSectorId: string) => {
    if (!draggingId) return
    try {
      await moveKanbanOrderV1(draggingId, { toSectorId })
      toast.success("Pedido movido")
      setDraggingId(null)
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Falha ao mover")
      setDraggingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between gap-3 max-w-[1600px] mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <h1 className="text-lg font-serif font-bold">Kanban</h1>
            <Badge variant="secondary">setores do shop</Badge>
          </div>
          <div className="flex gap-2">
            <Link href="/settings/setores">
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Setores
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
            <Link href="/status">
              <Button variant="ghost" size="sm">
                Legado
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="p-4 overflow-x-auto">
        {loading ? (
          <p className="text-center text-slate-500 py-20">Carregando board…</p>
        ) : columns.length === 0 ? (
          <Card className="max-w-md mx-auto mt-12">
            <CardHeader>
              <CardTitle>Sem colunas</CardTitle>
            </CardHeader>
            <CardContent>
              Cadastre setores da oficina para montar o kanban.
              <div className="mt-4">
                <Link href="/settings/setores">
                  <Button>Configurar setores</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex gap-4 min-h-[70vh] items-start">
            {columns.map((col) => (
              <div
                key={col.sector._id}
                className="w-72 shrink-0 rounded-xl bg-white border shadow-sm"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(col.sector._id)}
              >
                <div
                  className="px-3 py-2 border-b font-semibold flex items-center gap-2"
                  style={{ borderTopColor: col.sector.color, borderTopWidth: 3 }}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: col.sector.color }} />
                  {col.sector.name}
                  <Badge variant="outline" className="ml-auto">
                    {col.orders.length}
                  </Badge>
                </div>
                <div className="p-2 space-y-2 min-h-[200px]">
                  {col.orders.map((o) => (
                    <div
                      key={o._id}
                      draggable
                      onDragStart={() => setDraggingId(o._id)}
                      className="rounded-lg border bg-slate-50 p-3 cursor-grab active:cursor-grabbing hover:shadow"
                    >
                      <p className="font-semibold text-sm">{o.code}</p>
                      <p className="text-sm text-slate-600">{o.clientName}</p>
                      {o.shoeModel && <p className="text-xs text-slate-400">{o.shoeModel}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
