"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { AppHeader } from "@/components/shell/AppHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  createServiceV1,
  deleteServiceV1,
  listSectorsV1,
  listServicesV1,
  patchServiceV1,
} from "@/lib/apiV1"
import { toast } from "sonner"

type Service = {
  _id?: string
  id?: string
  name: string
  defaultPrice?: number
  active?: boolean
  sectorPathHint?: string[]
}

type Sector = { _id: string; name: string; order?: number; active?: boolean }

function serviceId(s: Service) {
  return String(s._id || s.id || "")
}

function normalizeHint(ids?: string[]) {
  return (ids || []).map(String)
}

export default function ServicosSettingsPage() {
  const [services, setServices] = useState<Service[]>([])
  const [sectors, setSectors] = useState<Sector[]>([])
  const [name, setName] = useState("")
  const [price, setPrice] = useState("0")
  const [pathHint, setPathHint] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [editingHintId, setEditingHintId] = useState<string | null>(null)
  const [editingHint, setEditingHint] = useState<string[]>([])

  const load = async () => {
    setLoading(true)
    try {
      const [svcRes, secRes] = await Promise.all([listServicesV1(), listSectorsV1()])
      setServices(svcRes.services || [])
      setSectors(
        (secRes.sectors || [])
          .filter((s: Sector) => s.active !== false)
          .sort((a: Sector, b: Sector) => (a.order || 0) - (b.order || 0))
      )
    } catch (err: any) {
      toast.error(err?.message || "Erro ao listar serviços")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const toggleOrderedHint = (
    id: string,
    current: string[],
    setter: (next: string[]) => void
  ) => {
    if (current.includes(id)) {
      setter(current.filter((x) => x !== id))
    } else {
      setter([...current, id])
    }
  }

  const HintChips = ({
    selected,
    onToggle,
  }: {
    selected: string[]
    onToggle: (id: string) => void
  }) => (
    <div className="flex flex-wrap gap-2">
      {sectors.map((s) => {
        const id = String(s._id)
        const idx = selected.indexOf(id)
        const on = idx >= 0
        return (
          <button
            key={id}
            type="button"
            onClick={() => onToggle(id)}
            className={`rounded-full border px-3 py-1 text-sm ${
              on
                ? "border-[var(--wq-brand)] bg-[var(--wq-brand-soft)] text-[var(--wq-text)]"
                : "border-[var(--wq-border)] text-[var(--wq-text-muted)]"
            }`}
          >
            {on ? `${idx + 1}. ` : ""}
            {s.name}
          </button>
        )
      })}
    </div>
  )

  const sectorLabel = (id: string) =>
    sectors.find((s) => String(s._id) === String(id))?.name || id

  const add = async () => {
    if (!name.trim()) return
    try {
      await createServiceV1({
        name: name.trim(),
        defaultPrice: Number(price) || 0,
        active: true,
        sortOrder: services.length + 1,
        sectorPathHint: pathHint,
      })
      setName("")
      setPrice("0")
      setPathHint([])
      toast.success("Serviço criado")
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Falha ao criar")
    }
  }

  const toggleActive = async (s: Service) => {
    const id = serviceId(s)
    if (!id) return
    try {
      if (s.active === false) {
        await patchServiceV1(id, { active: true })
      } else {
        await deleteServiceV1(id)
      }
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Falha ao atualizar")
    }
  }

  const savePrice = async (s: Service, nextPrice: number) => {
    const id = serviceId(s)
    if (!id) return
    try {
      await patchServiceV1(id, { defaultPrice: nextPrice })
      toast.success("Preço atualizado")
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Falha ao salvar preço")
    }
  }

  const saveHint = async (s: Service) => {
    const id = serviceId(s)
    if (!id) return
    try {
      await patchServiceV1(id, { sectorPathHint: editingHint })
      toast.success("Rota de setores atualizada")
      setEditingHintId(null)
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Falha ao salvar rota")
    }
  }

  return (
    <div className="-mx-3 -mt-4 sm:-mx-5 sm:-mt-6 md:-mx-8 md:-mt-7">
      <AppHeader
        title="Catálogo de serviços"
        subtitle="Usado no novo pedido · rota sugerida de setores (TOP-04)"
        actions={
          <Button asChild variant="outline" size="sm" className="rounded-[10px]">
            <Link href="/pedidos/novo">Novo pedido</Link>
          </Button>
        }
      />

      <div className="mx-auto max-w-[800px] space-y-5 px-5 py-6 md:px-8">
        <Card className="rounded-2xl border-[var(--wq-border)] shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Novo serviço</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="max-w-xs rounded-[10px]"
              />
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="Preço"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-28 rounded-[10px]"
              />
              <Button onClick={add} className="bg-[var(--wq-action)] hover:bg-[var(--wq-action)]/90">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar
              </Button>
            </div>
            {sectors.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--wq-text-muted)]">
                  Rota sugerida (toque na ordem)
                </p>
                <HintChips
                  selected={pathHint}
                  onToggle={(id) => toggleOrderedHint(id, pathHint, setPathHint)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-[var(--wq-border)] shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Serviços da loja</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading && <p className="text-sm text-[var(--wq-text-muted)]">Carregando…</p>}
            {!loading && services.length === 0 && (
              <p className="text-sm text-[var(--wq-text-muted)]">Nenhum serviço cadastrado.</p>
            )}
            {services.map((s) => {
              const id = serviceId(s)
              const active = s.active !== false
              const hints = normalizeHint(s.sectorPathHint)
              const editing = editingHintId === id
              return (
                <div
                  key={id}
                  className="space-y-2 rounded-xl border border-[var(--wq-border)] px-3 py-2"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-[var(--wq-text)]">{s.name}</p>
                      <p className="text-xs text-[var(--wq-text-muted)]">
                        {active ? "Ativo" : "Inativo"}
                        {hints.length > 0 && !editing
                          ? ` · Rota: ${hints.map(sectorLabel).join(" → ")}`
                          : ""}
                      </p>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      defaultValue={Number(s.defaultPrice) || 0}
                      className="w-28 rounded-[10px]"
                      onBlur={(e) => {
                        const next = Number(e.target.value) || 0
                        if (next !== Number(s.defaultPrice || 0)) savePrice(s, next)
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-[10px]"
                      onClick={() => {
                        if (editing) {
                          setEditingHintId(null)
                        } else {
                          setEditingHintId(id)
                          setEditingHint(hints)
                        }
                      }}
                    >
                      {editing ? "Cancelar rota" : "Rota"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-[10px]"
                      onClick={() => toggleActive(s)}
                    >
                      {active ? "Desativar" : "Reativar"}
                    </Button>
                  </div>
                  {editing && (
                    <div className="space-y-2 border-t border-[var(--wq-border)] pt-2">
                      <HintChips
                        selected={editingHint}
                        onToggle={(sid) =>
                          toggleOrderedHint(sid, editingHint, setEditingHint)
                        }
                      />
                      <Button
                        size="sm"
                        className="rounded-[10px] bg-[var(--wq-action)] hover:bg-[var(--wq-action)]/90"
                        onClick={() => saveHint(s)}
                      >
                        Salvar rota
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
