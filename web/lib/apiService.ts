import { buildCacheKey, fetchWithCache, invalidateCacheByPrefix } from "./cache";
import {
  adaptClient,
  adaptDepartmentRow,
  adaptEmployee,
  adaptEmployeeMetricRow,
  adaptMetricsDelays,
  adaptMetricsFinance,
  adaptMetricsOverview,
  adaptMetricsSummary,
  adaptOrder,
} from "./adapters";

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

export interface PedidoItem {
  shoeModel: string;
  services?: Array<{ id?: string; name?: string; price?: number; nome?: string; preco?: number }>;
  photos?: string[];
  notes?: string | null;
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
  items?: PedidoItem[];
  itemCount?: number;
}

export interface CreatePedidoItemInput {
  shoeModel: string;
  services: Array<{ id?: string; name: string; price: number }>;
  notes?: string;
}

// ...existing code...
// Busca cliente por ID (cache leve para não refazer a cada abertura de modal)
export async function getClienteByIdService(id: string) {
  const token = getAuthToken();
  const cacheKey = buildCacheKey(`clientes:${id}`, token);

  const result = await fetchWithCache(`${API_BASE_URL}/clients/${id}`, {
    method: "GET",
    headers: getAuthHeaders(),
  }, { cacheKey, ttlMs: 5 * 60_000 });

  const payload = resolveApiPayload(result);
  if (!payload) throw new Error("Erro ao buscar cliente");
  return adaptClient(payload);
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
  const response = await fetch(`${API_BASE_URL}/clients/${id}`, {
    method: "PATCH",
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
const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001").replace(/\/+$/, "")
const API_BASE_URL = `${API_ORIGIN}/api/v1`

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

  const shopId = typeof window !== "undefined" ? localStorage.getItem("shopId") : null;
  if (shopId) {
    headers["X-Worqera-Shop"] = shopId;
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

export type MetricsPeriodo = "today" | "7d" | "15d" | "30d" | "90d" | "180d" | "1y";

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

export interface MetricsFinanceiroCaixaHoje {
  data: string
  entregueHoje: number
  entreguesCount: number
  sinaisHoje: number
  sinaisCount: number
  aReceberProntos: number
  prontosCount: number
  aReceberAbertos: number
  abertosCount: number
  entradaHoje: number
}

export interface MetricsFinanceiro {
  periodo: MetricsPeriodoInfo;
  resumo: MetricsFinanceiroResumo;
  receitaPorStatus: MetricsFinanceiroReceitaPorStatus[];
  topServicos: MetricsFinanceiroTopServico[];
  evolucaoDiaria: MetricsFinanceiroEvolucaoDiaria[];
  caixaHoje?: MetricsFinanceiroCaixaHoje;
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
  const cacheKey = buildCacheKey(`metrics:summary:${cacheSuffix}`, token);
  const result = await fetchWithCache(`${API_BASE_URL}/metrics/summary${suffix}`, {
    method: "GET",
    headers: getAuthHeaders(),
  }, { cacheKey, ttlMs: 60_000 });

  return adaptMetricsSummary(resolveApiPayload(result));
}

export async function getMetricsDepartamentosService(filters: MetricsBaseFilters = {}): Promise<MetricsDepartamento[]> {
  const { suffix, cacheSuffix } = buildMetricsQuery(filters);
  const token = getAuthToken();
  const cacheKey = buildCacheKey(`metrics:departments:${cacheSuffix}`, token);
  const result = await fetchWithCache(`${API_BASE_URL}/metrics/departments${suffix}`, {
    method: "GET",
    headers: getAuthHeaders(),
  }, { cacheKey, ttlMs: 60_000 });

  const payload = resolveApiPayload(result);
  return (Array.isArray(payload) ? payload : []).map(adaptDepartmentRow);
}

export async function getMetricsFuncionariosService(params: number | MetricsFuncionariosFilters = 10): Promise<MetricsFuncionario[]> {
  const normalized = typeof params === "number" ? { limit: params } : params;
  const { suffix, cacheSuffix } = buildMetricsQuery(normalized);
  const token = getAuthToken();
  const cacheKey = buildCacheKey(`metrics:employees:${cacheSuffix}`, token);

  const result = await fetchWithCache(`${API_BASE_URL}/metrics/employees${suffix}`, {
    method: "GET",
    headers: getAuthHeaders(),
  }, { cacheKey, ttlMs: 60_000 });

  const payload = resolveApiPayload(result);
  return (Array.isArray(payload) ? payload : []).map(adaptEmployeeMetricRow);
}

export async function getMetricsAtrasosService(filters: MetricsBaseFilters = {}): Promise<MetricsAtrasos> {
  const { suffix, cacheSuffix } = buildMetricsQuery(filters);
  const token = getAuthToken();
  const cacheKey = buildCacheKey(`metrics:delays:${cacheSuffix}`, token);
  const result = await fetchWithCache(`${API_BASE_URL}/metrics/delays${suffix}`, {
    method: "GET",
    headers: getAuthHeaders(),
  }, { cacheKey, ttlMs: 60_000 });

  return adaptMetricsDelays(resolveApiPayload(result));
}

export async function getMetricsFinanceiroService(filters: MetricsFinanceiroFilters = {}): Promise<MetricsFinanceiro> {
  const { suffix, cacheSuffix } = buildMetricsQuery(filters);
  const token = getAuthToken();
  const cacheKey = buildCacheKey(`metrics:finance:${cacheSuffix}`, token);
  const result = await fetchWithCache(`${API_BASE_URL}/metrics/finance${suffix}`, {
    method: "GET",
    headers: getAuthHeaders(),
  }, { cacheKey, ttlMs: 30_000 });

  return adaptMetricsFinance(resolveApiPayload(result));
}

export async function getMetricsFuncionariosDesempenhoService(filters: MetricsFuncionariosFilters = {}): Promise<MetricsFuncionariosDesempenho> {
  const { suffix, cacheSuffix } = buildMetricsQuery(filters);
  const token = getAuthToken();
  const cacheKey = buildCacheKey(`metrics:employees:performance:${cacheSuffix}`, token);
  const result = await fetchWithCache(`${API_BASE_URL}/metrics/employees/performance${suffix}`, {
    method: "GET",
    headers: getAuthHeaders(),
  }, { cacheKey, ttlMs: 30_000 });

  const payload = resolveApiPayload(result);
  return adaptMetricsOverview({ employees: payload }).funcionarios || payload;
}

export async function getMetricsOverviewService(filters: MetricsFinanceiroFilters & MetricsFuncionariosFilters = {}): Promise<MetricsOverview> {
  const { suffix, cacheSuffix } = buildMetricsQuery(filters);
  const token = getAuthToken();
  const cacheKey = buildCacheKey(`metrics:overview:${cacheSuffix}`, token);
  const result = await fetchWithCache(`${API_BASE_URL}/metrics/overview${suffix}`, {
    method: "GET",
    headers: getAuthHeaders(),
  }, { cacheKey, ttlMs: 30_000 });

  return adaptMetricsOverview(resolveApiPayload(result));
}

export async function getPedidoService(id: string) {
  const response = await fetch(`${API_BASE_URL}/orders/${id}`, {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao buscar pedido");
  }

  const result = await response.json();
  return adaptOrder(resolveApiPayload(result));
}

export async function listPedidoPdfsService(pedidoId: string): Promise<PedidoPdfAsset[]> {
  const response = await fetch(`${API_BASE_URL}/orders/${pedidoId}/pdfs`, {
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
  const raw = Array.isArray(payload)
    ? payload
    : Array.isArray(result?.pdfs)
      ? result.pdfs
      : Array.isArray(result?.data)
        ? result.data
        : [];
  return raw
    .map((p: any) => {
      const key = String(p.key || p.fileName || p.nome || "");
      const name = key.includes("/") ? key.slice(key.lastIndexOf("/") + 1) : key || "laudo.pdf";
      const url = p.url || "";
      if (!url) return null;
      return {
        url,
        fileName: name,
        nome: name,
        createdAt: p.lastModified || p.createdAt || undefined,
      } as PedidoPdfAsset;
    })
    .filter(Boolean) as PedidoPdfAsset[];
}

function parseUploadedPhotoUrls(payload: any): string[] {
  const urls = payload?.urls || payload?.fotos || payload?.photos || [];
  if (Array.isArray(urls)) {
    return urls
      .map((u) => (typeof u === "string" ? u : u?.url))
      .filter((url): url is string => typeof url === "string");
  }
  return [];
}

export async function uploadPedidoFotosService(pedidoId: string, files: File[]): Promise<string[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append("photos", file));

  const response = await fetch(`${API_BASE_URL}/orders/${pedidoId}/photos`, {
    method: "POST",
    headers: getAuthHeaders(""),
    body: formData,
    cache: "no-store",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.error || "Erro ao fazer upload das fotos");
  }

  const result = await response.json().catch(() => ({}));
  return parseUploadedPhotoUrls(resolveApiPayload(result));
}

export async function uploadPedidoItemFotosService(
  pedidoId: string,
  itemIndex: number,
  files: File[]
): Promise<string[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append("photos", file));

  const response = await fetch(
    `${API_BASE_URL}/orders/${pedidoId}/items/${itemIndex}/photos`,
    {
      method: "POST",
      headers: getAuthHeaders(""),
      body: formData,
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.error || "Erro ao fazer upload das fotos");
  }

  const result = await response.json().catch(() => ({}));
  return parseUploadedPhotoUrls(resolveApiPayload(result));
}

export async function downloadPedidoFotosZipService(pedidoId: string) {
  const response = await fetch(`${API_BASE_URL}/orders/${pedidoId}/photos/zip`, {
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
  const response = await fetch(`${API_BASE_URL}/employees`, {
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

  const result = await fetchWithCache(`${API_BASE_URL}/employees${qs ? `?${qs}` : ""}`, {
    method: "GET",
    headers: getAuthHeaders(),
  }, { cacheKey, ttlMs: 5 * 60_000 });

  const payload = resolveApiPayload(result);
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(result?.employees)
      ? result.employees
      : Array.isArray(result?.data)
        ? result.data
        : [];
  return list.map(adaptEmployee);
}

export async function getFuncionarioService(id: string): Promise<Funcionario> {
  const token = getAuthToken();
  const cacheKey = buildCacheKey(`funcionario:${id}`, token);

  const result = await fetchWithCache(`${API_BASE_URL}/employees/${id}`, {
    method: "GET",
    headers: getAuthHeaders(),
  }, { cacheKey, ttlMs: 5 * 60_000 });

  return resolveApiPayload(result);
}

export async function updateFuncionarioService(id: string, data: Partial<Funcionario>) {
  const response = await fetch(`${API_BASE_URL}/employees/${id}`, {
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
  const response = await fetch(`${API_BASE_URL}/employees/${id}`, {
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
  clienteId?: string;
  clientId?: string;
  clientName: string;
  clientEmail?: string;
  modeloTenis?: string;
  shoeModel?: string;
  servicos?: Array<{
    id: string;
    nome: string;
    preco: number;
    descricao: string;
  }>;
  items?: CreatePedidoItemInput[];
  fotos?: string[];
  precoTotal?: number;
  valorSinal?: number;
  valorRestante?: number;
  dataPrevistaEntrega?: string;
  departamento?: string;
  observacoes?: string;
  prioridade?: number;
  garantia?: {
    ativa: boolean;
    preco: number;
    duracao: string;
    data: string;
  };
  warranty?: unknown;
  pricing?: unknown;
  acessorios?: string[];
  status?: string;
}) {
  const body: Record<string, unknown> = { ...pedido };

  if (pedido.clientId && !pedido.clienteId) {
    body.clienteId = pedido.clientId;
  }
  if (pedido.clienteId && !pedido.clientId) {
    body.clientId = pedido.clienteId;
  }

  if (Array.isArray(pedido.items) && pedido.items.length) {
    const first = pedido.items[0];
    if (!pedido.modeloTenis && !pedido.shoeModel) {
      body.shoeModel = first.shoeModel;
      body.modeloTenis = first.shoeModel;
    }
    if (!pedido.servicos?.length) {
      body.services = first.services;
    }
  }

  const token = localStorage.getItem("token");
  const response = await fetch(`${API_BASE_URL}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Erro ao criar pedido");
  const result = await response.json();
  invalidateCacheByPrefix(PEDIDOS_CACHE_PREFIXES);
  return result;
}

// Cria um novo cliente
export async function createClienteService(cliente: {
  nomeCompleto: string;
  telefone: string;
  cpf?: string;
  email?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  complemento?: string;
  observacoes?: string;
}) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_BASE_URL}/clients`, {
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

// Busca lista de clientes (server-side q + paginação). Sempre retorna { data, nextToken, count }.
export async function getClientesService(
  opts: boolean | { q?: string; limit?: number; lastKey?: string; forceRefresh?: boolean } = {}
) {
  const token = getAuthToken();
  const options =
    typeof opts === "boolean"
      ? { forceRefresh: opts, q: undefined as string | undefined, limit: 200 as number | undefined, lastKey: undefined as string | undefined }
      : {
          forceRefresh: opts.forceRefresh,
          q: opts.q,
          limit: opts.limit ?? 50,
          lastKey: opts.lastKey,
        };

  const query = new URLSearchParams();
  if (options.q?.trim()) query.set("q", options.q.trim());
  if (options.limit) query.set("limit", String(options.limit));
  if (options.lastKey) query.set("cursor", options.lastKey);
  const qs = query.toString();

  const cacheKey = buildCacheKey(`clientes:${qs || "all"}`, token);

  const result = await fetchWithCache(
    `${API_BASE_URL}/clients${qs ? `?${qs}` : ""}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
    { cacheKey, ttlMs: 30_000, forceRefresh: Boolean(options.forceRefresh) }
  );

  const payload = resolveApiPayload(result);
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(result?.clients)
      ? result.clients
      : Array.isArray(result?.data)
        ? result.data
        : Array.isArray(result)
          ? result
          : [];
  return {
    data: list.map(adaptClient),
    nextToken: result?.nextToken || null,
    count: result?.count ?? list.length,
  };
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
  const shopId = data.shop?.id || data.membership?.shopId || data.shopId
  if (shopId) localStorage.setItem("shopId", String(shopId))
  // Salva no cookie (disponível para o middleware)
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; secure" : ""
  document.cookie = `token=${data.token}; path=/; max-age=604800; samesite=lax${secure}`
  if (data.refreshToken) {
    localStorage.setItem("refreshToken", data.refreshToken)
  }
  return data
}

// Colunas do board = setores ativos
export async function getStatusColumnsService(forceRefresh = false) {
  const token = getAuthToken();
  const cacheKey = buildCacheKey("status:columns:filtered", token);

  const result = await fetchWithCache(`${API_BASE_URL}/sectors`, {
    method: "GET",
    headers: getAuthHeaders(),
  }, { cacheKey, ttlMs: 10 * 60_000, forceRefresh });

  const sectors = result?.sectors || result?.data || [];
  const columns: Record<string, any[]> = {};
  (Array.isArray(sectors) ? sectors : [])
    .filter((s: any) => s.active !== false)
    .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
    .forEach((s: any) => {
      columns[s.name || s.slug || s._id] = [];
    });
  return columns;
}

// Busca todas as colunas (mesmo set — admin move livre no v1)
export async function getAllStatusColumnsService(forceRefresh = false) {
  return getStatusColumnsService(forceRefresh);
}

// Busca lista de pedidos no kanban (adapta GET /kanban → array flat legado)
export async function getOrdersStatusService(funcionario?: string, opts: { forceRefresh?: boolean } = {}) {
  const token = getAuthToken();
  const cacheKey = buildCacheKey(`pedidos:kanban:${funcionario || "all"}`, token);

  const result = await fetchWithCache(`${API_BASE_URL}/kanban`, {
    method: "GET",
    headers: getAuthHeaders(),
  }, { cacheKey, ttlMs: 10_000, forceRefresh: opts.forceRefresh });

  const columns = result?.columns || [];
  const orders: any[] = [];
  for (const col of columns) {
    const sector = col.sector || {};
    for (const o of col.orders || []) {
      orders.push({
        ...o,
        id: o.id || o._id,
        codigo: o.codigo || o.code,
        clientName: o.clientName,
        modeloTenis: o.modeloTenis || o.shoeModel,
        status: sector.name || o.status,
        setorAtual: sector._id || sector.id || o.setorAtual || o.currentSectorId,
        funcionarioAtual: o.funcionarioAtual || o.assigneeEmployeeName,
      });
    }
  }
  if (funcionario?.trim()) {
    const f = funcionario.trim().toLowerCase();
    return orders.filter((o) => String(o.funcionarioAtual || "").toLowerCase().includes(f));
  }
  return orders;
}

export async function getOrdersService(opts: { forceRefresh?: boolean } = {}) {
  const token = getAuthToken();
  const cacheKey = buildCacheKey("pedidos:list", token);

  const result = await fetchWithCache(`${API_BASE_URL}/orders`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  }, { cacheKey, ttlMs: 10_000, forceRefresh: opts.forceRefresh });
  
  const list = result.data || result.orders || result;
  return Array.isArray(list) ? list.map(adaptOrder) : list;
}

// Atualiza setor do pedido (UI legado chama "status"; no v1 movemos para o setor pelo nome)
export async function updateOrderStatusService(orderId: string, newStatus: string, funcionarioNome: string, observacao?: string) {
  const sectorsRes = await fetch(`${API_BASE_URL}/sectors`, { headers: getAuthHeaders() });
  const sectorsJson = await sectorsRes.json().catch(() => ({}));
  const sectors = sectorsJson.sectors || sectorsJson.data || [];
  const match = (Array.isArray(sectors) ? sectors : []).find(
    (s: any) =>
      String(s.name || "").toLowerCase() === String(newStatus || "").toLowerCase() ||
      String(s._id) === String(newStatus) ||
      String(s.slug || "").toLowerCase() === String(newStatus || "").toLowerCase()
  );
  if (!match) {
    // fallback: patch status de negócio
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: newStatus, notes: observacao }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const err: any = new Error(errorData.detail || errorData.error || "Erro ao atualizar pedido");
      err.status = response.status;
      throw err;
    }
    invalidateCacheByPrefix(PEDIDOS_CACHE_PREFIXES);
    return response.json();
  }

  return moverPedidoSetorService(orderId, String(match._id), funcionarioNome, observacao);
}

// Atualiza os dados completos de um pedido
export async function updateOrderService(
  orderId: string,
  orderData: {
    modeloTenis?: string;
    shoeModel?: string;
    clientName?: string;
    clientPhone?: string;
    notes?: string;
    observacoes?: string;
    servicos?: string;
    descricaoServicos?: string;
    price?: number;
    total?: number;
    deposit?: number;
    remaining?: number;
    status?: string;
    deliveredAt?: string;
    dataPrevistaEntrega?: string;
    dueAt?: string;
    prioridade?: number;
    pricing?: { total?: number; deposit?: number; remaining?: number; expenses?: number };
  }
) {
  const body: Record<string, unknown> = {};
  if (orderData.modeloTenis != null || orderData.shoeModel != null) {
    body.shoeModel = orderData.shoeModel ?? orderData.modeloTenis;
  }
  if (orderData.clientName != null) body.clientName = orderData.clientName;
  if (orderData.clientPhone != null) body.clientPhone = orderData.clientPhone;
  if (orderData.notes != null || orderData.observacoes != null) {
    body.notes = orderData.notes ?? orderData.observacoes;
  }
  if (orderData.status != null) body.status = orderData.status;
  if (orderData.deliveredAt != null) body.deliveredAt = orderData.deliveredAt;
  if (orderData.dataPrevistaEntrega != null || orderData.dueAt != null) {
    body.dueAt = orderData.dueAt ?? orderData.dataPrevistaEntrega;
  }
  if (orderData.prioridade != null) body.priority = orderData.prioridade;

  const total =
    orderData.pricing?.total ??
    orderData.total ??
    orderData.price;
  const deposit = orderData.pricing?.deposit ?? orderData.deposit;
  const remaining = orderData.pricing?.remaining ?? orderData.remaining;
  if (total != null || deposit != null || remaining != null) {
    body.pricing = {
      ...(orderData.pricing || {}),
      ...(total != null ? { total: Number(total) } : {}),
      ...(deposit != null ? { deposit: Number(deposit) } : {}),
      ...(remaining != null
        ? { remaining: Number(remaining) }
        : total != null && deposit != null
          ? { remaining: Math.max(0, Number(total) - Number(deposit)) }
          : {}),
    };
  }

  const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.error || "Erro ao atualizar pedido");
  }

  const result = await response.json();
  invalidateCacheByPrefix(PEDIDOS_CACHE_PREFIXES);
  return adaptOrder(resolveApiPayload(result) || result);
}

export async function getDashboardService(opts: { forceRefresh?: boolean } = {}) {
  const token = getAuthToken();
  const cacheKey = buildCacheKey("dashboard", token);

  const result = await fetchWithCache(`${API_BASE_URL}/dashboard`, {
    method: "GET",
    headers: getAuthHeaders(),
  }, { cacheKey, ttlMs: 15_000, forceRefresh: opts.forceRefresh });
  
  if (result?.recentOrders) {
    result.recentOrders = result.recentOrders.map(adaptOrder);
  }
  return result;
}

// Estatísticas por setor
export async function getSetoresEstatisticasService(opts: { forceRefresh?: boolean } = {}) {
  const token = getAuthToken();
  const cacheKey = buildCacheKey("setores:estatisticas", token);
  const result = await fetchWithCache(`${API_BASE_URL}/sectors/stats?includeOrders=true`, {
    method: "GET",
    headers: getAuthHeaders(),
  }, { cacheKey, ttlMs: 30_000, forceRefresh: opts.forceRefresh });
  if (!result) return result;
  return result.data || result.stats || result;
}

export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
) {
  const headers: Record<string, string> = {
    ...getAuthHeaders(),
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
  const response = await fetch(`${API_BASE_URL}/orders/${pedidoId}/pdf`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({}),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.error || "Erro ao gerar PDF do pedido");
  }

  return response.blob();
}

// Próximo setor para o pedido
export async function getProximoSetorService(pedidoId: string) {
  const [orderRes, sectorsRes] = await Promise.all([
    fetch(`${API_BASE_URL}/orders/${pedidoId}`, { headers: getAuthHeaders() }),
    fetch(`${API_BASE_URL}/sectors`, { headers: getAuthHeaders() }),
  ]);
  if (!orderRes.ok) throw new Error("Pedido não encontrado");
  const order = await orderRes.json();
  const sectorsJson = await sectorsRes.json();
  const sectors = (sectorsJson.sectors || [])
    .filter((s: any) => s.active !== false)
    .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
  const currentId = String(order.currentSectorId || order.setorAtual || "");
  const idx = sectors.findIndex((s: any) => String(s._id) === currentId);
  const next = idx >= 0 && idx < sectors.length - 1 ? sectors[idx + 1] : null;
  return next
    ? { setorId: next._id, setor: next, nome: next.name }
    : { setorId: null, done: true };
}

// Mover pedido para setor específico
export async function moverPedidoSetorService(
  pedidoId: string,
  setorId: string,
  funcionarioNome?: string,
  observacao?: string,
  _status?: string,
) {
  const payload: Record<string, string> = { toSectorId: setorId };
  if (funcionarioNome?.trim()) payload.employeeName = funcionarioNome.trim();
  if (observacao?.trim()) payload.note = observacao.trim();

  const response = await fetch(`${API_BASE_URL}/kanban/orders/${pedidoId}/move`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const err: any = new Error(errorData.detail || errorData.error || "Erro ao mover pedido de setor");
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
  clientId?: string;
  status?: string;
  setor?: string;
  funcionario?: string;
  dataInicio?: string;
  dataFim?: string;
  deleted?: string;
  trash?: string;
  q?: string;
  limit?: number;
  lastKey?: string;
} = {}, opts: { forceRefresh?: boolean } = {}) {
  const token = getAuthToken();
  const query = new URLSearchParams();
  const map: Record<string, string> = {
    codigo: "code",
    cliente: "client",
    clientId: "clientId",
    status: "status",
    setor: "sectorId",
    funcionario: "employeeId",
    dataInicio: "dataInicio",
    dataFim: "dataFim",
    limit: "limit",
    lastKey: "cursor",
  };
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === "string" && value.trim() === "") return;
    if (key === "limit" && typeof value === "number" && value <= 0) return;
    query.append(map[key] || key, String(value));
  });

  const qs = query.toString();
  const cacheKey = buildCacheKey(`pedidos:consulta:${qs || "all"}`, token);
  const result = await fetchWithCache(`${API_BASE_URL}/orders${qs ? `?${qs}` : ""}`, {
    method: "GET",
    headers: getAuthHeaders(),
  }, { cacheKey, ttlMs: 15_000, forceRefresh: opts.forceRefresh });

  const data = Array.isArray(result?.data)
    ? result.data
    : Array.isArray(result?.orders)
      ? result.orders
      : Array.isArray(result)
        ? result
        : [];
  return {
    data: data.map(adaptOrder),
    nextToken: result?.nextToken,
    count: result?.count ?? data.length,
  };
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
