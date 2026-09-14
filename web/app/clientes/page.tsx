"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Search, Plus, Phone, Mail, MapPin, ArrowLeft, Edit, BarChart3 } from "lucide-react"
import Link from "next/link"
import { getClientesService, updateClienteService } from "@/lib/apiService"
import { toast } from "sonner"

const maskCpf = (value?: string) => {
  const digits = (value || "").replace(/\D/g, "");
  if (digits.length !== 11) return value || "-";
  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const maskPhone = (value?: string) => {
  const digits = (value || "").replace(/\D/g, "");
  if (digits.length < 8) return value || "-";
  return `(**) *****-${digits.slice(-4)}`;
};

const maskEmail = (value?: string) => {
  if (!value || !value.includes("@")) return value || "-";
  const [local, domain] = value.split("@");
  const visible = local.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(local.length - visible.length, 1))}@${domain}`;
};

const maskAddress = (logradouro?: string, numero?: string, bairro?: string, cidade?: string, estado?: string) => {
  const cityState = [cidade, estado].filter(Boolean).join(" - ");
  const district = bairro ? `${bairro}` : "Bairro não informado";
  const streetHint = logradouro ? `${logradouro.split(" ")[0]}...` : "Endereço oculto";
  const numberHint = numero ? `nº ${String(numero).slice(-2).padStart(2, "*")}` : "nº **";
  return `${streetHint}, ${numberHint} - ${district}${cityState ? `, ${cityState}` : ""}`;
};

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function fetchClients() {
      try {
        const data = await getClientesService();
        setClients(data);
      } catch (err: any) {
        setError("Erro ao buscar clientes");
        toast.error("Erro ao buscar clientes");
      } finally {
        setLoading(false);
      }
    }
    fetchClients();
  }, []);

  const openEditModal = (client: any) => {
    setEditingClient(client);
    setEditForm({
      nomeCompleto: client.nomeCompleto,
      cpf: client.cpf,
      telefone: client.telefone,
      email: client.email,
      cep: client.cep,
      logradouro: client.logradouro,
      numero: client.numero,
      bairro: client.bairro,
      cidade: client.cidade,
      estado: client.estado,
      complemento: client.complemento || "",
      observacoes: client.observacoes || "",
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateClienteService(editingClient.id, editForm);
      const updatedClients = clients.map(client => 
        client.id === editingClient.id ? { ...client, ...editForm } : client
      );
      setClients(updatedClients);
      toast.success("Cliente atualizado com sucesso");
      setIsEditModalOpen(false);
      setEditingClient(null);
    } catch (err: any) {
      toast.error("Erro ao atualizar cliente: " + (err.message || "Tente novamente"));
    } finally {
      setIsSaving(false);
    }
  };

  const filteredClients = clients.filter(
    (client) =>
      client.nomeCompleto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.cpf?.includes(searchTerm) ||
      client.telefone?.includes(searchTerm) ||
      client.email?.toLowerCase().includes(searchTerm),
  );

  if (loading) {
    return <div className="p-8 text-center">Carregando clientes...</div>;
  }
  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary/80">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              </Link>
              <h1 className="text-xl font-bold font-serif">Clientes</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/status">
                <Button variant="secondary" size="sm">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Kanban
                </Button>
              </Link>
              <Link href="/clientes/novo">
                <Button variant="secondary" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Cliente
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Buscar Clientes</CardTitle>
            <CardDescription>Pesquise por nome, CPF, telefone ou email</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Digite para buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Clients List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Lista de Clientes</h2>
            <Badge variant="secondary">{filteredClients.length} clientes encontrados</Badge>
          </div>

          {filteredClients.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">Nenhum cliente encontrado</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredClients.map((client, idx) => (
                <Card key={client.id || idx} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="min-w-0">
                            <h3 className="text-lg font-semibold break-words">{client.nomeCompleto}</h3>
                            <p className="text-sm text-muted-foreground">CPF: {maskCpf(client.cpf)}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2 break-words">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span className="break-all">{maskPhone(client.telefone)}</span>
                          </div>
                          <div className="flex items-center gap-2 break-words">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <span className="break-all">{maskEmail(client.email)}</span>
                          </div>
                          <div className="flex items-start gap-2 col-span-1 md:col-span-2">
                            <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                            <span className="break-words">
                              {maskAddress(client.logradouro, client.numero, client.bairro, client.cidade, client.estado)}
                            </span>
                          </div>
                          {client.observacoes && (
                            <div className="col-span-1 md:col-span-2 text-xs text-muted-foreground italic break-words">Obs: {client.observacoes}</div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
                        <div className="flex flex-wrap gap-2 w-full sm:justify-end">
                          <Link
                            href={(client.cpf ? `/consultas?searchType=cpf&searchTerm=${encodeURIComponent((client.cpf || "").replace(/\D/g, ""))}&tab=pedidos` : `/consultas?searchType=nome&searchTerm=${encodeURIComponent(client.nomeCompleto || client.name || "")}&tab=pedidos`) || "/consultas"}
                            className="flex-1 sm:flex-none"
                          >
                            <Button variant="outline" size="sm" className="w-full">
                              Ver Pedidos
                            </Button>
                          </Link>
                          <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => openEditModal(client)}>
                            <Edit className="w-4 h-4 mr-1" />
                            Editar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Edição */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>
              Altere os dados do cliente. Somente os campos preenchidos serão atualizados.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nomeCompleto">Nome Completo</Label>
                <Input
                  id="nomeCompleto"
                  value={editForm.nomeCompleto || ""}
                  onChange={(e) => setEditForm({...editForm, nomeCompleto: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={editForm.cpf || ""}
                  onChange={(e) => setEditForm({...editForm, cpf: e.target.value})}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={editForm.telefone || ""}
                  onChange={(e) => setEditForm({...editForm, telefone: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editForm.email || ""}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  value={editForm.cep || ""}
                  onChange={(e) => setEditForm({...editForm, cep: e.target.value})}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="logradouro">Logradouro</Label>
                <Input
                  id="logradouro"
                  value={editForm.logradouro || ""}
                  onChange={(e) => setEditForm({...editForm, logradouro: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="numero">Número</Label>
                <Input
                  id="numero"
                  value={editForm.numero || ""}
                  onChange={(e) => setEditForm({...editForm, numero: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="bairro">Bairro</Label>
                <Input
                  id="bairro"
                  value={editForm.bairro || ""}
                  onChange={(e) => setEditForm({...editForm, bairro: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="complemento">Complemento</Label>
                <Input
                  id="complemento"
                  value={editForm.complemento || ""}
                  onChange={(e) => setEditForm({...editForm, complemento: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  value={editForm.cidade || ""}
                  onChange={(e) => setEditForm({...editForm, cidade: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="estado">Estado</Label>
                <Input
                  id="estado"
                  value={editForm.estado || ""}
                  onChange={(e) => setEditForm({...editForm, estado: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={editForm.observacoes || ""}
                onChange={(e) => setEditForm({...editForm, observacoes: e.target.value})}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
