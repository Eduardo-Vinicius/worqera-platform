"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AppHeader } from "@/components/shell/AppHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  addShopMemberV1,
  createShopInviteV1,
  listSectorsV1,
  listShopMembersV1,
  patchShopMemberV1,
  resetShopMemberPasswordV1,
} from "@/lib/apiV1"
import { toast } from "sonner"

type Member = {
  id: string
  role: string
  active: boolean
  sectorIds?: string[]
  user?: { email?: string; name?: string }
}

type Sector = { _id: string; name: string }

function normalizeIds(ids?: string[]) {
  return (ids || []).map(String)
}

export default function EquipePage() {
  const [members, setMembers] = useState<Member[]>([])
  const [sectors, setSectors] = useState<Sector[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState("atendimento")
  const [sectorIds, setSectorIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("atendimento")
  const [inviteSectors, setInviteSectors] = useState<string[]>([])
  const [inviting, setInviting] = useState(false)

  const [editId, setEditId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState("atendimento")
  const [editSectors, setEditSectors] = useState<string[]>([])
  const [editSaving, setEditSaving] = useState(false)

  const [resetId, setResetId] = useState<string | null>(null)
  const [resetPassword, setResetPassword] = useState("")
  const [resetSaving, setResetSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [mRes, sRes] = await Promise.all([listShopMembersV1(), listSectorsV1()])
      const list = Array.isArray(mRes) ? mRes : (mRes as any).members || []
      setMembers(list)
      setSectors((sRes.sectors || []).filter((s: any) => s.active !== false))
    } catch (err: any) {
      toast.error(err?.message || "Erro ao carregar equipe")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const toggleSector = (id: string, setter: (fn: (prev: string[]) => string[]) => void) => {
    setter((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const SectorChips = ({
    selected,
    onToggle,
  }: {
    selected: string[]
    onToggle: (id: string) => void
  }) => (
    <div className="flex flex-wrap gap-2">
      {sectors.map((s) => {
        const id = String(s._id)
        const on = selected.includes(id)
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
            {s.name}
          </button>
        )
      })}
    </div>
  )

  const add = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error("E-mail e senha são obrigatórios")
      return
    }
    if (role === "sector" && sectorIds.length === 0) {
      toast.error("Selecione ao menos um setor para a conta setor")
      return
    }
    setSaving(true)
    try {
      await addShopMemberV1({
        email: email.trim(),
        password,
        name: name.trim() || undefined,
        role,
        sectorIds: role === "sector" ? sectorIds : [],
      })
      toast.success("Membro adicionado")
      setEmail("")
      setPassword("")
      setName("")
      setRole("atendimento")
      setSectorIds([])
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Falha ao adicionar")
    } finally {
      setSaving(false)
    }
  }

  const invite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("E-mail do convite é obrigatório")
      return
    }
    if (inviteRole === "sector" && inviteSectors.length === 0) {
      toast.error("Selecione ao menos um setor para a conta setor")
      return
    }
    setInviting(true)
    try {
      const res = await createShopInviteV1({
        email: inviteEmail.trim(),
        role: inviteRole,
        sectorIds: inviteRole === "sector" ? inviteSectors : [],
        appBaseUrl: typeof window !== "undefined" ? window.location.origin : undefined,
      })
      const bits = [res.url, res.devToken ? `devToken: ${res.devToken}` : null]
        .filter(Boolean)
        .join(" · ")
      toast.success(bits ? `Convite criado — ${bits}` : "Convite criado")
      setInviteEmail("")
      setInviteRole("atendimento")
      setInviteSectors([])
    } catch (err: any) {
      toast.error(err?.message || "Falha ao convidar")
    } finally {
      setInviting(false)
    }
  }

  const setActive = async (m: Member, active: boolean) => {
    try {
      await patchShopMemberV1(m.id, { active })
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Falha ao atualizar")
    }
  }

  const startEdit = (m: Member) => {
    setEditId(m.id)
    setEditRole(m.role === "owner" ? "admin" : m.role)
    setEditSectors(normalizeIds(m.sectorIds))
    setResetId(null)
    setResetPassword("")
  }

  const saveEdit = async (m: Member) => {
    if (editRole === "sector" && editSectors.length === 0) {
      toast.error("Selecione ao menos um setor")
      return
    }
    setEditSaving(true)
    try {
      await patchShopMemberV1(m.id, {
        role: editRole,
        sectorIds: editRole === "sector" ? editSectors : [],
      })
      toast.success("Membro atualizado")
      setEditId(null)
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Falha ao salvar")
    } finally {
      setEditSaving(false)
    }
  }

  const doReset = async (m: Member) => {
    if (!resetPassword || resetPassword.length < 6) {
      toast.error("Senha mínima de 6 caracteres")
      return
    }
    setResetSaving(true)
    try {
      await resetShopMemberPasswordV1(m.id, resetPassword)
      toast.success("Senha redefinida")
      setResetId(null)
      setResetPassword("")
    } catch (err: any) {
      toast.error(err?.message || "Falha ao redefinir senha")
    } finally {
      setResetSaving(false)
    }
  }

  const sectorName = (id: string) =>
    sectors.find((s) => String(s._id) === String(id))?.name || id

  return (
    <div className="-mx-5 -mt-6 md:-mx-8 md:-mt-7">
      <AppHeader
        title="Equipe"
        subtitle="Logins da oficina (owner / admin / atendimento / setor)"
        actions={
          <Button asChild variant="outline" size="sm" className="rounded-[10px]">
            <Link href="/settings/setores">Setores</Link>
          </Button>
        }
      />

      <div className="mx-auto max-w-[900px] space-y-5 px-5 py-6 md:px-8">
        <div className="rounded-2xl border border-[var(--wq-border)] bg-white p-5 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--wq-text-muted)]">
            Novo membro
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input className="rounded-[10px]" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input
                className="rounded-[10px]"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Senha inicial</Label>
              <Input
                className="rounded-[10px]"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="rounded-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="atendimento">Atendimento</SelectItem>
                  <SelectItem value="sector">Setor (chão)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {role === "sector" && (
            <div className="space-y-2">
              <Label>Setores visíveis</Label>
              <SectorChips
                selected={sectorIds}
                onToggle={(id) => toggleSector(id, setSectorIds)}
              />
            </div>
          )}

          <Button
            type="button"
            onClick={add}
            disabled={saving}
            className="rounded-[10px] bg-[var(--wq-action)] hover:bg-[var(--wq-action)]/90"
          >
            {saving ? "Salvando…" : "Adicionar"}
          </Button>
        </div>

        <div className="rounded-2xl border border-[var(--wq-border)] bg-white p-5 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--wq-text-muted)]">
            Convidar por e-mail
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input
                className="rounded-[10px]"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="rounded-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="atendimento">Atendimento</SelectItem>
                  <SelectItem value="sector">Setor (chão)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {inviteRole === "sector" && (
            <div className="space-y-2">
              <Label>Setores visíveis</Label>
              <SectorChips
                selected={inviteSectors}
                onToggle={(id) => toggleSector(id, setInviteSectors)}
              />
            </div>
          )}
          <Button
            type="button"
            onClick={invite}
            disabled={inviting}
            variant="outline"
            className="rounded-[10px]"
          >
            {inviting ? "Enviando…" : "Enviar convite"}
          </Button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-white">
          <div className="border-b border-[var(--wq-border)] bg-[var(--wq-paper)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--wq-text-muted)]">
            Membros {loading ? "…" : `(${members.length})`}
          </div>
          <ul className="divide-y divide-[var(--wq-border)]">
            {members.map((m) => {
              const editing = editId === m.id
              const resetting = resetId === m.id
              const ids = normalizeIds(m.sectorIds)
              return (
                <li key={m.id} className="space-y-3 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{m.user?.name || "—"}</p>
                      <p className="text-xs text-[var(--wq-text-muted)]">{m.user?.email}</p>
                      {m.role === "sector" && ids.length > 0 && !editing && (
                        <p className="mt-1 text-xs text-[var(--wq-text-muted)]">
                          Setores: {ids.map(sectorName).join(", ")}
                        </p>
                      )}
                    </div>
                    {!editing && (
                      <span className="rounded-full border border-[var(--wq-border)] px-2.5 py-0.5 text-xs font-medium">
                        {m.role}
                      </span>
                    )}
                    <span className="text-xs text-[var(--wq-text-muted)]">
                      {m.active ? "Ativo" : "Inativo"}
                    </span>
                    {m.role !== "owner" && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-[8px]"
                          onClick={() => (editing ? setEditId(null) : startEdit(m))}
                        >
                          {editing ? "Cancelar" : "Editar"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-[8px]"
                          onClick={() => {
                            setResetId(resetting ? null : m.id)
                            setResetPassword("")
                            setEditId(null)
                          }}
                        >
                          {resetting ? "Cancelar senha" : "Reset senha"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-[8px]"
                          onClick={() => setActive(m, !m.active)}
                        >
                          {m.active ? "Desativar" : "Reativar"}
                        </Button>
                      </>
                    )}
                  </div>

                  {editing && m.role !== "owner" && (
                    <div className="space-y-3 rounded-xl border border-[var(--wq-border)] bg-[var(--wq-paper)] p-3">
                      <div className="max-w-xs space-y-1.5">
                        <Label>Role</Label>
                        <Select value={editRole} onValueChange={setEditRole}>
                          <SelectTrigger className="rounded-[10px] bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="atendimento">Atendimento</SelectItem>
                            <SelectItem value="sector">Setor (chão)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {editRole === "sector" && (
                        <div className="space-y-2">
                          <Label>Setores</Label>
                          <SectorChips
                            selected={editSectors}
                            onToggle={(id) => toggleSector(id, setEditSectors)}
                          />
                        </div>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        disabled={editSaving}
                        className="rounded-[8px] bg-[var(--wq-action)] hover:bg-[var(--wq-action)]/90"
                        onClick={() => saveEdit(m)}
                      >
                        {editSaving ? "Salvando…" : "Salvar"}
                      </Button>
                    </div>
                  )}

                  {resetting && m.role !== "owner" && (
                    <div className="flex flex-wrap items-end gap-2 rounded-xl border border-[var(--wq-border)] bg-[var(--wq-paper)] p-3">
                      <div className="min-w-[180px] flex-1 space-y-1.5">
                        <Label>Nova senha</Label>
                        <Input
                          type="password"
                          minLength={6}
                          className="rounded-[10px] bg-white"
                          value={resetPassword}
                          onChange={(e) => setResetPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        disabled={resetSaving}
                        className="rounded-[8px] bg-[var(--wq-action)] hover:bg-[var(--wq-action)]/90"
                        onClick={() => doReset(m)}
                      >
                        {resetSaving ? "…" : "Confirmar"}
                      </Button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
