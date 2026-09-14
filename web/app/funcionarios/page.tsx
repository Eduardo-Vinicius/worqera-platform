"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { createFuncionarioService, deleteFuncionarioService, Funcionario, listFuncionariosService, updateFuncionarioService } from "@/lib/apiService"
import { SETORES, SETORES_NOMES } from "@/lib/setores"
import { Loader2, Plus, Save, Users, XCircle } from "lucide-react"
import { toast } from "sonner"

interface FuncionarioFormState {
  nome: string
  setorId: string
  email: string
  telefone: string
  cargo: string
  observacoes: string
  ativo: boolean
}

const EMPTY_FORM: FuncionarioFormState = {
  nome: "",
  setorId: "",
  email: "",
  telefone: "",
  cargo: "",
  observacoes: "",
  ativo: true,
}

const SETOR_OPTIONS = [
  { id: SETORES.ATENDIMENTO_INICIAL, label: SETORES_NOMES[SETORES.ATENDIMENTO_INICIAL] || "Atendimento" },
  { id: SETORES.SAPATARIA, label: SETORES_NOMES[SETORES.SAPATARIA] || "Sapataria" },
  { id: SETORES.COSTURA, label: SETORES_NOMES[SETORES.COSTURA] || "Costura" },
  { id: SETORES.LAVAGEM, label: SETORES_NOMES[SETORES.LAVAGEM] || "Lavagem" },
  { id: SETORES.PINTURA, label: SETORES_NOMES[SETORES.PINTURA] || "Pintura" },
  { id: SETORES.ACABAMENTO, label: SETORES_NOMES[SETORES.ACABAMENTO] || "Acabamento" },
  { id: SETORES.ATENDIMENTO_FINAL, label: SETORES_NOMES[SETORES.ATENDIMENTO_FINAL] || "Finalizado" },
]

export default function FuncionariosPage() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FuncionarioFormState>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filtroSetor, setFiltroSetor] = useState<string>("all")
  const [filtroAtivo, setFiltroAtivo] = useState<string>("todos")

  const loadFuncionarios = async () => {
    try {
      setLoading(true)
      const list = await listFuncionariosService()
      setFuncionarios(list || [])
    } catch (err: any) {
      toast.error(err?.message || "Erro ao carregar funcionários")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFuncionarios()
  }, [])

  const filteredFuncionarios = useMemo(() => {
    return funcionarios.filter((f) => {
      const matchSetor = filtroSetor === "all" ? true : f.setorId === filtroSetor
      const matchAtivo = filtroAtivo === "ativos" ? f.ativo : filtroAtivo === "inativos" ? !f.ativo : true
      return matchSetor && matchAtivo
    })
  }, [funcionarios, filtroSetor, filtroAtivo])

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome.trim()) {
      toast.error("Informe o nome do funcionário")
      return
    }
    if (!form.setorId) {
      toast.error("Selecione o setor")
      return
    }

    try {
      setSaving(true)
      if (editingId) {
        await updateFuncionarioService(editingId, form)
        toast.success("Funcionário atualizado")
      } else {
        await createFuncionarioService(form)
        toast.success("Funcionário criado")
      }
      resetForm()
      await loadFuncionarios()
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar funcionário")
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (func: Funcionario) => {
    setForm({
      nome: func.nome || "",
      setorId: func.setorId || "",
      email: func.email || "",
      telefone: func.telefone || "",
      cargo: func.cargo || "",
      observacoes: func.observacoes || "",
      ativo: typeof func.ativo === "boolean" ? func.ativo : true,
    })
    setEditingId(func.id)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm("Deseja desativar este funcionário?")
    if (!confirmDelete) return
    try {
      await deleteFuncionarioService(id)
      toast.success("Funcionário desativado")
      await loadFuncionarios()
    } catch (err: any) {
      toast.error(err?.message || "Erro ao desativar funcionário")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <header className="bg-white shadow-lg border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 font-serif">Funcionários</h1>
                <p className="text-sm text-slate-600">Cadastre, edite e desative funcionários por setor</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => window.location.href = "/dashboard"}>
              Voltar ao Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-slate-800">
              {editingId ? <Save className="w-5 h-5 mr-2 text-blue-600" /> : <Plus className="w-5 h-5 mr-2 text-blue-600" />}
              {editingId ? "Editar funcionário" : "Novo funcionário"}
            </CardTitle>
            <CardDescription>Preencha os dados do funcionário e associe ao setor</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome</Label>
                  <Input
                    id="nome"
                    value={form.nome}
                    onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))}
                    placeholder="Nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Setor</Label>
                  <Select
                    value={form.setorId}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, setorId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o setor" />
                    </SelectTrigger>
                    <SelectContent>
                      {SETOR_OPTIONS.map((setor) => (
                        <SelectItem key={setor.id} value={setor.id}>{setor.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="email@empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={form.telefone}
                    onChange={(e) => setForm((prev) => ({ ...prev, telefone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cargo">Cargo/Função</Label>
                  <Input
                    id="cargo"
                    value={form.cargo}
                    onChange={(e) => setForm((prev) => ({ ...prev, cargo: e.target.value }))}
                    placeholder="Ex: Técnico, Atendente"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.ativo ? "ativo" : "inativo"}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, ativo: value === "ativo" }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={form.observacoes}
                  onChange={(e) => setForm((prev) => ({ ...prev, observacoes: e.target.value }))}
                  placeholder="Observações internas, habilidades, horários, etc."
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {editingId ? "Salvar alterações" : "Cadastrar"}
                    </>
                  )}
                </Button>
                {editingId && (
                  <Button type="button" variant="ghost" onClick={resetForm}>
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancelar edição
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-slate-800">Lista de funcionários</CardTitle>
              <CardDescription>Filtre por setor e status para localizar rapidamente</CardDescription>
            </div>
            <div className="flex gap-3">
              <Select value={filtroSetor} onValueChange={setFiltroSetor}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todos os setores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os setores</SelectItem>
                  {SETOR_OPTIONS.map((setor) => (
                    <SelectItem key={setor.id} value={setor.id}>{setor.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filtroAtivo} onValueChange={setFiltroAtivo}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativos">Ativos</SelectItem>
                  <SelectItem value="inativos">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-10 text-slate-600">
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Carregando funcionários...
              </div>
            ) : filteredFuncionarios.length === 0 ? (
              <div className="text-center py-10 text-slate-500">Nenhum funcionário encontrado.</div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Nome</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Setor</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Contato</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredFuncionarios.map((func) => (
                      <tr key={func.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{func.nome}</div>
                          {func.cargo && <div className="text-sm text-slate-600">{func.cargo}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                            {SETORES_NOMES[func.setorId] || func.setorId}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {func.email && <div>{func.email}</div>}
                          {func.telefone && <div className="text-slate-500">{func.telefone}</div>}
                        </td>
                        <td className="px-4 py-3">
                          {func.ativo ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Ativo</Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-700 border-slate-200">Inativo</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(func)}>
                            Editar
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDelete(func.id)}>
                            Desativar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
