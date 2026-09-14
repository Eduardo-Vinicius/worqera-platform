import { buildCacheKey, fetchWithCache, invalidateCacheByPrefix } from "./cache";

export interface ServicoPedido {
  preco: number;
  nome: string;
  id: string;
  descricao: string;
}

export interface StatusHistoryPedido {
  date: string;
  time: string;
  userName: string;
  userId: string;
  status: string;
}

export interface Pedido {
  observacoes: string;
  departamento: string;
  status: string;
  funcionarioAtual?: string;
  fotos: string[];
  createdAt: string;
  precoTotal: number;
  servicos: ServicoPedido[];
  statusHistory: StatusHistoryPedido[];
  dataCriacao: string;
  dataPrevistaEntrega: string;
  modeloTenis: string;
  updatedAt: string;
  id: string;
  clienteId: string;
}

// ...existing code...
// Busca cliente por ID (cache leve para não refazer a cada abertura de modal)
export async function getClienteByIdService(id: string) {
  const token = getAuthToken();
  const cacheKey = buildCacheKey(`clientes:${id}`, token);

  const result = await fetchWithCache(`${API_BASE_URL}/clientes/${id}`, {
    method: "GET",
    headers: getAuthHeaders(),
  }, { cacheKey, ttlMs: 5 * 60_000 });

  const payload = resolveApiPayload(result);
  if (!payload) throw new Error("Erro ao buscar cliente");
  return payload;
}

// Atualiza um cliente
export async function updateClienteService(id: string, cliente: Partial<{
  nomeCompleto: string;
  cpf: string;
  telefone: string;
  email: string;
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  complemento: string;
  observacoes: string;
}>) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_BASE_URL}/clientes/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(cliente),
  });
  if (!response.ok) throw new Error("Erro ao atualizar cliente");
  const result = await response.json();
  invalidateCacheByPrefix(CLIENTES_CACHE_PREFIXES);
  return result;
}

// Busca pedido por ID
export async function getPedidoByIdService(id: string) {
  return getPedidoService(id);
}
// lib/apiService.ts

// Normalize to avoid trailing slashes that can cause double // in paths
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/+$/, "")

function getAuthToken() {
  return localStorage.getItem("token");
}

function getAuthHeaders(contentType = "application/json", options: { requireAuth?: boolean } = {}) {
  const token = getAuthToken();

  if (options.requireAuth !== false && !token) {
    throw new Error("Token não encontrado. Faça login novamente.");
  }

  const headers: Record<string, string> = {
    "Cache-Control": "no-store",
    "Pragma": "no-cache",
  };

  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

function resolveApiPayload(payload: any) {
  return payload?.data ?? payload;
}

function extractPedidoIdFromPayload(payload: any): string | null {
  const resolved = resolveApiPayload(payload);
  const id = resolved?.id ?? resolved?._id ?? resolved?.pedidoId;
  return typeof id === "string" && id.trim() ? id : null;
}

const PEDIDOS_CACHE_PREFIXES = [
  "pedidos:list",
  "pedidos:kanban",
  "pedidos:consulta",
  "dashboard",
  "setores:estatisticas",
  "metrics:resumo",
  "metrics:departamentos",
  "metrics:financeiro",
  "metrics:atrasos",
  "metrics:funcionarios",
  "metrics:overview",
];

const CLIENTES_CACHE_PREFIXES = ["clientes"];
const FUNCIONARIOS_CACHE_PREFIXES = ["funcionarios", "funcionario:"];

export interface PedidoPdfAsset {
  id?: string;
  nome?: string;
  fileName?: string;
  createdAt?: string;
  updatedAt?: string;
  url: string;
}

export interface Funcionario {
  id: string;
  nome: string;
  setorId: string;
  email?: string;
  telefone?: string;
  cargo?: string;
  observacoes?: string;
  ativo: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type MetricsPeriodo = "7d" | "15d" | "30d" | "90d" | "180d" | "1y";

export interface MetricsBaseFilters {
  periodo?: MetricsPeriodo;
  dataInicio?: string;
  dataFim?: string;
}

export interface MetricsPeriodoInfo {
  inicio: string;
  fim: string;
  referencia?: string;
}

export interface MetricsResumo {
  total: number;
  abertos: number;
  finalizados: number;
  atrasados: number;
  noPrazo?: number;
  taxaAtraso?: number;
  periodo?: MetricsPeriodoInfo;
}

export interface MetricsDepartamento {
  setorId: string;
  setorNome?: string;
  total: number;
}

export interface MetricsFuncionario {
  funcionarioNome: string;
  total: number;
}

export interface MetricsAtrasoItem {
  id: string;
  codigo?: string;
  status: string;
  funcionarioAtual?: string | null;
  dataPrevistaEntrega: string;
  diasAtraso?: number;
}

export interface MetricsAtrasos {
  totalAtrasados: number;
  atrasoMedioMs?: number;
  atrasoMedioHoras?: number;
  itens: MetricsAtrasoItem[];
}

export interface MetricsFinanceiroResumo {
  totalPedidos: number;
  pedidosFinalizados: number;
  pedidosEmAberto: number;
  receitaPrevista: number;
  receitaRecebida: number;
  receitaPendente: number;
  despesas: number;
  lucroPrevisto: number;
  lucroRealizado: number;
  margemPrevista: number;
  ticketMedio: number;
}

export interface MetricsFinanceiroReceitaPorStatus {
  status: string;
  pedidos: number;
  receitaPrevista: number;
  receitaRecebida: number;
}

export interface MetricsFinanceiroTopServico {
  servico: string;
  pedidos: number;
  receita: number;
}

export interface MetricsFinanceiroEvolucaoDiaria {
  data: string;
  pedidos: number;
  receitaPrevista: number;
  receitaRecebida: number;
}

export interface MetricsFinanceiro {
  periodo: MetricsPeriodoInfo;
  resumo: MetricsFinanceiroResumo;
  receitaPorStatus: MetricsFinanceiroReceitaPorStatus[];
  topServicos: MetricsFinanceiroTopServico[];
  evolucaoDiaria: MetricsFinanceiroEvolucaoDiaria[];
}

export interface MetricsFuncionariosPedidos {
  funcionarioNome: string;
  pedidosComParticipacao: number;
  pedidosFinalizados: number;
}

export interface MetricsFuncionariosMaisRapidos {
  funcionarioNome: string;
  etapasConcluidas: number;
  pedidosComTempo: number;
  tempoTotalMs: number;
  tempoMedioMs: number;
  tempoMedioHoras: number;
}

export interface MetricsFuncionariosDesempenho {
  periodo: MetricsPeriodoInfo;
  topFuncionariosPorPedidos: MetricsFuncionariosPedidos[];
  topFuncionariosMaisRapidos: MetricsFuncionariosMaisRapidos[];
}

export interface MetricsOverview {
  resumo: MetricsResumo;
  atrasos: MetricsAtrasos;
  financeiro: MetricsFinanceiro;
  funcionarios: MetricsFuncionariosDesempenho;
}

export interface MetricsFinanceiroFilters extends MetricsBaseFilters {
  limitServicos?: number;
}

export interface MetricsFuncionariosFilters extends MetricsBaseFilters {
  limit?: number;
}

function buildMetricsQuery<T extends object>(params: T) {
  const query = new URLSearchParams();

  Object.entries(params as Record<string, string | number | undefined | null>).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === "string" && value.trim() === "") return;
    query.append(key, String(value));
  });

  const qs = query.toString();
  return {
    queryString: qs,
    suffix: qs ? `?${qs}` : "",
    cacheSuffix: qs || "default",
  };
}

// --- Métricas ---
export async function getMetricsResumoService(filters: MetricsBaseFilters = {}): Promise<MetricsResumo> {
  const { suffix, cacheSuffix } = buildMetricsQuery(filters);
  const token = getAuthToken();
  const cacheKey = buildCacheKey(`metrics:resumo:${cacheSuffix}`, token);
  const result = await fetchWithCache(`${API_BASE_URL}/metrics/resumo${suffix}`, {
    method: "GET",
    headers: getAuthHeaders(),
  }, { cacheKey, ttlMs: 60_000 });

  return resolveApiPayload(result);
}

export async function getMetricsDepartamentosService(filters: MetricsBaseFilters = {}): Promise<MetricsDepartamento[]> {
  const { suffix, cacheSuffix } = buildMetricsQuery(filters);
  const token = getAuthToken();
  const cacheKey = buildCacheKey(`metrics:departamentos:${cacheSuffix}`, token);
  const result = await fetchWithCache(`${API_BASE_URL}/metrics/departamentos${suffix}`, {
    method: "GET",
    headers: getAuthHeaders(),
  }, { cacheKey, ttlMs: 60_000 });

  const payload = resolveApiPayload(result);
  return Array.isArray(payload) ? payload : [];
}

export async function getMetricsFuncionariosService(params: number | MetricsFuncionariosFilters = 10): Promise<MetricsFuncionario[]> {
  const normalized = typeof params === "number" ? { limit: params } : params;
  const { suffix, cacheSuffix } = buildMetricsQuery(normalized);
  const token = getAuthToken();
  const cacheKey = buildCacheKey(`metrics:funcionarios:${cacheSuffix}`, token);

  const result = await fetchWithCache(`${API_BASE_URL}/metrics/funcionarios${suffix}`, {
    method: "GET",
    headers: getAuthHeaders(),
  }, { cacheKey, ttlMs: 60_000 });

  const payload = resolveApiPayload(result);
  return Array.isArray(payload) ? payload : [];
}

export async function getMetricsAtrasosService(filters: MetricsBaseFilters = {}): Promise<MetricsAtrasos> {
  const { suffix, cacheSuffix } = buildMetricsQuery(filters);
  const token = getAuthToken();
  const cacheKey = buildCacheKey(`metrics:atrasos:${cacheSuffix}`, token);
  const result = await fetchWithCache(`${API_BASE_URL}/metrics/atrasos${suffix}`, {
    method: "GET",
    headers: getAuthHeaders(),
  }, { cacheKey, ttlMs: 60_000 });

  return resolveApiPayload(result);
}

export async function getMetricsFinanceiroService(filters: MetricsFinanceiroFilters = {}): Promise<MetricsFinanceiro> {
  const { suffix, cacheSuffix } = buildMetricsQuery(filters);
  const token = getAuthToken();
  const cacheKey = buildCacheKey(`metrics:financeiro:${cacheSuffix}`, token);
  const result = await fetchWithCache(`${API_BASE_URL}/metrics/financeiro${suffix}`, {
    method: "GET",
    headers: getAuthHeaders(),
  }, { cacheKey, ttlMs: 30_000 });

  return resolveApiPayload(result);
}

export async function getMetricsFuncionariosDesempenhoService(filters: MetricsFuncionariosFilters = {}): Promise<MetricsFuncionariosDesempenho> {
  const { suffix, cacheSuffix } = buildMetricsQuery(filters);
  const token = getAuthToken();
  const cacheKey = buildCacheKey(`metrics:funcionarios:desempenho:${cacheSuffix}`, token);
  const result = await fetchWithCache(`${API_BASE_URL}/metrics/funcionarios/desempenho${suffix}`, {
    method: "GET",
    headers: getAuthHeaders(),
  }, { cacheKey, ttlMs: 30_000 });

  return resolveApiPayload(result);
}

export async function getMetricsOverviewService(filters: MetricsFinanceiroFilters & MetricsFuncionariosFilters = {}): Promise<MetricsOverview> {
  const { suffix, cacheSuffix } = buildMetricsQuery(filters);
  const token = getAuthToken();
  const cacheKey = buildCacheKey(`metrics:overview:${cacheSuffix}`, token);
  const result = await fetchWithCache(`${API_BASE_URL}/metrics/overview${suffix}`, {
    method: "GET",
    headers: getAuthHeaders(),
  }, { cacheKey, ttlMs: 30_000 });

  return resolveApiPayload(result);
}

export async function getPedidoService(id: string) {
  const response = await fetch(`${API_BASE_URL}/pedidos/${id}`, {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao buscar pedido");
  }

  const result = await response.json();
  return resolveApiPayload(result);
}

export async function listPedidoPdfsService(pedidoId: string): Promise<PedidoPdfAsset[]> {
  const response = await fetch(`${API_BASE_URL}/pedidos/${pedidoId}/pdfs`, {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao listar PDFs do pedido");
  }

  const result = await response.json();
  const payload = resolveApiPayload(result);
  return Array.isArray(payload) ? payload : [];
}

export async function uploadPedidoFotosService(pedidoId: string, files: File[]): Promise<string[]> {
  const formData = new FormData();
  formData.append("pedidoId", pedidoId);
  files.forEach((file) => formData.append("fotos", file));

  const response = await fetch(`${API_BASE_URL}/upload/fotos`, {
    method: "POST",
    headers: getAuthHeaders(""),
    body: formData,
    cache: "no-store",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao fazer upload das fotos");
  }

  const result = await response.json().catch(() => ({}));
  const payload = resolveApiPayload(result);
  const urls = payload?.urls || payload?.fotos || payload?.photos || [];
  return Array.isArray(urls) ? urls.filter((url): url is string => typeof url === "string") : [];
}

export async function downloadPedidoFotosZipService(pedidoId: string) {
  const response = await fetch(`${API_BASE_URL}/pedidos/${pedidoId}/fotos/zip`, {
    method: "GET",
    headers: getAuthHeaders(""),
    cache: "no-store",
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Pedido sem fotos para download");
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao baixar fotos em ZIP");
  }

  return response.blob();
}

export function downloadBlobAsFile(blob: Blob, filename: string) {
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(objectUrl);
}

export function getPedidoIdFromCreateResponse(payload: any) {
  return extractPedidoIdFromPayload(payload);
}

// --- Funcionarios ---
export async function createFuncionarioService(data: {
  nome: string;
  setorId: string;
  email?: string;
  telefone?: string;
  cargo?: string;
  observacoes?: string;
  ativo?: boolean;
}) {
  const response = await fetch(`${API_BASE_URL}/funcionarios`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao criar funcionário");
  }
  const result = await response.json();
  invalidateCacheByPrefix(FUNCIONARIOS_CACHE_PREFIXES);
  return resolveApiPayload(result);
}

export async function listFuncionariosService(params: {
  setorId?: string;
  ativo?: boolean;
  limit?: number;
} = {}): Promise<Funcionario[]> {
  const query = new URLSearchParams();
  if (params.setorId) query.append("setorId", params.setorId);
  if (typeof params.ativo === "boolean") query.append("ativo", String(params.ativo));
  if (typeof params.limit === "number") query.append("limit", String(params.limit));

  const qs = query.toString();
  const token = getAuthToken();
  const cacheKey = buildCacheKey(`funcionarios:${qs || "all"}`, token);

  const result = await fetchWithCache(`${API_BASE_URL}/funcionarios${qs ? `?${qs}` : ""}`, {
    method: "GET",
    headers: getAuthHeaders(),
  }, { cacheKey, ttlMs: 5 * 60_000 });

  const payload = resolveApiPayload(result);
  return Array.isArray(payload) ? payload : [];
}

export async function getFuncionarioService(id: string): Promise<Funcionario> {
  const token = getAuthToken();
  const cacheKey = buildCacheKey(`funcionario:${id}`, token);

  const result = await fetchWithCache(`${API_BASE_URL}/funcionarios/${id}`, {
    method: "GET",
    headers: getAuthHeaders(),
  }, { cacheKey, ttlMs: 5 * 60_000 });

  return resolveApiPayload(result);
}

export async function updateFuncionarioService(id: string, data: Partial<Funcionario>) {
  const response = await fetch(`${API_BASE_URL}/funcionarios/${id}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao atualizar funcionário");
  }
  const result = await response.json();
  invalidateCacheByPrefix(FUNCIONARIOS_CACHE_PREFIXES);
  return resolveApiPayload(result);
}

export async function deleteFuncionarioService(id: string) {
  const response = await fetch(`${API_BASE_URL}/funcionarios/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao desativar funcionário");
  }
  const result = await response.json();
  invalidateCacheByPrefix(FUNCIONARIOS_CACHE_PREFIXES);
  return resolveApiPayload(result);
}

// Cria um novo pedido
export async function createPedidoService(pedido: {
  clienteId: string;
  clientName: string;
  modeloTenis: string;
  servicos: Array<{
    id: string;
    nome: string;
    preco: number;
    descricao: string;
  }>;
  fotos: string[];
  precoTotal: number;
  valorSinal: number;
  valorRestante: number;
  dataPrevistaEntrega: string;
  departamento: string;  
  observacoes: string;
  prioridade?: number;
  garantia: {
    ativa: boolean;
    preco: number;
    duracao: string;
    data: string;
  };
  acessorios: string[];
  status?: string;
}) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_BASE_URL}/pedidos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(pedido),
  });
  if (!response.ok) throw new Error("Erro ao criar pedido");
  const result = await response.json();
  invalidateCacheByPrefix(PEDIDOS_CACHE_PREFIXES);
  return result;
}

// Cria um novo cliente
export async function createClienteService(cliente: {
  nomeCompleto: string;
  cpf: string;
  telefone: string;
  email: string;
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  complemento?: string;
  observacoes?: string;
}) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_BASE_URL}/clientes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(cliente),
  });
  if (!response.ok) throw new Error("Erro ao criar cliente");
  const result = await response.json();
  invalidateCacheByPrefix(CLIENTES_CACHE_PREFIXES);
  return result;
}

// Busca lista de clientes
export async function getClientesService(forceRefresh = false) {
  const token = getAuthToken();
  const cacheKey = buildCacheKey("clientes", token);

  return fetchWithCache(`${API_BASE_URL}/clientes`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
  }, { cacheKey, ttlMs: 5 * 60_000, forceRefresh });
}

export async function loginService(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  })
  if (!response.ok) throw new Error("Email ou senha incorretos");
  const data = await response.json()
  // Salva no localStorage
  localStorage.setItem("token", data.token)
  // Salva no cookie (disponível para o middleware)
  document.cookie = `token=${data.token}; path=/; max-age=604800; secure; samesite=strict`;
  return data
}

// Busca colunas de status filtradas conforme permissão do usuário (para exibição)
export async function getStatusColumnsService(forceRefresh = false) {
  const token = getAuthToken();
  const cacheKey = buildCacheKey("status:columns:filtered", token);

  const result = await fetchWithCache(`${API_BASE_URL}/status/columns/filtered`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  }, { cacheKey, ttlMs: 10 * 60_000, forceRefresh });
  
  return result.data; // Retorna apenas os dados das colunas visíveis ao usuário
}

// Busca todas as colunas de status (sem filtro) para permitir movimentação para qualquer setor
export async function getAllStatusColumnsService(forceRefresh = false) {
  const token = getAuthToken();
  const cacheKey = buildCacheKey("status:columns:all", token);

  const result = await fetchWithCache(`${API_BASE_URL}/status/columns`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  }, { cacheKey, ttlMs: 10 * 60_000, forceRefresh });
  
  return result.data; // Retorna todas as colunas (sem filtros)
}

// Busca lista de pedidos
export async function getOrdersStatusService(funcionario?: string, opts: { forceRefresh?: boolean } = {}) {
  const token = getAuthToken();
  const query = funcionario && funcionario.trim().length > 0
    ? `?funcionario=${encodeURIComponent(funcionario.trim())}`
    : "";
  const cacheKey = buildCacheKey(`pedidos:kanban:${funcionario || "all"}`, token);

  const result = await fetchWithCache(`${API_BASE_URL}/pedidos/kanban/status${query}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  }, { cacheKey, ttlMs: 10_000, forceRefresh: opts.forceRefresh });
  
  return result.data; // Retorna apenas o array de pedidos
}

export async function getOrdersService(opts: { forceRefresh?: boolean } = {}) {
  const token = getAuthToken();
  const cacheKey = buildCacheKey("pedidos:list", token);

  const result = await fetchWithCache(`${API_BASE_URL}/pedidos`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  }, { cacheKey, ttlMs: 10_000, forceRefresh: opts.forceRefresh });
  
  return result.data || result; // Retorna result.data se existir, senão result
}

// Atualiza o status de um pedido
export async function updateOrderStatusService(orderId: string, newStatus: string, funcionarioNome: string, observacao?: string) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_BASE_URL}/pedidos/${orderId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ status: newStatus, funcionarioNome, observacao }),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const err: any = new Error(errorData.error || "Erro ao atualizar status do pedido");
    err.status = response.status;
    throw err;
  }
  
  const result = await response.json();
  invalidateCacheByPrefix(PEDIDOS_CACHE_PREFIXES);
  return result.data || result; // Compatível com respostas antigas e novas
}

// Atualiza os dados completos de um pedido
export async function updateOrderService(orderId: string, orderData: {
  modeloTenis?: string;
  servicos?: string;
  descricaoServicos?: string;
  price?: number;
  status?: string;
  dataPrevistaEntrega?: string;
  prioridade?: number;
}) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_BASE_URL}/pedidos/${orderId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(orderData),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao atualizar pedido");
  }
  
  const result = await response.json();
  invalidateCacheByPrefix(PEDIDOS_CACHE_PREFIXES);
  return result.data; // Retorna o pedido atualizado
}

export async function getDashboardService(opts: { forceRefresh?: boolean } = {}) {
  const token = getAuthToken();
  const cacheKey = buildCacheKey("dashboard", token);

  const result = await fetchWithCache(`${API_BASE_URL}/dashboard`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  }, { cacheKey, ttlMs: 15_000, forceRefresh: opts.forceRefresh });
  
  return result; // Retorna o objeto completo, não result.data
}

// Estatísticas por setor
export async function getSetoresEstatisticasService(opts: { forceRefresh?: boolean } = {}) {
  const token = getAuthToken();
  const cacheKey = buildCacheKey("setores:estatisticas", token);
  const result = await fetchWithCache(`${API_BASE_URL}/setores/estatisticas`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  }, { cacheKey, ttlMs: 30_000, forceRefresh: opts.forceRefresh });
  if (!result) return result;
  return result.data || result;
}

export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
) {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })
  if (!response.ok) throw new Error("Erro na requisição")
  return response.json()
}

// Gera PDF de um pedido
export async function generateOrderPDFService(pedidoId: string) {
  const response = await fetch(`${API_BASE_URL}/pedidos/document/pdf`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ pedidoId }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao gerar PDF do pedido");
  }

  // Retorna o blob do PDF para download
  return response.blob();
}

// Próximo setor para o pedido
export async function getProximoSetorService(pedidoId: string) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_BASE_URL}/pedidos/${pedidoId}/proximo-setor`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao buscar próximo setor");
  }
  const result = await response.json();
  return result.data || result;
}

// Mover pedido para setor específico
export async function moverPedidoSetorService(
  pedidoId: string,
  setorId: string,
  funcionarioNome?: string,
  observacao?: string,
  status?: string,
) {
  const token = localStorage.getItem("token");
  const payload: Record<string, string> = { setorId };
  if (funcionarioNome?.trim()) payload.funcionarioNome = funcionarioNome.trim();
  if (observacao?.trim()) payload.observacao = observacao.trim();
  if (status?.trim()) payload.status = status.trim();

  const response = await fetch(`${API_BASE_URL}/pedidos/${pedidoId}/mover-setor`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const err: any = new Error(errorData.error || "Erro ao mover pedido de setor");
    err.status = response.status;
    throw err;
  }
  const result = await response.json();
  invalidateCacheByPrefix(PEDIDOS_CACHE_PREFIXES);
  return result.data || result;
}

// Consulta leve de pedidos com filtros e paginação
export async function getPedidosConsultaService(params: {
  codigo?: string;
  cliente?: string;
  status?: string;
  setor?: string;
  funcionario?: string;
  dataInicio?: string;
  dataFim?: string;
  limit?: number;
  lastKey?: string;
} = {}, opts: { forceRefresh?: boolean } = {}) {
  const token = getAuthToken();
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === "string" && value.trim() === "") return;
    if (key === "limit" && typeof value === "number" && value <= 0) return;
    query.append(key, String(value));
  });

  const qs = query.toString();
  const cacheKey = buildCacheKey(`pedidos:consulta:${qs || "all"}`, token);
  const result = await fetchWithCache(`${API_BASE_URL}/pedidos/consulta${qs ? `?${qs}` : ""}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  }, { cacheKey, ttlMs: 15_000, forceRefresh: opts.forceRefresh });

  return result.data ? result : { data: result.data || result, nextToken: undefined, count: Array.isArray(result) ? result.length : 0 };
}

// Busca informações do usuário logado
export async function getUserInfoService() {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("Token não encontrado");
  }

  try {
    // Tenta decodificar o token JWT para obter informações básicas
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      id: payload.id || payload.sub,
      email: payload.email,
      role: payload.role || payload.perfil || 'user',
      departamento: payload.departamento || payload.department,
      nome: payload.nome || payload.name,
      // Se não conseguir decodificar, tenta buscar da API
      ...payload
    };
  } catch (error) {
    // Se não conseguir decodificar o token, tenta buscar da API
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Erro ao buscar informações do usuário");
      }

      const result = await response.json();
      return result.data || result;
    } catch (apiError) {
      // Se a API não tiver endpoint /auth/me, retorna informações básicas do token
      console.warn("Não foi possível obter informações completas do usuário:", apiError);
      return {
        id: '',
        email: '',
        role: 'user',
        departamento: null,
        nome: 'Usuário'
      };
    }
  }
}

// --- Email Audit & Tracking ---
export interface EmailLog {
  id: string;
  codigoPedido: string;
  pedidoId: string;
  nomeCliente: string;
  emailCliente: string;
  assunto: string;
  tipo: 'confirmacao' | 'atualizacao' | 'conclusao' | 'coleta' | 'notificacao' | 'outro';
  status: 'sucesso' | 'erro' | 'pendente';
  dataSolicitacao: string;
  dataEnvio?: string;
  duracaoMs?: number;
  mensagemErro?: string;
  pdfUrl?: string;
  tentativas: number;
  ultimaTentativa?: string;
}

export interface EmailLogsResponse {
  data: EmailLog[];
  nextToken?: string;
  count: number;
  total?: number;
}

export interface EmailSummary {
  totalEnviados: number;
  totalErros: number;
  totalPendentes: number;
  taxaDeErro: number;
  totalPorTipo: Record<string, number>;
  totalPorStatus: Record<string, number>;
  duracionMediaMs?: number;
}

export interface EmailStatistics {
  periodo: {
    dataInicio: string;
    dataFim: string;
  };
  resumo: EmailSummary;
  topClientesNoErro: Array<{
    email: string;
    totalErros: number;
    ultimoErro: string;
  }>;
  topTiposErro: Array<{
    mensagemErro: string;
    frequencia: number;
  }>;
  evolucaoTempo: Array<{
    data: string;
    enviados: number;
    erros: number;
    pendentes: number;
  }>;
}

/**
 * Busca logs de emails com filtros e paginação
 */
export async function getEmailLogsService(params: {
  email?: string;
  pedidoId?: string;
  codigoPedido?: string;
  status?: 'sucesso' | 'erro' | 'pendente';
  tipo?: string;
  dataInicio?: string;
  dataFim?: string;
  limit?: number;
  lastKey?: string;
} = {}): Promise<EmailLogsResponse> {
  const token = getAuthToken();
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === "string" && value.trim() === "") return;
    if (key === "limit" && typeof value === "number" && value <= 0) return;
    query.append(key, String(value));
  });

  const qs = query.toString();

  const response = await fetch(`${API_BASE_URL}/emails/logs${qs ? `?${qs}` : ""}`, {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao buscar logs de emails");
  }

  const result = await response.json();
  const payload = resolveApiPayload(result);

  return {
    data: Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [],
    nextToken: payload?.nextToken || payload?.lastKey,
    count: payload?.count || (Array.isArray(payload?.data) ? payload.data.length : Array.isArray(payload) ? payload.length : 0),
    total: payload?.total,
  };
}

/**
 * Busca resumo/estatísticas gerais de emails
 */
export async function getEmailSummaryService(): Promise<EmailSummary> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/emails/logs/resumo`, {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao buscar resumo de emails");
  }

  const result = await response.json();
  return resolveApiPayload(result);
}

/**
 * Busca últimos emails enviados para um endereço de email específico
 */
export async function getEmailsUltimosService(email: string, limit = 10): Promise<EmailLog[]> {
  const token = getAuthToken();
  const query = new URLSearchParams();
  query.append("limit", String(limit));

  const response = await fetch(`${API_BASE_URL}/emails/logs/ultimos/${encodeURIComponent(email)}?${query.toString()}`, {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao buscar últimos emails");
  }

  const result = await response.json();
  const payload = resolveApiPayload(result);
  return Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
}

/**
 * Busca emails de um pedido específico
 */
export async function getEmailsByPedidoService(pedidoId: string): Promise<EmailLog[]> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/emails/logs/pedido/${pedidoId}`, {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao buscar emails do pedido");
  }

  const result = await response.json();
  const payload = resolveApiPayload(result);
  return Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
}

/**
 * Busca estatísticas detalhadas de emails (erros, evolução temporal, etc)
 */
export async function getEmailStatisticsService(params: {
  dataInicio?: string;
  dataFim?: string;
  dias?: number;
} = {}): Promise<EmailStatistics> {
  const token = getAuthToken();
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === "string" && value.trim() === "") return;
    query.append(key, String(value));
  });

  const qs = query.toString();

  const response = await fetch(`${API_BASE_URL}/emails/estatisticas${qs ? `?${qs}` : ""}`, {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao buscar estatísticas de emails");
  }

  const result = await response.json();
  return resolveApiPayload(result);
}
