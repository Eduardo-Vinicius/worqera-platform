"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Mail, Plus, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createSectorV1, listSectorsV1, reorderSectorsV1, updateSectorV1 } from "@/lib/apiV1"
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
}

export default function SetoresSettingsPage() {
  const [sectors, setSectors] = useState<Sector[]>([])
  const [name, setName] = useState("")
  const [color, setColor] = useState("#2196F3")
  const [notifyEmail, setNotifyEmail] = useState(false)
  const [isTerminal, setIsTerminal] = useState(false)
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

  const toggleActive = async (s: Sector) => {
    try {
      await updateSectorV1(s._id, { active: !s.active })
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Falha ao atualizar")
    }
  }

  const toggleFlag = async (s: Sector, key: "notifyEmailOnEnter" | "isTerminal", value: boolean) => {
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

  return (
    <div className="-mx-3 -mt-4 sm:-mx-5 sm:-mt-6 md:-mx-8 md:-mt-7">
      <AppHeader
        title="Setores da oficina"
        subtitle="Ordem = colunas do kanban · marque quais disparam e-mail ao cliente"
        actions={
          <Button asChild variant="outline" size="sm" className="rounded-[10px]">
            <Link href="/kanban">Ver kanban</Link>
          </Button>
        }
      />

      <div className="mx-auto max-w-[800px] space-y-5 px-5 py-6 md:px-8">
        <p className="rounded-xl border border-[var(--wq-border)] bg-[var(--wq-surface)] px-4 py-3 text-sm text-[var(--wq-text-muted)]">
          Todo pedido precisa terminar em um setor{" "}
          <strong className="text-[var(--wq-text)]">Final</strong> (ex.: Atendimento final) — a rota
          sempre inclui essa coluna no fim. Com e-mail do cliente e SMTP: ao entrar numa coluna com
          “E-mail”, o cliente recebe aviso; a coluna final marca pronto e avisa retirada. WhatsApp
          continua pelo toast no kanban.
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
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.checked)}
                />
                Disparar e-mail ao entrar
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isTerminal}
                  onChange={(e) => {
                    setIsTerminal(e.target.checked)
                    if (e.target.checked) setNotifyEmail(true)
                  }}
                />
                Coluna final (pedido pronto)
              </label>
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
                <div
                  key={s._id}
                  className={cn(
                    "flex flex-col gap-2 rounded-xl border border-[var(--wq-border)] bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3"
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="truncate font-medium">{s.name}</span>
                    <span className="text-xs text-[var(--wq-text-muted)]">#{i + 1}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      title="E-mail ao entrar nesta coluna"
                      onClick={() => toggleFlag(s, "notifyEmailOnEnter", !s.notifyEmailOnEnter)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium",
                        s.notifyEmailOnEnter
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                          : "border-[var(--wq-border)] text-[var(--wq-text-muted)]"
                      )}
                    >
                      <Mail className="h-3 w-3" />
                      E-mail {s.notifyEmailOnEnter ? "on" : "off"}
                    </button>
                    <button
                      type="button"
                      title="Coluna final = pedido pronto"
                      onClick={() => toggleFlag(s, "isTerminal", !s.isTerminal)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                        s.isTerminal
                          ? "border-[var(--wq-brand)] bg-[var(--wq-brand-soft)] text-[var(--wq-text)]"
                          : "border-[var(--wq-border)] text-[var(--wq-text-muted)]"
                      )}
                    >
                      {s.isTerminal ? "Final ✓" : "Final"}
                    </button>
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
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
