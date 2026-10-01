"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronDown, ChevronUp, Pencil, Plus, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  createSectorV1,
  deleteSectorV1,
  listSectorsV1,
  reorderSectorsV1,
  updateSectorV1,
} from "@/lib/apiV1"
import { toast } from "sonner"
import { AppHeader } from "@/components/shell/AppHeader"
import { cn } from "@/lib/utils"

type Sector = {
  _id: string
  name: string
  order: number
  color: string
  active: boolean
  isTerminal?: boolean
  notifyEmailOnEnter?: boolean
  showOnPublic?: boolean
}

function FlagToggle({
  on,
  title,
  hint,
  onClick,
}: {
  on: boolean
  title: string
  hint: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-14 items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition",
        on
          ? "border-[var(--wq-brand)]/35 bg-[var(--wq-brand-soft)]"
          : "border-[var(--wq-border)] bg-[var(--wq-surface)]"
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-[var(--wq-text)]">{title}</span>
        <span className="block text-xs text-[var(--wq-text-muted)]">{hint}</span>
      </span>
      <span
        className={cn(
          "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
          on ? "bg-[var(--wq-brand)] text-white" : "bg-[var(--wq-paper)] text-[var(--wq-text-muted)]"
        )}
      >
        {on ? "Ligado" : "Desligado"}
      </span>
    </button>
  )
}

export default function SetoresSettingsPage() {
  const [sectors, setSectors] = useState<Sector[]>([])
  const [name, setName] = useState("")
  const [color, setColor] = useState("#2196F3")
  const [notifyEmail, setNotifyEmail] = useState(false)
  const [isTerminal, setIsTerminal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")

  const load = async () => {
    setLoading(true)
    try {
      const res = await listSectorsV1({ includeInactive: true })
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
      await createSectorV1({
        name: name.trim(),
        color,
        order: sectors.length + 1,
        isTerminal,
        notifyEmailOnEnter: notifyEmail || isTerminal,
      })
      setName("")
      setNotifyEmail(false)
      setIsTerminal(false)
      toast.success("Setor criado")
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Falha ao criar")
    }
  }

  const removeSector = async (s: Sector) => {
    const ok = window.confirm(
      `Apagar o setor “${s.name}”? Ele some do kanban. Se ainda tiver pedido nessa coluna, a exclusão é bloqueada.`
    )
    if (!ok) return
    try {
      await deleteSectorV1(s._id)
      toast.success("Setor apagado")
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Falha ao apagar")
    }
  }

  const toggleFlag = async (
    s: Sector,
    key: "notifyEmailOnEnter" | "isTerminal" | "showOnPublic",
    value: boolean
  ) => {
    try {
      const body: Record<string, unknown> = { [key]: value }
      if (key === "isTerminal" && value) body.notifyEmailOnEnter = true
      await updateSectorV1(s._id, body)
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

  const startRename = (s: Sector) => {
    setEditingId(s._id)
    setEditName(s.name)
  }

  const saveRename = async (s: Sector) => {
    const next = editName.trim()
    if (!next || next === s.name) {
      setEditingId(null)
      return
    }
    try {
      await updateSectorV1(s._id, { name: next })
      toast.success("Setor renomeado")
      setEditingId(null)
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Falha ao renomear")
    }
  }

  return (
    <div className="-mx-3 -mt-4 sm:-mx-5 sm:-mt-6 md:-mx-8 md:-mt-7">
      <AppHeader
        title="Setores da empresa"
        subtitle="Só da sua loja — nomeie como quiser; a ordem vira as colunas do kanban"
        actions={
          <Button asChild variant="outline" size="sm" className="rounded-[10px]">
            <Link href="/kanban">Ver kanban</Link>
          </Button>
        }
      />

      <div className="mx-auto max-w-[800px] space-y-5 px-5 py-6 md:px-8">
        <p className="text-sm text-[var(--wq-text-muted)]">
          A ordem vira as colunas do kanban. Em cada setor, ligue o que o cliente vê no QR, se manda
          e-mail ao entrar, e se a coluna é a final (pronto para retirada).
        </p>

        <Card className="rounded-2xl border-[var(--wq-border)] shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Novo setor</CardTitle>
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
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-14 p-1"
              />
              <Button onClick={add} className="bg-[var(--wq-action)] hover:bg-[var(--wq-action)]/90">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <FlagToggle
                on={notifyEmail}
                title="E-mail ao entrar"
                hint="Avisa o cliente quando o pedido chega aqui"
                onClick={() => setNotifyEmail((v) => !v)}
              />
              <FlagToggle
                on={isTerminal}
                title="Coluna final"
                hint="Pedido pronto para retirada"
                onClick={() => {
                  setIsTerminal((v) => {
                    const next = !v
                    if (next) setNotifyEmail(true)
                    return next
                  })
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-[var(--wq-border)] shadow-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Fluxo (ordem do kanban)</CardTitle>
            <Button size="sm" onClick={saveOrder} className="rounded-[10px]">
              <Save className="mr-2 h-4 w-4" />
              Salvar ordem
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <p className="text-[var(--wq-text-muted)]">Carregando…</p>
            ) : sectors.length === 0 ? (
              <p className="text-[var(--wq-text-muted)]">Nenhum setor. Crie o fluxo da sua oficina.</p>
            ) : (
              sectors.map((s, i) => (
                <article
                  key={s._id}
                  className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-paper)] p-4"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    <div className="min-w-0 flex-1">
                      {editingId === s._id ? (
                        <Input
                          autoFocus
                          className="h-9 max-w-xs rounded-[10px]"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={() => void saveRename(s)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              void saveRename(s)
                            }
                            if (e.key === "Escape") setEditingId(null)
                          }}
                        />
                      ) : (
                        <button
                          type="button"
                          className="group inline-flex max-w-full items-center gap-1.5 text-left"
                          onClick={() => startRename(s)}
                          title="Clique para renomear"
                        >
                          <span className="truncate text-base font-medium text-[var(--wq-text)]">
                            {s.name}
                          </span>
                          <Pencil className="h-3.5 w-3.5 shrink-0 text-[var(--wq-text-muted)] opacity-0 group-hover:opacity-100" />
                        </button>
                      )}
                      <p className="mt-0.5 text-xs text-[var(--wq-text-muted)]">
                        Coluna {i + 1}
                        {s.active === false ? " · fora do kanban" : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        aria-label="Subir"
                        onClick={() => move(i, -1)}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        aria-label="Descer"
                        onClick={() => move(i, 1)}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <button
                        type="button"
                        className="ml-1 px-2 text-sm font-medium text-[var(--wq-danger)] hover:underline"
                        onClick={() => removeSector(s)}
                      >
                        Apagar
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <FlagToggle
                      on={s.showOnPublic !== false}
                      title="No QR"
                      hint={
                        s.showOnPublic !== false
                          ? "Cliente vê o nome do setor"
                          : "Cliente vê só “Em andamento”"
                      }
                      onClick={() =>
                        toggleFlag(s, "showOnPublic", s.showOnPublic === false)
                      }
                    />
                    <FlagToggle
                      on={Boolean(s.notifyEmailOnEnter)}
                      title="E-mail"
                      hint="Avisa quando o pedido entra aqui"
                      onClick={() => toggleFlag(s, "notifyEmailOnEnter", !s.notifyEmailOnEnter)}
                    />
                    <FlagToggle
                      on={Boolean(s.isTerminal)}
                      title="Final"
                      hint="Pronto para retirada"
                      onClick={() => toggleFlag(s, "isTerminal", !s.isTerminal)}
                    />
                  </div>
                </article>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
