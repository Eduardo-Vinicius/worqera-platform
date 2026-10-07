"use client"

import { useEffect, useState } from "react"
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react"
import { AppHeader } from "@/components/shell/AppHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  createAccessoryV1,
  deleteAccessoryV1,
  listAccessoriesV1,
  patchAccessoryV1,
} from "@/lib/apiV1"
import { toast } from "sonner"

type Accessory = {
  _id?: string
  id?: string
  name: string
  active?: boolean
}

function accessoryId(item: Accessory) {
  return String(item._id || item.id || "")
}

export default function AcessoriosSettingsPage() {
  const [items, setItems] = useState<Accessory[]>([])
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await listAccessoriesV1()
      setItems(res.accessories || [])
    } catch (err: any) {
      toast.error(err?.message || "Erro ao listar acessórios")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const add = async () => {
    const next = name.trim()
    if (!next) return
    setSaving(true)
    try {
      await createAccessoryV1({ name: next })
      setName("")
      toast.success("Acessório cadastrado")
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Falha ao cadastrar")
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (item: Accessory) => {
    const id = accessoryId(item)
    if (!id) return
    try {
      await patchAccessoryV1(id, { active: item.active === false })
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Falha ao atualizar")
    }
  }

  const remove = async (item: Accessory) => {
    const id = accessoryId(item)
    if (!id) return
    if (!window.confirm(`Apagar “${item.name}”? Pedidos antigos continuam com o nome.`)) return
    try {
      await deleteAccessoryV1(id)
      toast.success("Acessório apagado")
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Falha ao apagar")
    }
  }

  return (
    <div className="-mx-3 -mt-4 sm:-mx-5 sm:-mt-6 md:-mx-8 md:-mt-7">
      <AppHeader
        title="Acessórios"
        subtitle="O que o cliente pode deixar junto do pedido. Cada loja cadastra a própria lista."
      />
      <div className="mx-auto max-w-[800px] space-y-5 px-5 py-6 md:px-8">
      <Card className="rounded-2xl border-[var(--wq-border)] shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Novo acessório</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                void add()
              }
            }}
            placeholder="Ex.: caixa, cadarço, nota fiscal…"
            className="rounded-[10px]"
          />
          <Button
            type="button"
            onClick={() => void add()}
            disabled={saving || !name.trim()}
            className="bg-[var(--wq-action)] hover:bg-[var(--wq-action)]/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-[var(--wq-border)] shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Acessórios da loja</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-[var(--wq-text-muted)]">
            O cadastro do pedido mostra esta lista. Cada empresa monta a dela.
          </p>
          {loading ? <p className="text-sm text-[var(--wq-text-muted)]">Carregando…</p> : null}
          {!loading && items.length === 0 ? (
            <p className="text-sm text-[var(--wq-text-muted)]">Nenhum acessório cadastrado.</p>
          ) : null}
          {items.map((item) => {
            const active = item.active !== false
            return (
              <div
                key={accessoryId(item) || item.name}
                className="flex min-w-0 items-center gap-2 rounded-xl border border-[var(--wq-border)] px-3 py-2"
              >
                <p className={`min-w-0 flex-1 truncate text-sm font-medium ${active ? "" : "text-[var(--wq-text-muted)] line-through"}`}>
                  {item.name}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-[10px] text-[var(--wq-text-muted)]"
                  aria-label={active ? "Ocultar acessório" : "Mostrar acessório"}
                  onClick={() => void toggleActive(item)}
                >
                  {active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-[10px] text-[var(--wq-danger)]"
                  aria-label="Apagar acessório"
                  onClick={() => void remove(item)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )
          })}
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
