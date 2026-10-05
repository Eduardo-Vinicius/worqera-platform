"use client"

import { useEffect, useState } from "react"
import { Plus } from "lucide-react"
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
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--wq-border)] px-3 py-2"
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
                    <p className={`min-w-0 flex-1 truncate text-sm font-medium ${active ? "" : "text-[var(--wq-text-muted)]"}`}>
                      {item.name}
                      {active ? null : <span className="ml-2 text-xs font-normal">Oculta</span>}
                    </p>
                  )}
                  {editing ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        className="rounded-[10px] bg-[var(--wq-action)] text-white hover:bg-[var(--wq-action)]/90"
                        disabled={busy || !draft.trim()}
                        onClick={() => void saveName(item)}
                      >
                        Salvar
                      </Button>
                      <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setEditingId("")}>
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-[10px]"
                        disabled={busy}
                        onClick={() => {
                          setEditingId(id)
                          setDraft(item.name)
                        }}
                      >
                        Alterar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-[10px]"
                        disabled={busy}
                        onClick={() => void toggleActive(item)}
                      >
                        {active ? "Ocultar" : "Mostrar"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-[10px] text-[var(--wq-danger)]"
                        disabled={busy}
                        onClick={() => void remove(item)}
                      >
                        Apagar
                      </Button>
                    </>
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
