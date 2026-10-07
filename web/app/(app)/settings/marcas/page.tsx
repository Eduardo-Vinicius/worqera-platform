"use client"

import { useEffect, useState } from "react"
import { Check, Eye, EyeOff, Pencil, Plus, Trash2, X } from "lucide-react"
import { AppHeader } from "@/components/shell/AppHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createBrandV1, deleteBrandV1, listBrandsV1, patchBrandV1 } from "@/lib/apiV1"
import { toast } from "sonner"

type Brand = {
  _id?: string
  id?: string
  name: string
  active?: boolean
}

function brandId(item: Brand) {
  return String(item._id || item.id || "")
}

export default function MarcasSettingsPage() {
  const [items, setItems] = useState<Brand[]>([])
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState("")
  const [draft, setDraft] = useState("")
  const [busyId, setBusyId] = useState("")

  const load = async () => {
    setLoading(true)
    try {
      const res = await listBrandsV1()
      setItems(res.brands || [])
    } catch (err: any) {
      toast.error(err?.message || "Erro ao listar marcas")
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
      await createBrandV1({ name: next })
      setName("")
      toast.success("Marca cadastrada")
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Falha ao cadastrar")
    } finally {
      setSaving(false)
    }
  }

  const saveName = async (item: Brand) => {
    const id = brandId(item)
    const next = draft.trim()
    if (!id || !next || next === item.name) {
      setEditingId("")
      return
    }
    setBusyId(id)
    try {
      await patchBrandV1(id, { name: next })
      toast.success("Nome atualizado nos pedidos também")
      setEditingId("")
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Falha ao alterar")
    } finally {
      setBusyId("")
    }
  }

  const toggleActive = async (item: Brand) => {
    const id = brandId(item)
    if (!id) return
    setBusyId(id)
    try {
      await patchBrandV1(id, { active: item.active === false })
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Falha ao atualizar")
    } finally {
      setBusyId("")
    }
  }

  const remove = async (item: Brand) => {
    const id = brandId(item)
    if (!id) return
    if (!window.confirm(`Apagar “${item.name}”? Pedidos antigos continuam com o nome.`)) return
    setBusyId(id)
    try {
      await deleteBrandV1(id)
      toast.success("Marca apagada")
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Falha ao apagar")
    } finally {
      setBusyId("")
    }
  }

  return (
    <div className="-mx-3 -mt-4 sm:-mx-5 sm:-mt-6 md:-mx-8 md:-mt-7">
      <AppHeader
        title="Marcas"
        subtitle="Lista da loja. Corrigir o nome também corrige os pedidos que usam essa marca."
      />
      <div className="mx-auto max-w-[800px] space-y-5 px-5 py-6 md:px-8">
        <Card className="rounded-2xl border-[var(--wq-border)] shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Nova marca</CardTitle>
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
              placeholder="Ex.: Zegna, Nike, Common Projects…"
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
            <CardTitle className="text-base">Marcas da loja</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-[var(--wq-text-muted)]">
              O combo do pedido usa esta lista. Ocultar tira do combo. Apagar não mexe nos pedidos já feitos.
            </p>
            {loading ? <p className="text-sm text-[var(--wq-text-muted)]">Carregando…</p> : null}
            {!loading && items.length === 0 ? (
              <p className="text-sm text-[var(--wq-text-muted)]">Nenhuma marca cadastrada.</p>
            ) : null}
            {items.map((item) => {
              const id = brandId(item) || item.name
              const active = item.active !== false
              const editing = editingId === id
              const busy = busyId === id
              return (
                <div
                  key={id}
                  className="flex min-w-0 items-center gap-2 rounded-xl border border-[var(--wq-border)] px-3 py-2"
                >
                  {editing ? (
                    <Input
                      value={draft}
                      autoFocus
                      disabled={busy}
                      className="h-9 min-w-0 flex-1 rounded-[10px]"
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          void saveName(item)
                        }
                        if (e.key === "Escape") setEditingId("")
                      }}
                    />
                  ) : (
                    <p className={`min-w-0 flex-1 truncate text-sm font-medium ${active ? "" : "text-[var(--wq-text-muted)] line-through"}`}>
                      {item.name}
                    </p>
                  )}
                  {editing ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        size="icon"
                        className="h-9 w-9 rounded-[10px] bg-[var(--wq-action)] text-white hover:bg-[var(--wq-action)]/90"
                        disabled={busy || !draft.trim()}
                        aria-label="Salvar nome"
                        onClick={() => void saveName(item)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" className="h-9 w-9" disabled={busy} aria-label="Cancelar" onClick={() => setEditingId("")}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-[10px] text-[var(--wq-text-muted)]"
                        disabled={busy}
                        aria-label="Editar nome"
                        onClick={() => {
                          setEditingId(id)
                          setDraft(item.name)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-[10px] text-[var(--wq-text-muted)]"
                        disabled={busy}
                        aria-label={active ? "Ocultar marca" : "Mostrar marca"}
                        onClick={() => void toggleActive(item)}
                      >
                        {active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-[10px] text-[var(--wq-danger)]"
                        disabled={busy}
                        aria-label="Apagar marca"
                        onClick={() => void remove(item)}
                      >
                        <Trash2 className="h-4 w-4" />
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
