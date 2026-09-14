"use client"

import { useState, useEffect } from "react"
import { getClientesService, getOrdersStatusService, generateOrderPDFService, updateOrderService, downloadBlobAsFile, getPedidosConsultaService, listFuncionariosService, Funcionario } from "@/lib/apiService"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Search, ArrowLeft, User, Package, Calendar, Filter, FileText, Edit } from "lucide-react"
import Link from "next/link"
import { CardDetalhesPedido, PedidoDetalhes } from "@/components/CardDetalhesPedido"
import { SETORES_CORES, SETORES_NOMES } from "@/lib/setores"
import { toast } from "sonner"

const getStatusBadge = (status: string) => {
  switch (status) {
    case "iniciado":
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          Iniciado
        </Badge>
      )
    case "em-processamento":
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          Em Processamento
        </Badge>
      )
    case "concluido":
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          Concluído
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export default function ConsultasPage() {
  const formatServicos = (value: unknown): string => {
    if (!value) return "";
    if (typeof value === "string") return value;

    if (Array.isArray(value)) {
      return value
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object") {
            const obj = item as Record<string, unknown>;
            return String(obj.nome || obj.name || obj.descricao || obj.id || "").trim();
          }
          return "";
        })
        .filter(Boolean)
        .join(", ");
    }

    if (typeof value === "object") {
      const obj = value as Record<string, unknown>;
      return String(obj.nome || obj.name || obj.descricao || obj.id || "").trim();
    }

    return String(value);
  };

  const extractFotoUrl = (value: unknown): string | null => {
    if (!value) return null;

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (/blob(%3A|:)/i.test(trimmed)) return null;
      if (/^https?:\/\//i.test(trimmed)) return trimmed;
      return null;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const parsed = extractFotoUrl(item);
        if (parsed) return parsed;
      }
      return null;
    }

    if (typeof value === "object") {
      const obj = value as Record<string, unknown>;
      return (
        extractFotoUrl(obj.url) ||
        extractFotoUrl(obj.fotoUrl) ||
        extractFotoUrl(obj.uploadedUrl) ||
        extractFotoUrl(obj.src) ||
        null
      );
    }

    return null;
  };

  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState("nome");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [hasSearched, setHasSearched] = useState(false);
  const [tab, setTab] = useState("clientes");
  const [clients, setClients] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [funcionariosLoading, setFuncionariosLoading] = useState(false);
  const [consultaFilters, setConsultaFilters] = useState({
    codigo: "",
    cliente: "",
    status: "",
    setor: "",
    funcionario: "",
    dataInicio: "",
    dataFim: "",
    limit: 20,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para o modal de detalhes do pedido
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PedidoDetalhes | null>(null);
  
  // Estados para o modal de edição do pedido
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    modeloTenis: '',
    servicos: '',
    descricaoServicos: '',
    price: 0,
    dataPrevistaEntrega: '',
    precoTotal: 0
  });
  const [editLoading, setEditLoading] = useState(false);

  // Função para abrir modal com detalhes do pedido
  const handleViewOrder = (order: any) => {
    const servicosTexto = formatServicos(order.servicos || order.tipoServico || "");
    const fotosValidas = Array.isArray(order.fotos)
      ? (order.fotos as unknown[])
          .map((foto: unknown) => extractFotoUrl(foto))
          .filter((foto: string | null): foto is string => Boolean(foto))
      : [];

    const pedidoDetalhes: PedidoDetalhes = {
      id: order.id?.toString() || '',
      funcionarioAtual: order.funcionarioAtual || '',
      clientId: order.clientId?.toString() || '',
      clientName: order.clientName || `Cliente #${order.clienteId}`,
      clientCpf: order.clientCpf || '',
      clientPhone: order.clientPhone || '',
      sneaker: order.sneaker || order.modeloTenis || '',
      servicos: servicosTexto,
      price: order.precoTotal || order.price || 0,
      status: order.status || '',
      createdDate: order.createdAt || order.dataCriacao || new Date().toLocaleDateString(),
      expectedDate: order.dataPrevistaEntrega || order.expectedDate || '',
      statusHistory: order.statusHistory || [
        {
          status: order.status || 'iniciado',
          date: order.createdAt || order.dataCriacao || new Date().toLocaleDateString(),
          time: new Date().toLocaleTimeString(),
          userId: order.userId,
          userName: order.userName
        }
      ],
      // Novos campos da API
      modeloTenis: order.modeloTenis || order.sneaker || '',
      tipoServico: servicosTexto,
      descricaoServicos: order.descricaoServicos || order.description || '',
      preco: order.preco || order.price || 0,
      precoTotal: order.precoTotal || order.price || 0,
      valorSinal: order.valorSinal || 0,
      valorRestante: order.valorRestante || order.precoTotal || order.price || 0,
      dataPrevistaEntrega: order.dataPrevistaEntrega || order.expectedDate || '',
      dataCriacao: order.dataCriacao || order.createdAt || '',
      fotos: fotosValidas,
      observacoes: order.observacoes || '',
      garantia: order.garantia || { ativa: false, preco: 0, duracao: '' },
      acessorios: order.acessorios || [],
      // Sistema de setores
      setoresFluxo: order.setoresFluxo || order.setores || [],
      setorAtual: order.setorAtual || order.setor || '',
      setoresHistorico: order.setoresHistorico || [],
      // Informações de criação
      createdBy: order.createdBy || undefined,
    };
    
    setSelectedOrder(pedidoDetalhes);
    setModalOpen(true);
  };

  // Função para fechar o modal
  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedOrder(null);
  };

  // Funções para edição do pedido
  const handleEditOrder = (order: any) => {
    setEditingOrder(order);
    setEditForm({
      modeloTenis: order.modeloTenis || '',
      servicos: formatServicos(order.servicos || order.tipoServico || ''),
      descricaoServicos: order.descricaoServicos || '',
      price: order.price || 0,
      dataPrevistaEntrega: order.dataPrevistaEntrega || '',
      precoTotal: order.price || 0
    });
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditingOrder(null);
    setEditForm({
      modeloTenis: '',
      servicos: '',
      descricaoServicos: '',
      price: 0,
      dataPrevistaEntrega: '',
      precoTotal: 0
    });
  };

  const handleSaveOrder = async () => {
    if (!editingOrder) return;
    
    // Validação básica
    if (!editForm.modeloTenis.trim()) {
      toast.error("O modelo do tênis é obrigatório");
      return;
    }
    
    if (!editForm.servicos.trim()) {
      toast.error("Os serviços são obrigatórios");
      return;
    }
    
    if (editForm.price <= 0) {
      toast.error("O valor deve ser maior que zero");
      return;
    }
    
    setEditLoading(true);
    try {

      editForm.precoTotal = Number(editForm.price);
      // Chama a API para atualizar o pedido
      const updatedOrder = await updateOrderService(editingOrder.id, editForm);
      
      const msg = `Pedido #${editingOrder.codigo || editingOrder.id} atualizado com sucesso!`;
      toast.success(msg);
      
      // Fechar modal e recarregar dados
      handleCloseEditModal();
      fetchData();
    } catch (error: any) {
      console.error("Erro ao atualizar pedido:", error);
      let errorMessage = "Erro ao atualizar pedido";
      if (error.message.includes("não encontrado")) {
        errorMessage = "Pedido não encontrado";
      } else if (error.message.includes("Token")) {
        errorMessage = "Sessão expirada. Faça login novamente";
      } else if (error.message.includes("permissão")) {
        errorMessage = "Você não tem permissão para editar este pedido";
      }
      toast.error(errorMessage);
    } finally {
      setEditLoading(false);
    }
  };

  // Função para gerar PDF do pedido
  const generateOrderPDF = async (order: any) => {
    try {
      toast.info("Gerando PDF do pedido...");
      
      // Chama o service do backend para gerar o PDF
      const pdfBlob = await generateOrderPDFService(order.id);
      downloadBlobAsFile(pdfBlob, `pedido-${order.id}.pdf`);

      const msg = `PDF do pedido #${order.codigo || order.id} gerado com sucesso!`;
      toast.success(msg);
    } catch (error: any) {
      console.error("Erro ao gerar PDF:", error);
      
      // Mensagens de erro mais específicas
      let errorMessage = "Erro ao gerar PDF do pedido";
      if (error.message.includes("não encontrado")) {
        errorMessage = "Pedido não encontrado";
      } else if (error.message.includes("Token")) {
        errorMessage = "Sessão expirada. Faça login novamente";
      } else if (error.message.includes("permissão")) {
        errorMessage = "Você não tem permissão para gerar PDF deste pedido";
      }
      
      toast.error(errorMessage);
    }
  };

  const handlePedidoUpdated = (updatedOrder: PedidoDetalhes) => {
    setSelectedOrder(updatedOrder);
    setOrders((prev) => prev.map((order) => (
      order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order
    )));
  };
  // Busca clientes e pedidos ao buscar
  const fetchData = async (opts?: { loadClients?: boolean; lastKey?: string | null; overrideFilters?: Partial<typeof consultaFilters> }) => {
    const { loadClients = true, lastKey = null, overrideFilters = {} } = opts || {};
    setLoading(true);
    setError(null);
    try {
      const promises: Array<Promise<any>> = [];
      if (loadClients) promises.push(getClientesService());

      const query: Record<string, any> = {
        ...consultaFilters,
        ...overrideFilters,
        lastKey: lastKey || undefined,
        status: consultaFilters.status === "todos" ? "" : consultaFilters.status,
      };

      // Mapear busca principal para o filtro "cliente" aceito pela API
      const term = searchTerm.trim();
      if (term) {
        if (searchType === "cpf" || searchType === "telefone") {
          query.cliente = term.replace(/\D/g, "");
        } else {
          query.cliente = term;
        }
      }

      // Evitar enviar campos vazios/"todos" para não quebrar o backend
      Object.keys(query).forEach((k) => {
        const v = query[k];
        if (v === undefined || v === null) delete query[k];
        else if (typeof v === "string" && !v.trim()) delete query[k];
      });

      promises.push(getPedidosConsultaService(query));

      const results = await Promise.all(promises);

      if (loadClients) {
        const clientesData = results.shift();
        const clientesNormalizados = Array.isArray(clientesData)
          ? clientesData
          : Array.isArray(clientesData?.data)
            ? clientesData.data
            : [];
        setClients(clientesNormalizados);
      }

      const pedidosResult = results.pop();
      const pedidosData = Array.isArray(pedidosResult?.data)
        ? pedidosResult.data
        : Array.isArray(pedidosResult)
          ? pedidosResult
          : [];

      setOrders((prev) => lastKey ? [...prev, ...pedidosData] : pedidosData);
      setNextToken(pedidosResult?.nextToken || null);
    } catch (err: any) {
      console.error(err);
      setError("Erro ao buscar dados");
      toast.error("Erro ao buscar dados");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const urlSearchType = searchParams.get("searchType");
    const urlSearchTerm = searchParams.get("searchTerm");
    const urlTab = searchParams.get("tab");
    if (urlSearchType && urlSearchTerm) {
      setSearchType(urlSearchType);
      setSearchTerm(urlSearchTerm);
      setHasSearched(true);
    }
    if (urlTab === "pedidos") {
      setTab("pedidos");
    } else {
      setTab("clientes");
    }
  }, [searchParams]);

  const handleSearch = async () => {
    if (!funcionarios.length) {
      await loadFuncionarios();
    }
    await fetchData({ loadClients: true, lastKey: null });
    setHasSearched(true);
  };

  const handleViewClientOrders = async (client: any) => {
    const nome = client.nomeCompleto || "";
    const clienteFiltro = client.id || nome;
    setSearchType("nome");
    setSearchTerm(nome);
    setConsultaFilters((prev) => ({ ...prev, cliente: clienteFiltro }));
    setTab("pedidos");
    setHasSearched(true);
    await fetchData({ loadClients: false, lastKey: null, overrideFilters: { cliente: clienteFiltro } });
  };

  const clearSearch = () => {
    setSearchTerm("");
    setDateFrom("");
    setDateTo("");
    setStatusFilter("todos");
    setConsultaFilters({
      codigo: "",
      cliente: "",
      status: "",
      setor: "",
      funcionario: "",
      dataInicio: "",
      dataFim: "",
      limit: 20,
    });
    setHasSearched(false);
  };

  const loadFuncionarios = async () => {
    setFuncionariosLoading(true);
    try {
      const data = await listFuncionariosService({ ativo: true, limit: 200 });
      setFuncionarios(data || []);
    } catch (err) {
      console.error("Erro ao carregar funcionários", err);
      toast.error("Erro ao carregar funcionários");
    } finally {
      setFuncionariosLoading(false);
    }
  };

  useEffect(() => {
    loadFuncionarios();
  }, []);

  // Filter clients based on search criteria
  const clientesLista = Array.isArray(clients) ? clients : [];

  const filteredClients = hasSearched
    ? (searchTerm.trim()
        ? clientesLista.filter((client) => {
            switch (searchType) {
              case "nome":
                return (client.nomeCompleto || "").toLowerCase().includes(searchTerm.toLowerCase());
              case "cpf":
                return (client.cpf || "").includes(searchTerm.replace(/\D/g, ""));
              case "telefone":
                return (client.telefone || "").includes(searchTerm.replace(/\D/g, ""));
              case "email":
                return (client.email || "").toLowerCase().includes(searchTerm.toLowerCase());
              default:
                return false;
            }
          })
        : clientesLista)
    : [];

  // Filter orders based on search criteria
  const filteredOrders = hasSearched ? orders : [];

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
              <h1 className="text-xl font-bold font-serif">Consultas</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="w-5 h-5 mr-2" />
              Sistema de Consultas
            </CardTitle>
            <CardDescription>Busque clientes e pedidos por diferentes critérios</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="searchType">Tipo de Busca</Label>
                <Select value={searchType} onValueChange={setSearchType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nome">Nome do Cliente</SelectItem>
                    <SelectItem value="cpf">CPF</SelectItem>
                    <SelectItem value="tenis">Modelo do Tênis</SelectItem>
                    <SelectItem value="telefone">Telefone</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="searchTerm">Termo de Busca</Label>
                <Input
                  id="searchTerm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={`Digite ${searchType === "nome" ? "o nome" : searchType === "cpf" ? "o CPF" : searchType === "tenis" ? "o modelo do tênis" : searchType === "telefone" ? "o telefone" : "o email"}...`}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status do Pedido</Label>
                <Select
                  value={statusFilter}
                  onValueChange={(val) => {
                    setStatusFilter(val);
                    setConsultaFilters({ ...consultaFilters, status: val === "todos" ? "" : val });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Status</SelectItem>
                    <SelectItem value="iniciado">Iniciado</SelectItem>
                    <SelectItem value="em-processamento">Em Processamento</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateFrom">Data Inicial</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setConsultaFilters({ ...consultaFilters, dataInicio: e.target.value });
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateTo">Data Final</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setConsultaFilters({ ...consultaFilters, dataFim: e.target.value });
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código do Pedido</Label>
                <Input
                  id="codigo"
                  value={consultaFilters.codigo}
                  onChange={(e) => setConsultaFilters({ ...consultaFilters, codigo: e.target.value })}
                  placeholder="Ex.: 240226-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cliente">Cliente</Label>
                <Input
                  id="cliente"
                  value={consultaFilters.cliente}
                  onChange={(e) => setConsultaFilters({ ...consultaFilters, cliente: e.target.value })}
                  placeholder="Nome ou ID"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="funcionario">Funcionário</Label>
                <Select
                  value={consultaFilters.funcionario || "todos"}
                  onValueChange={(value) =>
                    setConsultaFilters({ ...consultaFilters, funcionario: value === "todos" ? "" : value })
                  }
                  disabled={funcionariosLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={funcionariosLoading ? "Carregando..." : "Selecione"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {funcionarios.map((f) => (
                      <SelectItem key={f.id} value={f.nome}>
                        {f.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="setor">Setor</Label>
                <Input
                  id="setor"
                  value={consultaFilters.setor}
                  onChange={(e) => setConsultaFilters({ ...consultaFilters, setor: e.target.value })}
                  placeholder="Ex.: sapataria"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="statusConsulta">Status (texto)</Label>
                <Input
                  id="statusConsulta"
                  value={consultaFilters.status}
                  onChange={(e) => setConsultaFilters({ ...consultaFilters, status: e.target.value })}
                  placeholder="Ex.: Atendimento - Orçado"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="limit">Limite</Label>
                <Select
                  value={String(consultaFilters.limit)}
                  onValueChange={(v) => setConsultaFilters({ ...consultaFilters, limit: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button onClick={handleSearch} className="flex-1">
                <Search className="w-4 h-4 mr-2" />
                Buscar
              </Button>
              <Button variant="outline" onClick={clearSearch}>
                <Filter className="w-4 h-4 mr-2" />
                Limpar
              </Button>
            </div>
            {nextToken && (
              <div className="flex justify-end gap-2 text-sm text-muted-foreground">
                <span>Mais resultados disponíveis</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchData({ loadClients: false, lastKey: nextToken })}
                >
                  Carregar mais
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {hasSearched && (
          <>
          <Tabs value={tab} onValueChange={setTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="clientes" className="flex items-center">
                <User className="w-4 h-4 mr-2" />
                Clientes ({filteredClients.length})
              </TabsTrigger>
              <TabsTrigger value="pedidos" className="flex items-center">
                <Package className="w-4 h-4 mr-2" />
                Pedidos ({filteredOrders.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="clientes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Resultados - Clientes</CardTitle>
                  <CardDescription>
                    {filteredClients.length === 0
                      ? "Nenhum cliente encontrado com os critérios informados"
                      : `${filteredClients.length} cliente(s) encontrado(s)`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {filteredClients.length > 0 ? (
                    <div className="space-y-4">
                      {filteredClients.map((client) => (
                        <div key={client.id} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold text-lg">{client.nomeCompleto}</h3>
                              <p className="text-sm text-muted-foreground">CPF: {client.cpf}</p>
                              <p className="text-sm text-muted-foreground">Telefone: {client.telefone}</p>
                              <p className="text-sm text-muted-foreground">Email: {client.email}</p>
                              <p className="text-sm text-muted-foreground">Endereço: {client.logradouro}, {client.numero} {client.complemento ? `- ${client.complemento}` : ""}, {client.bairro}, {client.cidade} - {client.estado}, CEP: {client.cep}</p>
                              {client.observacoes && (
                                <p className="text-xs text-muted-foreground italic">Obs: {client.observacoes}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="mt-2 space-x-2">
                                <Button variant="outline" size="sm" onClick={() => handleViewClientOrders(client)}>
                                  Ver Pedidos
                                </Button>
                                   {/* Botão Editar ocultado nesta tela */}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum cliente encontrado</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pedidos" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Resultados - Pedidos</CardTitle>
                  <CardDescription>
                    {filteredOrders.length === 0
                      ? "Nenhum pedido encontrado com os critérios informados"
                      : `${filteredOrders.length} pedido(s) encontrado(s)`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {filteredOrders.length > 0 ? (
                    <div className="space-y-4">
                      {filteredOrders.map((order) => (
                        <div key={order.id} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-4 mb-2">
                                <h3 className="font-semibold">Pedido #{order.codigo || order.id}</h3>
                                {getStatusBadge(order.status)}
                                {order.setorAtual && (
                                  <div className="flex items-center gap-2 ml-2">
                                    <div
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: SETORES_CORES[order.setorAtual] || '#ddd' }}
                                    />
                                    <span className="text-xs">
                                      {SETORES_NOMES[order.setorAtual] || order.setorAtual}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                Cliente ID: {order.clientId} {order.clientName ? `• ${order.clientName}` : ""}
                              </p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="font-medium text-muted-foreground">Tênis</p>
                                  <p>{order.sneaker || order.modeloTenis}</p>
                                </div>
                                <div>
                                  <p className="font-medium text-muted-foreground">Serviço</p>
                                  <p>{formatServicos(order.servicos || order.tipoServico) || '-'}</p>
                                </div>
                                <div>
                                  <p className="font-medium text-muted-foreground">Valor Total</p>
                                  <p className="font-semibold text-green-600">
                                    R$ {(order.precoTotal || order.price || 0).toFixed(2)}
                                  </p>
                                  {order.valorSinal > 0 && (
                                    <p className="text-xs text-green-600">
                                      Sinal: R$ {order.valorSinal.toFixed(2)}
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium text-muted-foreground">Previsão</p>
                                  <p>{order.dataPrevistaEntrega || order.expectedDate}</p>
                                </div>
                              </div>

                              {/* Criado por */}
                              <div className="mt-2 text-sm">
                                <span className="font-medium text-muted-foreground">Criado por:</span>{' '}
                                <span title={order.createdBy?.userEmail || ''}>
                                  {order.createdBy?.userName || 'Usuário Legado'}
                                </span>
                              </div>

                              {!!order.funcionarioAtual && (
                                <div className="mt-1 text-sm">
                                  <span className="font-medium text-muted-foreground">Funcionário atual:</span>{' '}
                                  <span>{order.funcionarioAtual}</span>
                                </div>
                              )}
                              
                              {/* Informações adicionais */}
                              <div className="mt-3 space-y-2">
                                {order.garantia?.ativa && (
                                  <div className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs mr-2">
                                    <strong>Garantia:</strong> {order.garantia.duracao} (+R$ {order.garantia.preco.toFixed(2)})
                                  </div>
                                )}
                                {order.acessorios?.length > 0 && (
                                  <div className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs mr-2">
                                    <strong>Acessórios:</strong> {order.acessorios.slice(0, 2).join(", ")}
                                    {order.acessorios.length > 2 && ` +${order.acessorios.length - 2} mais`}
                                  </div>
                                )}
                                {order.valorRestante > 0 && (
                                  <div className="inline-block bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">
                                    <strong>Restante:</strong> R$ {order.valorRestante.toFixed(2)}
                                  </div>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-2">
                                <strong>Descrição:</strong> {order.descricaoServicos || order.description}
                              </p>
                              {Array.isArray(order.fotos) && order.fotos.length > 0 && (
                                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                                  {order.fotos
                                    .map((foto: unknown) => extractFotoUrl(foto))
                                    .filter((foto: string | null): foto is string => Boolean(foto))
                                    .map((foto: string, idx: number) => (
                                      <img
                                        key={idx}
                                        src={foto}
                                        alt={`Foto do pedido ${order.id} - ${idx + 1}`}
                                        className="w-full h-24 object-cover rounded"
                                      />
                                    ))}
                                </div>
                              )}
                            </div>
                            <div className="ml-4 space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleViewOrder(order)}
                              >
                                Ver
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEditOrder(order)}
                              >
                                Editar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => generateOrderPDF(order)}
                                title="Gerar PDF do pedido"
                              >
                                <FileText className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum pedido encontrado</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          </>
        )}

        {!hasSearched && (
          <Card>
            <CardContent className="py-12 text-center">
              <Search className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Sistema de Consultas</h3>
              <p className="text-muted-foreground mb-4">
                Use os filtros acima para buscar clientes e pedidos no sistema
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-2xl mx-auto text-sm">
                <div className="p-3 bg-muted rounded-lg">
                  <Calendar className="w-6 h-6 mx-auto mb-2 text-accent" />
                  <p className="font-medium">Por Data</p>
                  <p className="text-muted-foreground">Busque por período</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <User className="w-6 h-6 mx-auto mb-2 text-accent" />
                  <p className="font-medium">Por Cliente</p>
                  <p className="text-muted-foreground">Nome ou CPF</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <Package className="w-6 h-6 mx-auto mb-2 text-accent" />
                  <p className="font-medium">Por Tênis</p>
                  <p className="text-muted-foreground">Modelo do calçado</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <Filter className="w-6 h-6 mx-auto mb-2 text-accent" />
                  <p className="font-medium">Por Status</p>
                  <p className="text-muted-foreground">Estado do pedido</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modal de detalhes do pedido */}
        <CardDetalhesPedido
          open={modalOpen}
          pedido={selectedOrder}
          onClose={handleCloseModal}
          onPedidoUpdated={handlePedidoUpdated}
        />

        {/* Modal de edição do pedido */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="w-5 h-5" />
                Editar Pedido {editingOrder && `#${editingOrder.id}`}
              </DialogTitle>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="modeloTenis">Modelo do Tênis</Label>
                  <Input
                    id="modeloTenis"
                    value={editForm.modeloTenis}
                    onChange={(e) => setEditForm({ ...editForm, modeloTenis: e.target.value })}
                    placeholder="Digite o modelo do tênis"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="servicos">Serviços</Label>
                  <Input
                    id="servicos"
                    value={editForm.servicos}
                    onChange={(e) => setEditForm({ ...editForm, servicos: e.target.value })}
                    placeholder="Digite os serviços"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="descricaoServicos">Descrição dos Serviços</Label>
                <Textarea
                  id="descricaoServicos"
                  value={editForm.descricaoServicos}
                  onChange={(e) => setEditForm({ ...editForm, descricaoServicos: e.target.value })}
                  placeholder="Descreva os serviços detalhadamente"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Valor (R$)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) || 0 })}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataPrevistaEntrega">Data Prevista</Label>
                  <Input
                    id="dataPrevistaEntrega"
                    type="date"
                    value={editForm.dataPrevistaEntrega}
                    onChange={(e) => setEditForm({ ...editForm, dataPrevistaEntrega: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseEditModal} disabled={editLoading}>
                Cancelar
              </Button>
              <Button onClick={handleSaveOrder} disabled={editLoading}>
                {editLoading ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
