"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createSectorV1, listSectorsV1, reorderSectorsV1, updateSectorV1 } from "@/lib/apiV1"
import { toast } from "sonner"

type Sector = {
  _id: string
  name: string
  order: number
  color: string
  active: boolean
  isTerminal?: boolean
}

export default function SetoresSettingsPage() {
  const [sectors, setSectors] = useState<Sector[]>([])
  const [name, setName] = useState("")
  const [color, setColor] = useState("#2196F3")
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await listSectorsV1()
      setSectors((res.sectors || []).sort((a, b) => a.order - b.order))
    } catch (err: any) {
      toast.error(err?.message || "Erro ao listar setores (precisa API v1 + login SaaS)")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const add = async () => {
    if (!name.trim()) return
    try {
      await createSectorV1({ name: name.trim(), color, order: sectors.length + 1 })
      setName("")
      toast.success("Setor criado")
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Falha ao criar")
    }
  }

  const toggleActive = async (s: Sector) => {
    try {
      await updateSectorV1(s._id, { active: !s.active })
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Falha ao atualizar")
    }
  }

  const saveOrder = async () => {
    try {
      await reorderSectorsV1(sectors.map((s, i) => ({ id: s._id, order: i + 1 })))
      toast.success("Ordem salva — o kanban usa essa sequência")
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Falha ao reordenar")
    }
  }

  const move = (index: number, dir: -1 | 1) => {
    const next = index + dir
    if (next < 0 || next >= sectors.length) return
    const copy = [...sectors]
    const tmp = copy[index]
    copy[index] = copy[next]
    copy[next] = tmp
    setSectors(copy)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </Link>
            <h1 className="text-xl font-serif font-bold">Setores da oficina</h1>
          </div>
          <Link href="/kanban">
            <Button variant="outline">Ver kanban</Button>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Novo setor</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} className="max-w-xs" />
            <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-14 p-1" />
            <Button onClick={add}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Fluxo (ordem do kanban)</CardTitle>
            <Button size="sm" onClick={saveOrder}>
              <Save className="w-4 h-4 mr-2" />
              Salvar ordem
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <p className="text-slate-500">Carregando…</p>
            ) : sectors.length === 0 ? (
              <p className="text-slate-500">Nenhum setor. Crie o fluxo da sua oficina.</p>
            ) : (
              sectors.map((s, i) => (
                <div
                  key={s._id}
                  className="flex items-center gap-3 rounded-lg border bg-white px-3 py-2"
                >
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="flex-1 font-medium">{s.name}</span>
                  <span className="text-xs text-slate-400">#{i + 1}</span>
                  <Button size="sm" variant="ghost" onClick={() => move(i, -1)}>
                    ↑
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => move(i, 1)}>
                    ↓
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toggleActive(s)}>
                    {s.active ? "Desativar" : "Ativar"}
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
