"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, Plus } from "lucide-react"
import Link from "next/link"
import { getClientesService, updateClienteService } from "@/lib/apiService"
import { toast } from "sonner"
import { AppHeader } from "@/components/shell/AppHeader"
import { CrmHome } from "@/components/crm/CrmHome"
import { CrmList } from "@/components/crm/CrmList"
import { BirthdayField, birthdayPayload, type BirthdayValue } from "@/components/crm/BirthdayField"
import { CRM_TABS, birthdayLabel, type CrmTab } from "@/components/crm/crmUi"
import { cn } from "@/lib/utils"

const maskCpf = (value?: string) => {
  const digits = (value || "").replace(/\D/g, "");
  if (digits.length !== 11) return value || "";
  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const maskPhone = (value?: string) => {
  const digits = (value || "").replace(/\D/g, "");
  if (digits.length < 8) return value || "";
  return `(**) *****-${digits.slice(-4)}`;
};

function pedidosHref(client: { cpf?: string; nomeCompleto?: string; name?: string }) {
  if (client.cpf) {
    return `/consultas?searchType=cpf&searchTerm=${encodeURIComponent((client.cpf || "").replace(/\D/g, ""))}&tab=pedidos`
  }
  return `/consultas?searchType=nome&searchTerm=${encodeURIComponent(client.nomeCompleto || client.name || "")}&tab=pedidos`
}

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [found, setFound] = useState<{ term: string; rows: any[] } | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [tab, setTabState] = useState<CrmTab>("base");
  const [birthday, setBirthday] = useState<BirthdayValue>(null);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab") as CrmTab | null;
    if (t && CRM_TABS.some((x) => x.id === t)) setTabState(t);
  }, []);

  const setTab = (next: CrmTab) => {
    setTabState(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url.toString());
  };

  useEffect(() => {
    async function fetchClients() {
      try {
        const data = await getClientesService({ limit: 200 });
        setClients(data.data);
      } catch (err: any) {
        setError("Erro ao buscar clientes");
        toast.error("Erro ao buscar clientes");
      } finally {
        setLoading(false);
      }
    }
    fetchClients();
  }, []);

  useEffect(() => {
    const term = searchTerm.trim();
    if (term.length < 2) {
      setFound(null);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(() => {
      getClientesService({ q: term, limit: 40, forceRefresh: true })
        .then((res) => {
          if (!cancelled) setFound({ term: term.toLowerCase(), rows: res.data || [] });
        })
        .catch(() => {
          if (!cancelled) setFound(null);
        });
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [searchTerm]);

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
      observacoes: client.observacoes || client.notes || "",
      tags: (client.tags || []).join(", "),
      source: client.source || "",
    });
    setBirthday(client.birthday || null);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const bday = birthdayPayload(birthday);
      const payload = { ...editForm, ...(bday !== undefined ? { birthday: bday } : {}) };
      await updateClienteService(editingClient.id, payload as never);
      const updatedClients = clients.map(client =>
        client.id === editingClient.id
          ? { ...client, ...editForm, birthday: bday ?? null, tags: String(editForm.tags || "").split(",").map((t: string) => t.trim()).filter(Boolean) }
          : client
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

  const term = searchTerm.trim().toLowerCase()
  const digits = searchTerm.replace(/\D/g, "")
  const localMatches = clients.filter((client) => {
    const name = (client.nomeCompleto || client.name || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
    const folded = term.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    const phoneDigits = String(client.telefone || client.phone || "").replace(/\D/g, "")
    const cpfDigits = String(client.cpf || "").replace(/\D/g, "")
    return (
      name.includes(folded) ||
      client.cpf?.toLowerCase().includes(term) ||
      (client.telefone || client.phone || "").toLowerCase().includes(term) ||
      (client.email || "").toLowerCase().includes(term) ||
      (digits.length > 0 && (phoneDigits.includes(digits) || cpfDigits.includes(digits)))
    )
  })
  const filteredClients = found && found.term === term ? found.rows : localMatches

  const countLabel = `${filteredClients.length} ${filteredClients.length === 1 ? "cliente" : "clientes"}`

  return (
    <div className="-mx-3 -mt-4 sm:-mx-5 sm:-mt-6 md:-mx-8 md:-mt-7">
      <AppHeader
        title="Clientes"
        subtitle="Base, aniversariantes, sumidos e recorrentes"
        actions={
          <Button asChild size="sm" className="rounded-[10px] bg-[var(--wq-action)] text-white hover:bg-[var(--wq-action)]/90">
            <Link href="/clientes/novo">
              <Plus className="mr-1.5 h-4 w-4" />
              Novo cliente
            </Link>
          </Button>
        }
      />

      <div className="mx-auto max-w-[1320px] space-y-4 px-3 py-4 sm:px-5 sm:py-6 md:px-8">
        <nav className="grid grid-cols-3 gap-1 rounded-xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-1 sm:grid-cols-6" aria-label="CRM">
          {CRM_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "min-w-0 truncate rounded-lg px-2 py-2 text-xs font-semibold transition sm:text-sm",
                tab === t.id ? "bg-[var(--wq-brand)] text-white shadow-sm" : "text-[var(--wq-text-muted)] hover:text-[var(--wq-text)]"
              )}
            >
              <span className="sm:hidden">{t.short}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </nav>

        {tab === "base" ? <CrmHome onTab={setTab} /> : null}
        {CRM_TABS.find((t) => t.id === tab)?.segment ? <CrmList segment={CRM_TABS.find((t) => t.id === tab)!.segment!} /> : null}

        {tab === "todos" ? (
        <>
        <div className="relative min-w-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--wq-text-muted)]" />
          <Input
            placeholder="Buscar por nome, telefone, CPF ou e-mail…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-11 w-full rounded-[10px] border-[var(--wq-border)] bg-white pl-9 text-base sm:h-12"
          />
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-[var(--wq-text-muted)]">Carregando clientes…</p>
        ) : error ? (
          <p className="py-10 text-center text-sm text-[var(--wq-danger)]">{error}</p>
        ) : (
          <>
            <p className="text-sm text-[var(--wq-text-muted)]">{countLabel}</p>

            {filteredClients.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--wq-border)] bg-white px-4 py-12 text-center sm:px-6 sm:py-16">
                <p className="text-[var(--wq-text)]">
                  {clients.length === 0 ? "Nenhum cliente cadastrado." : "Nenhum cliente encontrado."}
                </p>
                <p className="mt-1 text-sm text-[var(--wq-text-muted)]">
                  {clients.length === 0
                    ? "Cadastre o primeiro cliente para começar a receber pedidos."
                    : "Tente outro termo de busca."}
                </p>
                {clients.length === 0 ? (
                  <Button asChild className="mt-4 bg-[var(--wq-action)] text-white hover:bg-[var(--wq-action)]/90">
                    <Link href="/clientes/novo">Novo cliente</Link>
                  </Button>
                ) : null}
              </div>
            ) : (
              <ul className="divide-y divide-[var(--wq-border)] overflow-hidden rounded-[10px] border border-[var(--wq-border)] bg-white">
                {filteredClients.map((client, idx) => {
                  const name = client.nomeCompleto || client.name || "—"
                  const phone = maskPhone(client.telefone || client.phone)
                  const cpf = maskCpf(client.cpf)
                  return (
                    <li
                      key={client.id || idx}
                      className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:gap-3 sm:px-4 sm:py-2.5 hover:bg-[var(--wq-paper)]"
                    >
                      <Link href={`/clientes/${client.id}`} className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-[var(--wq-text)]">{name}</p>
                        <p className="truncate text-sm text-[var(--wq-text-muted)]">
                          {phone || "Sem telefone"}
                          {cpf ? <span className="ml-2 text-xs">{cpf}</span> : null}
                          {client.birthday ? <span className="ml-2 text-xs">aniv. {birthdayLabel(client.birthday)}</span> : null}
                        </p>
                      </Link>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2.5 text-[var(--wq-text)] hover:bg-[var(--wq-paper)] hover:text-[var(--wq-text)]"
                          onClick={() => openEditModal(client)}
                        >
                          Editar
                        </Button>
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2.5 text-[var(--wq-text)] hover:bg-[var(--wq-paper)] hover:text-[var(--wq-text)]"
                        >
                          <Link href={pedidosHref(client)}>Pedidos</Link>
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}
        </>
        ) : null}
      </div>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>
              Altere os dados do cliente. Somente os campos preenchidos serão atualizados.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="edit-birthday">Aniversário</Label>
                <BirthdayField id="edit-birthday" value={birthday} onChange={setBirthday} />
              </div>
              <div>
                <Label htmlFor="source">Como conheceu a loja</Label>
                <Input
                  id="source"
                  list="client-sources"
                  value={editForm.source || ""}
                  onChange={(e) => setEditForm({...editForm, source: e.target.value})}
                  placeholder="Indicação, Instagram, Google…"
                />
                <datalist id="client-sources">
                  {["Indicação", "Instagram", "Google", "Passou na frente", "WhatsApp", "Outro"].map((s) => <option key={s} value={s} />)}
                </datalist>
              </div>
            </div>

            <div>
              <Label htmlFor="tags">Etiquetas</Label>
              <Input
                id="tags"
                value={editForm.tags || ""}
                onChange={(e) => setEditForm({...editForm, tags: e.target.value})}
                placeholder="VIP, empresa, sempre pede urgência (separe por vírgula)"
              />
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
