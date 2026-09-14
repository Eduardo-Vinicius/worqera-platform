"use client"

import { useState, useRef, useEffect, useMemo, useCallback, useDeferredValue, startTransition, memo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  Play,
  Eye,
  Loader2,
  FileText,
  Search,
  Zap,
  Move,
  Users,
  Package,
  Settings,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Filter,
  MessageCircle,
  Headphones,
  Scissors,
  Droplets,
  Paintbrush,
  Wrench,
  Sparkles,
  Hammer,
  ClipboardCopy
} from "lucide-react"
import Link from "next/link"
import { CardDetalhesPedido, type PedidoDetalhes } from "@/components/CardDetalhesPedido"
import { getStatusColumnsService, getAllStatusColumnsService, getOrdersStatusService, updateOrderStatusService, generateOrderPDFService, getUserInfoService, downloadBlobAsFile, moverPedidoSetorService } from "@/lib/apiService"
import { toast } from "sonner"
import { SETORES_CORES, SETORES_NOMES, SETORES } from "@/lib/setores"
import { listFuncionariosService, Funcionario } from "@/lib/apiService"

// Interface para as colunas de status
interface StatusColumn {
  [columnName: string]: any[];
}

// Interface para um pedido
interface Order {
  id: string;
  codigo?: string;
  funcionarioAtual?: string;
  clientName: string;
  clientId: string;
  clientCpf: string;
  sneaker: string;
  serviceType: string;
  servicos: string;
  description: string;
  observacoes: string;
  price: number;
  prioridade?: number;
  status: string;
  createdDate: string;
  expectedDate: string;
  statusHistory: Array<{
    status: string;
    date: string;
    time: string;
    userId?: string;
    userName?: string;
  }>;
  // Novos campos da API
  modeloTenis: string;
  tipoServico: string;
  descricaoServicos: string;
  preco: number;
  precoTotal: number;
  valorSinal: number;
  valorRestante: number;
  dataPrevistaEntrega: string;
  dataCriacao: string;
  fotos: string[];
  garantia: {
    ativa: boolean;
    preco: number;
    duracao: string;
    data?: string;
  };
  acessorios: string[];
  // Sistema de setores (novos campos)
  setorAtual?: string;
  setoresFluxo?: string[];
  setoresHistorico?: Array<{
    setorId: string;
    setorNome?: string;
    entradaEm: string;
    saidaEm?: string | null;
    funcionarioEntrada?: string;
    funcionarioSaida?: string | null;
  }>;
  departamentosSelecionados?: Array<{ id: string; nome: string }>;
  observacoesFluxo?: Array<{
    setorId?: string;
    setorNome?: string;
    observacao?: string;
    usuario?: string;
    usuarioNome?: string;
    timestamp?: string;
  }>;
  // Quem criou o pedido
  createdBy?: {
    userId: string;
    userName: string;
    userEmail: string;
    userRole: string;
  };
}

interface UserInfo {
  id: string;
  email: string;
  role: string;
  departamento: string | null;
  nome: string;
}

const getStatusInfo = (status: string) => {
  // Map common status to their display info
  const statusMap: { [key: string]: any } = {
    "A Fazer": {
      label: "A Fazer",
      color: "bg-yellow-100 text-yellow-800 border-yellow-300",
      icon: Play,
      bgColor: "bg-yellow-50",
      gradient: "from-yellow-400 to-yellow-500"
    },
    "Em Andamento": {
      label: "Em Andamento",
      color: "bg-blue-100 text-blue-800 border-blue-300",
      icon: Clock,
      bgColor: "bg-blue-50",
      gradient: "from-blue-400 to-blue-500"
    },
    "Concluído": {
      label: "Concluído",
      color: "bg-green-100 text-green-800 border-green-300",
      icon: CheckCircle,
      bgColor: "bg-green-50",
      gradient: "from-green-400 to-green-500"
    },
    "iniciado": {
      label: "Iniciado",
      color: "bg-yellow-100 text-yellow-800 border-yellow-300",
      icon: Play,
      bgColor: "bg-yellow-50",
      gradient: "from-yellow-400 to-yellow-500"
    },
    "em-processamento": {
      label: "Em Processamento",
      color: "bg-blue-100 text-blue-800 border-blue-300",
      icon: Clock,
      bgColor: "bg-blue-50",
      gradient: "from-blue-400 to-blue-500"
    },
    "concluido": {
      label: "Concluído",
      color: "bg-green-100 text-green-800 border-green-300",
      icon: CheckCircle,
      bgColor: "bg-green-50",
      gradient: "from-green-400 to-green-500"
    }
  };

  return statusMap[status] || {
    label: status,
    color: "bg-gray-100 text-gray-800 border-gray-300",
    icon: Clock,
    bgColor: "bg-gray-50",
    gradient: "from-gray-400 to-gray-500"
  };
}

// Helpers compartilhados (fora do componente para uso no KanbanCard memoizado)
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

const resolveDeptFromSetor = (setorId?: string | null): string | null => {
  if (!setorId) return null;
  const s = setorId.toLowerCase();
  if (s.includes("atendimento")) return "atendimento";
  if (s.includes("sapat")) return "sapataria";
  if (s.includes("costur")) return "costura";
  if (s.includes("lavag")) return "lavagem";
  if (s.includes("pint")) return "pintura";
  if (s.includes("mont")) return "montagem";
  if (s.includes("acab")) return "acabamento";
  return null;
};

const resolveDeptFromStatus = (status: string, setorId?: string | null): string | null => {
  const bySetor = resolveDeptFromSetor(setorId);
  if (bySetor) return bySetor;
  const s = status?.toLowerCase?.() || "";
  if (s.includes("atendimento")) return "atendimento";
  if (s.includes("sapat")) return "sapataria";
  if (s.includes("costur")) return "costura";
  if (s.includes("lavag")) return "lavagem";
  if (s.includes("pint")) return "pintura";
  if (s.includes("mont")) return "montagem";
  if (s.includes("acab")) return "acabamento";
  return null;
};

const getDeptIcon = (dept: string | null) => {
  switch (dept) {
    case "atendimento":
      return Headphones;
    case "sapataria":
      return Hammer;
    case "costura":
      return Scissors;
    case "lavagem":
      return Droplets;
    case "pintura":
      return Paintbrush;
    case "montagem":
      return Wrench;
    case "acabamento":
      return Sparkles;
    default:
      return null;
  }
};

const getFirstPhotoUrl = (fotos?: any[]): string | null => {
  if (!Array.isArray(fotos)) return null;
  const pick = fotos.find((f) => {
    if (!f) return false;
    const val = typeof f === 'string' ? f : (f.url || f.fotoUrl || f.uploadedUrl || f.s3Url || f.location || f.src || "");
    return typeof val === 'string' && /^https?:\/\//i.test(val.trim());
  });
  if (!pick) return null;
  const val = typeof pick === 'string' ? pick : (pick.url || pick.fotoUrl || pick.uploadedUrl || pick.s3Url || pick.location || pick.src || "");
  return typeof val === 'string' ? val : null;
};

const getSlaInfo = (order: { expectedDate?: string; dataPrevistaEntrega?: string }) => {
  const expectedRaw = order.expectedDate || order.dataPrevistaEntrega;
  if (!expectedRaw) return { label: "Sem prazo", tone: "gray", className: "bg-slate-100 text-slate-700" };
  const expected = new Date(expectedRaw).getTime();
  if (Number.isNaN(expected)) return { label: "Sem prazo", tone: "gray", className: "bg-slate-100 text-slate-700" };
  const now = Date.now();
  const diffMs = expected - now;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) return { label: "Atrasado", tone: "red", className: "bg-red-100 text-red-700" };
  if (diffDays <= 1) return { label: "24h", tone: "amber", className: "bg-amber-100 text-amber-700" };
  return { label: `${diffDays}d`, tone: "green", className: "bg-emerald-100 text-emerald-700" };
};

export default function StatusControlPage() {

  const [baseStatusColumns, setBaseStatusColumns] = useState<StatusColumn>({});
  const [statusColumns, setStatusColumns] = useState<StatusColumn>({});
  const [allStatusColumns, setAllStatusColumns] = useState<StatusColumn>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const deferredOrders = useDeferredValue(orders);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [selectedSector, setSelectedSector] = useState("next");
  const [quickView, setQuickView] = useState<"all" | "today" | "overdue" | "high" | "due24">("all");
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [funcionarioFilter, setFuncionarioFilter] = useState("");
  const [activeFuncionarioFilter, setActiveFuncionarioFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");

  // Dialog de movimento
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveOrderId, setMoveOrderId] = useState<string | null>(null);
  const [moveNewStatus, setMoveNewStatus] = useState<string | null>(null);
  const [moveTargetSetorId, setMoveTargetSetorId] = useState<string | null>(null);
  const [movedByName, setMovedByName] = useState<string>("");
  const [movedByNote, setMovedByNote] = useState<string>("");
  const [moveDialogSubmitting, setMoveDialogSubmitting] = useState(false);
  const [showDeptOnly, setShowDeptOnly] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<"all" | "high">("all");
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());
  const [funcionariosSetor, setFuncionariosSetor] = useState<Funcionario[]>([]);
  const [funcionariosLoading, setFuncionariosLoading] = useState(false);
  const [compactView, setCompactView] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [justMovedOrderId, setJustMovedOrderId] = useState<string | null>(null);
  const loadPromiseRef = useRef<Promise<any> | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Defer heavy filtering while usuário digita para evitar travamentos
  const deferredClientFilter = useDeferredValue(clientFilter);
  const deferredPriorityFilter = useDeferredValue(priorityFilter);
  const deferredQuickView = useDeferredValue(quickView);

  const patternsByDept: Record<string, string[]> = {
    atendimento: ["atendimento"],
    sapataria: ["sapataria"],
    costura: ["costura"],
    lavagem: ["lavagem"],
    pintura: ["pintura"],
    montagem: ["montagem"],
    acabamento: ["acabamento"],
  };

  const filterColumnsForDept = (columns: StatusColumn, user: UserInfo | null): StatusColumn => {
    if (!user || user.role === 'admin') return columns;
    const dept = (user.departamento || "").toLowerCase();
    if (!dept) return columns;
    const patterns = patternsByDept[dept] || [dept];
    const allowed = Object.keys(columns).filter((col) => {
      const c = col.toLowerCase();
      return patterns.some((p) => c.includes(p));
    });
    if (!allowed.length) return columns;
    const filtered: StatusColumn = {};
    allowed.forEach((name) => {
      filtered[name] = columns[name];
    });
    return filtered;
  };

  // Normaliza formatos diferentes de colunas que podem vir da API
  const normalizeColumns = (data: any): StatusColumn => {
    if (!data) return {};
    if (Array.isArray(data)) {
      return data.reduce((acc, col: any) => {
        const key = typeof col === "string" ? col : col?.name || col?.label || col?.status || col?.id;
        if (key) acc[key] = [];
        return acc;
      }, {} as StatusColumn);
    }
    if (typeof data === "object") return data as StatusColumn;
    return {};
  };

  const resolveColumnForOrder = useCallback(
    (order: Partial<Order>, columns: StatusColumn = statusColumns) => {
      const columnNames = Object.keys(columns || {});
      if (!columnNames.length) return order.status || order.setorAtual || null;

      const normalize = (value?: string | null) => (value || "").toString().trim().toLowerCase();
      const findMatch = (value?: string | null) => {
        if (!value) return null;
        const normalized = normalize(value);
        const exact = columnNames.find(col => normalize(col) === normalized);
        if (exact) return exact;
        return columnNames.find(col => normalize(col).includes(normalized) || normalized.includes(normalize(col))) || null;
      };

      const setorLabel = order.setorAtual ? (SETORES_NOMES[order.setorAtual] || order.setorAtual) : null;

      const match =
        findMatch(order.status) ||
        findMatch(setorLabel) ||
        findMatch(order.setorAtual);

      // Se não houver coluna compatível visível, preserve o status/setor atual
      // para permitir que filtros removam o pedido da visão do setor atual.
      return match || order.status || order.setorAtual || null;
    },
    [statusColumns]
  );

  const normalizeOrderToColumns = useCallback(
    (order: Order, columns: StatusColumn = statusColumns): Order => {
      const targetColumn = resolveColumnForOrder(order, columns);
      if (!targetColumn) return order;
      return { ...order, status: targetColumn };
    },
    [resolveColumnForOrder, statusColumns]
  );

  const loadData = useCallback(async (filterFuncionario = "", includeUser = true) => {
    if (loadPromiseRef.current) {
      return loadPromiseRef.current;
    }

    if (!initialLoadDone) {
      setLoading(true);
    }

    const promises: Array<Promise<any>> = [
      getStatusColumnsService(), // filtradas para exibição
      getAllStatusColumnsService(), // completas para movimentação
      getOrdersStatusService(filterFuncionario),
    ];

    if (includeUser) {
      promises.push(
        getUserInfoService().catch(() => ({
          id: '',
          email: '',
          role: 'user',
          departamento: null,
          nome: 'Usuário',
        }))
      );
    }

    const loadPromise = Promise.all(promises);
    loadPromiseRef.current = loadPromise;

    try {
      const [columnsData, allColumnsData, ordersData, userDataRaw] = await loadPromise;
      const userData = includeUser ? userDataRaw : userInfo;

      const normalizedColumns = normalizeColumns(columnsData);
      const normalizedAllColumns = normalizeColumns(allColumnsData);
      const visibleColumns = filterColumnsForDept(normalizedColumns, userData as UserInfo);

      const resolveWithColumns = (order: Order, columns: StatusColumn) => {
        const columnNames = Object.keys(columns || {});
        if (!columnNames.length) return order.status || order.setorAtual || null;

        const normalizeVal = (value?: string | null) => (value || "").toString().trim().toLowerCase();
        const findMatch = (value?: string | null) => {
          if (!value) return null;
          const normalized = normalizeVal(value);
          const exact = columnNames.find((col) => normalizeVal(col) === normalized);
          if (exact) return exact;
          return columnNames.find((col) => normalizeVal(col).includes(normalized) || normalized.includes(normalizeVal(col))) || null;
        };

        const setorLabel = order.setorAtual ? (SETORES_NOMES[order.setorAtual] || order.setorAtual) : null;

        const match =
          findMatch(order.status) ||
          findMatch(setorLabel) ||
          findMatch(order.setorAtual);

        // Se não houver match visível, mantém status original para ser filtrado
        return match || order.status || order.setorAtual || null;
      };

      const normalizedOrders = (ordersData || []).map((order: Order) => {
        const col = resolveWithColumns(order, visibleColumns);
        return col ? { ...order, status: col } : order;
      });

      startTransition(() => {
        setBaseStatusColumns(normalizedColumns);
        setStatusColumns(visibleColumns);
        setAllStatusColumns(Object.keys(normalizedAllColumns).length ? normalizedAllColumns : normalizedColumns);
        setOrders(normalizedOrders);
        if (includeUser && userData) setUserInfo(userData as UserInfo);
        setInitialLoadDone(true);
      });
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      setSuccessMessage("Erro ao carregar dados. Verifique sua conexão e tente novamente.");
      setStatusColumns({});
      setAllStatusColumns({});
      setOrders([]);
      if (includeUser) {
        setUserInfo({
          id: '',
          email: '',
          role: 'user',
          departamento: null,
          nome: 'Usuário',
        });
      }
    } finally {
      setLoading(false);
      loadPromiseRef.current = null;
    }
  }, [initialLoadDone, userInfo]);

  // Carrega as colunas de status, pedidos e informações do usuário
  useEffect(() => {
    loadData();
  }, [loadData]);

  const refetchOrders = useCallback(async () => {
    try {
      await loadData(activeFuncionarioFilter, false);
    } catch (error) {
      console.error("Erro ao sincronizar pedidos:", error);
      toast.error("Não foi possível sincronizar os pedidos. Tente novamente.");
    }
  }, [activeFuncionarioFilter, loadData]);

  const applyOrderUpdate = useCallback(
    (updatedOrder: Order) => {
      const movementColumns = (allStatusColumns && Object.keys(allStatusColumns).length) ? allStatusColumns : statusColumns;
      const targetColumn = resolveColumnForOrder(updatedOrder, movementColumns) || updatedOrder.status;
      const normalized: Order = targetColumn ? { ...updatedOrder, status: targetColumn } : updatedOrder;

      const columnExists = !!(targetColumn && statusColumns && Object.prototype.hasOwnProperty.call(statusColumns, targetColumn));
      const originalColumnMissing = updatedOrder.status
        ? !(statusColumns && Object.prototype.hasOwnProperty.call(statusColumns, updatedOrder.status))
        : false;
      const shouldShowInView = !!(targetColumn && statusColumns && Object.prototype.hasOwnProperty.call(statusColumns, targetColumn));

      setOrders((prevOrders) => {
        let found = false;
        const next = prevOrders
          .map((order) => {
            if (order.id === normalized.id) {
              found = true;
              return { ...order, ...normalized };
            }
            return order;
          })
          .filter((order) => {
            // Se o pedido foi movido para uma coluna não visível (outro departamento), remove da visão atual
            if (order.id === normalized.id && !shouldShowInView) return false;
            return true;
          });

        if (!found && shouldShowInView) {
          next.push(normalized);
        }
        return next;
      });

      setSelectedOrder((prevSelected) =>
        prevSelected?.id === normalized.id ? { ...prevSelected, ...normalized } : prevSelected
      );

      setJustMovedOrderId(normalized.id);

      // Se não achar coluna compatível, refaz o fetch completo para manter o quadro consistente
      if (!columnExists || originalColumnMissing) {
        // Dedup será feito por loadData
        refetchOrders();
      }
    },
    [normalizeOrderToColumns, refetchOrders, resolveColumnForOrder, statusColumns]
  );

  const updateOrderStatus = async (
    orderId: string,
    newStatus: string,
    movedByName?: string,
    note?: string,
    targetSetorIdOverride?: string | null,
  ) => {
    try {
      const nome = (movedByName || userInfo?.nome || "").trim();
      if (!nome) {
        toast.error("Informe o nome do funcionário.");
        return;
      }

      const currentOrder = orders.find((o) => o.id === orderId);
      const setorAtual = currentOrder?.setorAtual;
      const targetSetorId = targetSetorIdOverride || mapStatusToSetorId(newStatus);
      const changingSetor = Boolean(targetSetorId && setorAtual && targetSetorId !== setorAtual);

      // Só usa mover-setor quando o status realmente muda de setor.
      const updatedOrder = changingSetor && targetSetorId
        ? await moverPedidoSetorService(orderId, targetSetorId, nome, note, newStatus)
        : await updateOrderStatusService(orderId, newStatus, nome, note);

      const merged = {
        ...updatedOrder,
        status: updatedOrder.status || newStatus,
        statusHistory: updatedOrder.statusHistory || [],
        setoresHistorico: updatedOrder.setoresHistorico || [],
      } as Order;

      applyOrderUpdate(merged);

      setSuccessMessage(`Pedido #${updatedOrder?.codigo || orderId} atualizado para ${getStatusInfo(merged.status).label}`);
      toast.success(`Movido por ${nome}`);
      setTimeout(() => setSuccessMessage(""), 3000);
      setDraggedOrderId(null);
    } catch (error: any) {
      console.error("Erro ao atualizar status:", error);

      const statusCode = error?.status as number | undefined;

      // Mensagens de erro mais específicas
      let errorMessage = "Erro ao atualizar status do pedido";
      if (error.message?.toLowerCase().includes("status") && error.message?.toLowerCase().includes("invál")) {
        errorMessage = error.message;
      } else if (statusCode === 400 || error.message?.includes("400")) {
        errorMessage = "Status inválido para este fluxo. O pedido foi mantido na coluna atual.";
      } else if (statusCode === 401 || statusCode === 403 || error.message?.includes("Token")) {
        errorMessage = "Sessão expirada ou sem permissão. Faça login novamente.";
      } else if (statusCode && statusCode >= 500) {
        errorMessage = "Erro no servidor ao mover o pedido. Tente novamente.";
      } else if (error.message?.toLowerCase().includes("status")) {
        errorMessage = `Status inválido: ${error.message}`;
      }
      if (error.message?.includes("não tem permissão")) {
        errorMessage = "Você não tem permissão para alterar para este status";
      } else if (error.message?.includes("não encontrado")) {
        errorMessage = "Pedido não encontrado";
      }

      setSuccessMessage(errorMessage);
      toast.error(errorMessage);
      setTimeout(() => setSuccessMessage(""), 5000);
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, orderId: string) => {
    setDraggedOrderId(orderId);
    // Set transfer data to keep drag API happy across browsers
    e.dataTransfer.setData("text/plain", orderId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDragEnter = (status: string) => {
    if (draggedOrderId) setDragOverColumn(status);
  };

  const handleDragLeave = (status: string) => {
    if (dragOverColumn === status) setDragOverColumn(null);
  };

  const handleDrop = (status: string) => {
    if (!draggedOrderId) return;

    const order = orders.find((o) => o.id === draggedOrderId);
    if (order?.status === status) {
      setDraggedOrderId(null);
      setDragOverColumn(null);
      return; // mesma coluna, nenhuma ação
    }

    const inferredSetor = mapStatusToSetorId(status);
    setMoveDialogOpen(true);
    setMoveOrderId(draggedOrderId);
    setMoveNewStatus(status);
    setMoveTargetSetorId(inferredSetor);
    setMovedByName(userInfo?.nome || "");
    setMovedByNote("");
    setDragOverColumn(null);
  };
  const getResponsavelAtual = (order: Order): string | null => {
    if (order.funcionarioAtual?.trim()) {
      return order.funcionarioAtual.trim();
    }

    // Helper para ler diferentes chaves possíveis vindas do backend
    const readAny = (obj: any, keys: string[]): string | null => {
      for (const k of keys) {
        const v = obj?.[k];
        if (typeof v === 'string' && v.trim()) return v;
      }
      return null;
    };

    // Preferir funcionário do setor atual, se presente
    const hist = order.setoresHistorico || [];
    if (hist.length > 0) {
      const atual: any = hist[hist.length - 1] as any;
      const nome = readAny(atual, [
        'funcionarioEntrada',
        'funcionarioNome',
        'funcionario',
        'responsavelEntrada',
      ]);
      if (nome) return nome;
    }
    // Caso contrário, último usuário que moveu status
    const sh = order.statusHistory || [];
    if (sh.length > 0) {
      const last: any = sh[sh.length - 1] as any;
      const nome = readAny(last, [
        'userName',
        'funcionarioNome',
        'funcionario',
        'movedByName',
        'responsavel',
      ]);
      if (nome) return nome;
    }
    // Fallback: quem criou o pedido
    const createdByNome = readAny(order.createdBy as any, ['userName', 'nome', 'name']);
    if (createdByNome) return createdByNome;
    return null;
  };


  // Função para gerar PDF do pedido
  const generateOrderPDF = async (order: Order) => {
    try {
      setSuccessMessage("Gerando PDF do pedido...");

      // Chama o service do backend para gerar o PDF
      const pdfBlob = await generateOrderPDFService(order.id);
      downloadBlobAsFile(pdfBlob, `pedido-${order.id}.pdf`);

      setSuccessMessage(`PDF do pedido #${order.codigo || order.id} gerado com sucesso!`);
      setTimeout(() => setSuccessMessage(""), 3000);
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

      setSuccessMessage(errorMessage);
      setTimeout(() => setSuccessMessage(""), 5000);
    }
  };

  const handlePedidoUpdated = (updated: PedidoDetalhes) => {
    applyOrderUpdate(updated as unknown as Order);
  };

  const handleApplyFuncionarioFilter = async () => {
    const filter = funcionarioFilter.trim();
    setActiveFuncionarioFilter(filter);
    await loadData(filter, false);
  };

  const handleClearFuncionarioFilter = async () => {
    setFuncionarioFilter("");
    setActiveFuncionarioFilter("");
    await loadData("", false);
  };

  // Função para avançar pedido por número do pedido ou CPF do cliente
  const handleQuickAdvance = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    // Busca por número do pedido (id) ou código visível
    let foundOrder = orders.find(o => o.id === trimmed || (o.codigo && o.codigo === trimmed));
    // Se não achou, busca por CPF do cliente
    if (!foundOrder) {
      foundOrder = orders.find(o => o.clientCpf.replace(/\D/g, "") === trimmed.replace(/\D/g, ""));
    }

    if (foundOrder) {
      let nextStatus: string | null = null;
      let actionMessage = "";

      if (selectedSector === "next") {
        // Comportamento original: próximo status sequencial dentro das colunas que o usuário vê
        const columnNames = Object.keys(filteredStatusColumns);
        const currentIndex = columnNames.indexOf(foundOrder.status);
        const nextIndex = currentIndex + 1;

        if (nextIndex < columnNames.length) {
          nextStatus = columnNames[nextIndex];
          actionMessage = `avançado para ${getStatusInfo(nextStatus).label}`;
        }
      } else if (selectedSector === "prev") {
        // Status anterior dentro das colunas que o usuário vê
        const columnNames = Object.keys(filteredStatusColumns);
        const currentIndex = columnNames.indexOf(foundOrder.status);
        const prevIndex = currentIndex - 1;

        if (prevIndex >= 0) {
          nextStatus = columnNames[prevIndex];
          actionMessage = `voltado para ${getStatusInfo(nextStatus).label}`;
        }
      } else {
        const movementColumns = allStatusColumns && Object.keys(allStatusColumns).length ? allStatusColumns : statusColumns;
        if (Object.keys(movementColumns).includes(selectedSector)) {
          // Mover diretamente para uma coluna específica (qualquer coluna do sistema)
          nextStatus = selectedSector;
          actionMessage = `movido para ${getStatusInfo(nextStatus).label}`;
        } else {
          // Mover para setor específico (fallback para compatibilidade)
          const targetStatus = getFirstStatusForSector(selectedSector);
          if (targetStatus) {
            nextStatus = targetStatus;
            actionMessage = `movido para ${getAvailableSectors().find(s => s.value === selectedSector)?.label || selectedSector}`;
          }
        }
      }

      if (nextStatus) {
        // Abrir diálogo para capturar funcionário antes de mover
        setMoveDialogOpen(true);
        setMoveOrderId(foundOrder.id);
        setMoveNewStatus(nextStatus);
        const explicitSetor = normalizeSectorOptionToSetorId(selectedSector);
        setMoveTargetSetorId(explicitSetor || mapStatusToSetorId(nextStatus));
        setMovedByName(userInfo?.nome || "");
        setMovedByNote("");
      } else {
        if (selectedSector === "next") {
          setSuccessMessage(`Pedido #${foundOrder.codigo || foundOrder.id} já está no status final`);
        } else {
          setSuccessMessage(`Não foi possível mover para o setor ${selectedSector}`);
        }
      }
      setTimeout(() => setSuccessMessage(""), 3000);
    } else {
      setSuccessMessage("Pedido ou cliente não encontrado");
      setTimeout(() => setSuccessMessage(""), 3000);
    }
    setInputValue("");
    inputRef.current?.focus();
  };

  // Função para obter o primeiro status de um setor específico (considera todas as colunas disponíveis para movimento)
  const getFirstStatusForSector = (sector: string): string | null => {
    const columnNames = Object.keys(allStatusColumns && Object.keys(allStatusColumns).length ? allStatusColumns : statusColumns);

    if (sector === "atendimento:final") {
      const final = getAtendimentoFinalStatus();
      if (final) return final;
    }

    const sectorPatterns = {
      "atendimento": ['atendimento', 'Atendimento', 'ATENDIMENTO'],
      "atendimento:inicio": ['atendimento', 'Atendimento', 'ATENDIMENTO'],
      sapataria: ['sapataria', 'Sapataria', 'SAPATARIA'],
      costura: ['costura', 'Costura', 'COSTURA'],
      lavagem: ['lavagem', 'Lavagem', 'LAVAGEM'],
      pintura: ['pintura', 'Pintura', 'PINTURA'],
      montagem: ['montagem', 'Montagem', 'MONTAGEM'],
      acabamento: ['acabamento', 'Acabamento', 'ACABAMENTO']
    } as const;

    const patterns = sectorPatterns[sector as keyof typeof sectorPatterns];
    if (!patterns) return null;

    const todosTokens = ['a fazer', 'afazer', 'to do', 'todo', 'backlog', 'iniciado', 'iniciar'];

    const matches = columnNames.filter(col =>
      patterns.some((p) => col.toLowerCase().includes(p.toLowerCase()))
    );

    const todoMatch = matches.find(col =>
      todosTokens.some((t) => col.toLowerCase().includes(t))
    );
    if (todoMatch) return todoMatch;

    if (matches.length) return matches[0];

    if (sector === "atendimento:final") return getAtendimentoFinalStatus();

    return null;
  };

  // Função para obter setores disponíveis baseado em todas as colunas (mesmo que não estejam visíveis)
  const getAvailableSectors = () => {
    return [
      { value: "atendimento:inicio", label: "Atendimento (início)" },
      { value: "atendimento:final", label: "Atendimento Final" },
      { value: "sapataria", label: "Sapataria" },
      { value: "costura", label: "Costura" },
      { value: "lavagem", label: "Lavagem" },
      { value: "pintura", label: "Pintura" },
      { value: "montagem", label: "Montagem" },
      { value: "acabamento", label: "Acabamento" },
    ];
  };

  const mapStatusToSetorId = (status: string, fallbackSetor?: string | null): string | null => {
    const s = status.toLowerCase();
    if (s.includes("atendimento-final")) return SETORES.ATENDIMENTO_FINAL;
    if (s.includes("atendimento")) return SETORES.ATENDIMENTO_INICIAL;
    if (s.includes("sapat")) return SETORES.SAPATARIA;
    if (s.includes("costur")) return SETORES.COSTURA;
    if (s.includes("lavag")) return SETORES.LAVAGEM;
    if (s.includes("pint")) return SETORES.PINTURA;
    if (s.includes("mont")) return "montagem";
    if (s.includes("acab")) return SETORES.ACABAMENTO;
    if (fallbackSetor) return fallbackSetor;
    return null;
  };

  const normalizeSectorOptionToSetorId = (sectorValue?: string | null): string | null => {
    if (!sectorValue) return null;
    if (sectorValue === "atendimento:inicio") return SETORES.ATENDIMENTO_INICIAL;
    if (sectorValue === "atendimento:final") return SETORES.ATENDIMENTO_FINAL;
    if (Object.values(SETORES).includes(sectorValue as any)) return sectorValue;
    if (sectorValue === "montagem") return "montagem";
    return mapStatusToSetorId(sectorValue);
  };

  const getAtendimentoFinalStatus = useCallback(() => {
    const cols = Object.keys(allStatusColumns && Object.keys(allStatusColumns).length ? allStatusColumns : statusColumns);
    if (!cols.length) return null;
    const exactFinal = cols.find((c) => c.toLowerCase().includes("atendimento-final"));
    if (exactFinal) return exactFinal;
    const atendimentoCols = cols.filter((c) => c.toLowerCase().includes("atendimento"));
    if (atendimentoCols.length) return atendimentoCols[atendimentoCols.length - 1];
    return cols[cols.length - 1];
  }, [allStatusColumns, statusColumns]);

  const getMoveOptionsList = useCallback(() => {
    const sectors = getAvailableSectors();
    const result: Array<{ value: string; label: string }> = [];
    sectors.forEach((sector) => {
      const status = getFirstStatusForSector(sector.value);
      if (status) {
        // value = status para já enviar o pedido ao primeiro passo do setor
        result.push({ value: status, label: sector.label });
      }
    });
    return result;
  }, [getAvailableSectors, getFirstStatusForSector]);

  const sectorTransferOptions = useMemo(
    () =>
      getAvailableSectors()
        .map((sector) => ({
          value: sector.value,
          label: sector.label,
          targetStatus: getFirstStatusForSector(sector.value),
        }))
        .filter((opt) => Boolean(opt.targetStatus)),
    [getAvailableSectors, getFirstStatusForSector]
  );

  

  const getOrderTotal = (order: Order) => {
    const val = order.precoTotal ?? order.preco ?? order.price ?? 0;
    return typeof val === "number" ? val : Number(val) || 0;
  };

  const formatCurrency = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const slugify = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "col";
  };

  const getColumnDomId = (columnName: string) => `kan-col-${slugify(columnName)}`;

  const handleScrollToColumn = (columnName: string) => {
    const id = getColumnDomId(columnName);
    const el = typeof window !== "undefined" ? document.getElementById(id) : null;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  };

  // Filtra colunas por departamento do usuário, se acionado
  const filteredStatusColumns = useMemo(() => {
    if (userInfo?.role === 'admin') return statusColumns;
    if (showDeptOnly && userInfo?.departamento) {
      return filterColumnsForDept(statusColumns, userInfo);
    }
    return statusColumns;
  }, [showDeptOnly, statusColumns, userInfo?.role, userInfo?.departamento]);

  // Reaplica filtro quando as colunas base ou o usuário mudam (cobre caso userInfo chegue depois do primeiro fetch)
  useEffect(() => {
    if (!Object.keys(baseStatusColumns).length) return;
    const nextVisible = filterColumnsForDept(baseStatusColumns, userInfo as UserInfo);
    setStatusColumns(nextVisible);
  }, [baseStatusColumns, userInfo]);

  const filteredOrders = useMemo(() => {
    let list = deferredOrders;
    if (deferredPriorityFilter === "high") {
      list = list.filter((o) => o.prioridade === 1);
    }

    // Presets de visão rápida com valores deferidos para evitar recalcular a cada tecla
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const now = Date.now();
    const in24h = now + 24 * 60 * 60 * 1000;

    if (deferredQuickView !== "all") {
      list = list.filter((o) => {
        const expectedRaw = o.expectedDate || o.dataPrevistaEntrega;
        if (!expectedRaw) return deferredQuickView === "high" ? o.prioridade === 1 : false;
        const expected = new Date(expectedRaw).getTime();
        if (Number.isNaN(expected)) return deferredQuickView === "high" ? o.prioridade === 1 : false;

        if (deferredQuickView === "today") {
          return expected >= startOfToday.getTime() && expected <= endOfToday.getTime();
        }
        if (deferredQuickView === "overdue") {
          return expected < startOfToday.getTime();
        }
        if (deferredQuickView === "due24") {
          return expected >= startOfToday.getTime() && expected <= in24h;
        }
        if (deferredQuickView === "high") {
          return o.prioridade === 1;
        }
        return true;
      });
    }

    const clientTerm = deferredClientFilter.trim().toLowerCase();
    if (clientTerm) {
      list = list.filter((o) =>
        (o.clientName || "").toLowerCase().includes(clientTerm) ||
        (o.clientCpf || "").replace(/\D/g, "").includes(clientTerm.replace(/\D/g, "")) ||
        (o.codigo || "").toLowerCase().includes(clientTerm) ||
        (o.id || "").toLowerCase().includes(clientTerm)
      );
    }
    return list;
  }, [deferredOrders, deferredPriorityFilter, deferredClientFilter, deferredQuickView]);

  // Defer listagem filtrada para evitar renderizações pesadas durante digitação
  const deferredFilteredOrders = useDeferredValue(filteredOrders);

  const dueSoonCount = useMemo(() => {
    const now = Date.now();
    const in24h = now + 24 * 60 * 60 * 1000;
    return orders.filter((o) => {
      const raw = o.expectedDate || o.dataPrevistaEntrega;
      if (!raw) return false;
      const ts = new Date(raw).getTime();
      if (Number.isNaN(ts)) return false;
      return ts >= now && ts <= in24h;
    }).length;
  }, [orders]);

  const overdueCount = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return orders.filter((o) => {
      const raw = o.expectedDate || o.dataPrevistaEntrega;
      if (!raw) return false;
      const ts = new Date(raw).getTime();
      if (Number.isNaN(ts)) return false;
      return ts < startOfToday.getTime();
    }).length;
  }, [orders]);

  useEffect(() => {
    if (moveDialogOpen && moveTargetSetorId) {
      let active = true;
      setFuncionariosLoading(true);
      setFuncionariosSetor([]);
      listFuncionariosService({ setorId: moveTargetSetorId, ativo: true })
        .then((list) => {
          if (!active) return;
          setFuncionariosSetor(list || []);
        })
        .catch(() => {
          if (!active) return;
          setFuncionariosSetor([]);
        })
        .finally(() => {
          if (!active) return;
          setFuncionariosLoading(false);
        });

      return () => {
        active = false;
      };
    } else if (!moveDialogOpen) {
      setFuncionariosSetor([]);
      setFuncionariosLoading(false);
    }
  }, [moveDialogOpen, moveTargetSetorId]);

  useEffect(() => {
    if (!moveDialogOpen) {
      setMoveDialogSubmitting(false);
    }
  }, [moveDialogOpen]);

  useEffect(() => {
    if (!compactView) {
      setExpandedCards(new Set());
    }
  }, [compactView]);

  const toggleCardExpansion = useCallback((orderId: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!justMovedOrderId) return;
    const t = setTimeout(() => setJustMovedOrderId(null), 900);
    return () => clearTimeout(t);
  }, [justMovedOrderId]);

  // Organiza os pedidos por status baseado nas colunas filtradas
  const ordersByStatus = useMemo(() => {
    const grouped: { [key: string]: Order[] } = {};

    Object.keys(filteredStatusColumns).forEach((columnName) => {
      grouped[columnName] = [];
    });

    for (const order of deferredFilteredOrders) {
      if (!grouped[order.status]) {
        grouped[order.status] = [];
      }
      grouped[order.status].push(order);
    }

    return grouped;
  }, [filteredStatusColumns, deferredFilteredOrders]);

  const getNextStatus = (currentStatus: string) => {
    const columnNames = Object.keys(filteredStatusColumns);
    const currentIndex = columnNames.indexOf(currentStatus);
    return currentIndex >= 0 && currentIndex < columnNames.length - 1
      ? columnNames[currentIndex + 1]
      : null;
  };

  const getDeptFromColumn = (col: string): string | null => {
    const s = col.toLowerCase();
    if (s.includes("atendimento")) return "atendimento";
    if (s.includes("sapat")) return "sapataria";
    if (s.includes("costur")) return "costura";
    if (s.includes("lavag")) return "lavagem";
    if (s.includes("pint")) return "pintura";
    if (s.includes("mont")) return "montagem";
    if (s.includes("acab")) return "acabamento";
    return null;
  };

  const getNextStatusSameDept = (currentStatus: string) => {
    const columnNames = Object.keys(filteredStatusColumns);
    const currentIndex = columnNames.indexOf(currentStatus);
    if (currentIndex === -1) return null;
    const currentDept = getDeptFromColumn(currentStatus);
    for (let i = currentIndex + 1; i < columnNames.length; i++) {
      if (getDeptFromColumn(columnNames[i]) === currentDept) {
        return columnNames[i];
      }
    }
    return null;
  };

  const getPreviousStatus = (currentStatus: string) => {
    const columnNames = Object.keys(filteredStatusColumns);
    const currentIndex = columnNames.indexOf(currentStatus);
    return currentIndex > 0 ? columnNames[currentIndex - 1] : null;
  };

  const openMoveDialogForOrder = (order: Order, targetStatus: string | null, explicitSetorId?: string | null) => {
    if (!targetStatus) {
      toast.error("Não há próximo status disponível");
      return;
    }
    setMoveDialogOpen(true);
    setMoveOrderId(order.id);
    setMoveNewStatus(targetStatus);
    const normalizedExplicit = normalizeSectorOptionToSetorId(explicitSetorId);
    setMoveTargetSetorId(normalizedExplicit || mapStatusToSetorId(targetStatus));
    setMovedByName(userInfo?.nome || "");
    setMovedByNote("");
  };

  if (loading && !initialLoadDone) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl font-semibold text-slate-700">Carregando controle de status...</p>
        </div>
      </div>
    );
  }

  // Verificar se não há dados (possível erro de API ou usuário sem permissões)
  const hasData = Object.keys(filteredStatusColumns).length > 0;
  const hasOrders = orders.length > 0;

  if (!hasData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Header Moderno */}
        <header className="bg-white shadow-lg border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-20">
              <div className="flex items-center space-x-6">
                <img
                  src="/worqera_icon.png"
                  alt="Worqera"
                  className="h-12 w-auto"
                />
                <div>
                  <h1 className="text-2xl font-bold text-slate-800 font-serif">Controle de Status</h1>
                  <p className="text-sm text-slate-600">Gestão de pedidos</p>
                </div>
              </div>
              <Link href="/dashboard">
                <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar ao Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert className="mb-6 border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Não foi possível carregar as colunas de status. Verifique sua conexão e permissões.
            </AlertDescription>
          </Alert>

          <Card className="border-0 shadow-lg">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Settings className="w-20 h-20 text-slate-300 mb-6" />
              <h3 className="text-xl font-semibold text-slate-600 mb-2">
                Nenhuma coluna de status disponível
              </h3>
              <p className="text-slate-500 text-center max-w-md mb-6">
                Isso pode acontecer se você não tiver permissões adequadas ou se houver um problema na conexão.
              </p>
              <Button
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Tentar Novamente
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Minimalista */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-3 sm:py-0 sm:h-16">
            <div className="flex items-start sm:items-center gap-3 sm:gap-4">
              <img src="/worqera_icon.png" alt="Worqera" className="w-8 h-8 shrink-0" />
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-semibold text-slate-800 leading-tight break-words">
                  Worqera • Controle de Status
                </h1>
                <p className="text-xs text-slate-500 leading-tight truncate sm:whitespace-nowrap">
                  {userInfo ? (
                    userInfo.role === 'admin'
                      ? 'Administrador'
                      : `${userInfo.role} • ${Object.keys(filteredStatusColumns).length} colunas`
                  ) : (
                    'Gestão de pedidos'
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3 flex-wrap">
              <div className="hidden sm:flex items-center space-x-4 text-sm">
                <div className="text-center">
                  <p className="text-slate-500">Total</p>
                  <p className="font-semibold text-slate-800">{orders.length}</p>
                </div>
                <div className="w-px h-8 bg-slate-200" />
                <div className="text-center">
                  <p className="text-slate-500">Ativos</p>
                  <p className="font-semibold text-blue-600">
                    {Object.values(ordersByStatus).reduce((sum, orders) => sum + orders.length, 0)}
                  </p>
                </div>
              </div>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-800 whitespace-nowrap">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Ações Rápidas - Minimalista */}
        <Card className="mb-6 border border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Buscar pedido
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    ref={inputRef}
                    type="text"
                    placeholder="Código do pedido ou CPF..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleQuickAdvance()}
                    className="pl-9 h-9 border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="sm:w-48">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Próximo passo
                </label>
                <Select value={selectedSector} onValueChange={setSelectedSector}>
                  <SelectTrigger className="h-9 border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="next">
                      <div className="flex items-center">
                        <ChevronRight className="w-4 h-4 mr-2" />
                        Próximo Status
                      </div>
                    </SelectItem>
                    <SelectItem value="prev">
                      <div className="flex items-center">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Status Anterior
                      </div>
                    </SelectItem>
                    <SelectItem value="divider1" disabled>
                      <hr className="my-1 border-slate-300" />
                    </SelectItem>
                    {getMoveOptionsList().map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="pl-2">
                        <div className="flex items-center gap-2">
                          <Move className="w-4 h-4" />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleQuickAdvance}
                disabled={!inputValue.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-6 sm:mt-0 mt-2"
              >
                <Move className="w-4 h-4 mr-2" />
                Próximo passo
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Filtrar por funcionário
                </label>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Nome do funcionário"
                    value={funcionarioFilter}
                    onChange={(e) => setFuncionarioFilter(e.target.value)}
                    className="pl-9 h-9 border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2 md:justify-end">
                <Button
                  variant="outline"
                  onClick={handleClearFuncionarioFilter}
                  className="h-9"
                  disabled={!activeFuncionarioFilter && !funcionarioFilter}
                >
                  Limpar
                </Button>
                <Button
                  onClick={handleApplyFuncionarioFilter}
                  className="bg-slate-800 hover:bg-slate-900 text-white h-9"
                  disabled={!funcionarioFilter.trim() && !activeFuncionarioFilter}
                >
                  Aplicar filtro
                </Button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Filtrar por cliente / CPF / código
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Ex.: Maria, 12345678900 ou #ID"
                    value={clientFilter}
                    onChange={(e) => setClientFilter(e.target.value)}
                    className="pl-9 h-9 border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2 md:justify-end">
                <Button
                  variant="outline"
                  className="h-9"
                  onClick={() => setClientFilter("")}
                  disabled={!clientFilter.trim()}
                >
                  Limpar
                </Button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
              <div className="flex items-center gap-2">
                <input
                  id="toggle-dept"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={showDeptOnly}
                  onChange={(e) => setShowDeptOnly(e.target.checked)}
                />
                <label htmlFor="toggle-dept" className="text-sm text-slate-700">
                  Mostrar somente colunas do meu setor
                </label>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-700">Prioridade</label>
                <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as "all" | "high")}> 
                  <SelectTrigger className="h-9 w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="high">Só alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="toggle-compact"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={compactView}
                  onChange={(e) => setCompactView(e.target.checked)}
                />
                <label htmlFor="toggle-compact" className="text-sm text-slate-700">
                  Modo compacto (cards colapsados)
                </label>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <span className="text-slate-600 font-medium mr-2">Vistas rápidas:</span>
              {[{ id: "all", label: "Tudo" }, { id: "today", label: "Hoje" }, { id: "overdue", label: "Atrasados" }, { id: "due24", label: "Próx. 24h" }, { id: "high", label: "Alta" }].map((view) => (
                <Button
                  key={view.id}
                  size="sm"
                  variant={quickView === view.id ? "default" : "outline"}
                  className="h-8"
                  onClick={() => setQuickView(view.id as typeof quickView)}
                >
                  {view.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {activeFuncionarioFilter && (
          <Alert className="mb-4 border-blue-200 bg-blue-50 text-blue-800">
            <AlertDescription>
              Filtrando por funcionário: <span className="font-semibold">{activeFuncionarioFilter}</span>
            </AlertDescription>
          </Alert>
        )}

        {/* Mensagens de Status */}
        {successMessage && (
          <Alert className={`mb-6 ${
            successMessage.includes("Erro") || successMessage.includes("não")
              ? "border-red-200 bg-red-50"
              : "border-green-200 bg-green-50"
          }`}>
            {successMessage.includes("Erro") || successMessage.includes("não") ? (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-600" />
            )}
            <AlertDescription className={
              successMessage.includes("Erro") || successMessage.includes("não")
                ? "text-red-800"
                : "text-green-800"
            }>
              {successMessage}
            </AlertDescription>
          </Alert>
        )}

        {(dueSoonCount > 0 || overdueCount > 0) && (
          <Alert className={`mb-6 ${overdueCount > 0 ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
            <AlertTriangle className={`h-5 w-5 ${overdueCount > 0 ? "text-red-600" : "text-amber-600"}`} />
            <AlertDescription className={`${overdueCount > 0 ? "text-red-800" : "text-amber-800"}`}>
              {overdueCount > 0 && <span className="mr-3 font-semibold">{overdueCount} atrasado(s).</span>}
              {dueSoonCount > 0 && <span>{dueSoonCount} vencem em 24h.</span>}
            </AlertDescription>
          </Alert>
        )}

        {/* Kanban Board Moderno */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center">
              <TrendingUp className="w-6 h-6 mr-3 text-slate-600" />
              Fluxo de Produção
            </h2>
            <div className="flex items-center space-x-4 text-sm text-slate-600">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                Arrastar pedidos entre colunas
              </div>
              <div className="flex items-center">
                <Eye className="w-4 h-4 mr-1" />
                {orders.length} pedidos ativos
              </div>
            </div>
          </div>

          <div className="mb-4 -mx-2 sm:mx-0">
            <div className="flex gap-2 overflow-x-auto px-2 py-2 snap-x snap-mandatory">
              {Object.keys(filteredStatusColumns).map((colName) => (
                <Button
                  key={colName}
                  size="sm"
                  variant="outline"
                  className="whitespace-nowrap snap-start"
                  onClick={() => handleScrollToColumn(colName)}
                >
                  {getStatusInfo(colName).label}
                </Button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto sm:overflow-visible pb-4 -mx-2 sm:mx-0 snap-x snap-mandatory">
            <div className="grid gap-3 sm:gap-5 pr-4 sm:pr-0 min-w-[240px]
              grid-flow-col auto-cols-[minmax(240px,1fr)]
              sm:grid-flow-row sm:auto-cols-auto sm:min-w-0
              sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Object.entries(filteredStatusColumns).map(([columnName, columnOrders]) => {
              const statusInfo = getStatusInfo(columnName);
              const StatusIcon = statusInfo.icon;
              const ordersInColumn = ordersByStatus[columnName] || [];
              const totalValue = ordersInColumn.reduce((sum, order) => sum + getOrderTotal(order), 0);
              const isCollapsed = collapsedColumns.has(columnName);
              const isDropTarget = dragOverColumn === columnName;

              return (
                <Card
                  id={getColumnDomId(columnName)}
                  key={columnName}
                  className={`border border-slate-200 bg-white w-full max-w-full min-w-0 sm:min-w-0 snap-start ${isDropTarget ? "ring-2 ring-sky-400" : ""}`}
                  onDragOver={handleDragOver}
                  onDragEnter={() => handleDragEnter(columnName)}
                  onDragLeave={() => handleDragLeave(columnName)}
                  onDrop={() => handleDrop(columnName)}
                >
                  <CardHeader className="rounded-t-lg border-b border-white/70 bg-white/80 backdrop-blur">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`h-9 w-9 rounded-lg flex items-center justify-center bg-gradient-to-br ${statusInfo.gradient} text-white shadow-sm`}>
                          <StatusIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold text-slate-800 leading-none">
                            {statusInfo.label}
                          </CardTitle>
                          <p className="text-[11px] text-slate-500">{ordersInColumn.length} pedido(s)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-slate-600 hover:text-slate-900"
                          onClick={() => {
                            setCollapsedColumns((prev) => {
                              const next = new Set(prev);
                              if (next.has(columnName)) next.delete(columnName);
                              else next.add(columnName);
                              return next;
                            });
                          }}
                        >
                          {isCollapsed ? "Expandir" : "Colapsar"}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-3 sm:p-4 bg-white">
                    {isCollapsed ? (
                      <div className="space-y-2 text-sm text-slate-700">
                        {ordersInColumn.length ? (
                          ordersInColumn.map((order) => {
                            const sla = getSlaInfo(order);
                            const overdue = sla.tone === 'red';
                            return (
                              <button
                                key={order.id}
                                className={`w-full flex items-center justify-between rounded px-3 py-2 text-left transition ${overdue ? 'border border-red-200 bg-rose-50' : 'border border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'}`}
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShowOrderDetails(true);
                                }}
                              >
                                <div className="flex flex-col min-w-0">
                                  <span className="font-semibold truncate flex items-center gap-1">
                                    #{order.codigo || order.id}
                                    {overdue && <span className="text-[10px] text-rose-600 font-semibold">Atrasado</span>}
                                  </span>
                                  <span className="text-xs text-slate-600 truncate">{order.clientName}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {typeof order.prioridade === 'number' && order.prioridade === 1 && (
                                    <Badge className="bg-red-500 text-white">Alta</Badge>
                                  )}
                                  {order.setorAtual && (
                                    <span
                                      className="inline-flex h-3 w-3 rounded-full"
                                      style={{ backgroundColor: SETORES_CORES[order.setorAtual] || '#ddd' }}
                                      title={SETORES_NOMES[order.setorAtual] || order.setorAtual}
                                    />
                                  )}
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <div className="text-center text-slate-400">Nenhum pedido</div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {ordersInColumn.map((order) => (
                          <KanbanCard
                            key={order.id}
                            order={order}
                            statusInfo={statusInfo}
                            isCardExpanded={expandedCards.has(order.id)}
                            compactView={compactView}
                            justMovedOrderId={justMovedOrderId}
                            draggedOrderId={draggedOrderId}
                            handleDragStart={handleDragStart}
                            handleDragEnd={() => setDraggedOrderId(null)}
                            openMoveDialogForOrder={openMoveDialogForOrder}
                            getPreviousStatus={getPreviousStatus}
                            getNextStatus={getNextStatus}
                            getNextStatusSameDept={getNextStatusSameDept}
                            getAtendimentoFinalStatus={getAtendimentoFinalStatus}
                            sectorTransferOptions={sectorTransferOptions}
                            setSelectedOrder={(o) => { setSelectedOrder(o); setShowOrderDetails(true); }}
                            setShowOrderDetails={setShowOrderDetails}
                          />
                        ))}

                        {ordersInColumn.length === 0 && (
                          <div className="text-center py-8 text-slate-400">
                            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Nenhum pedido</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                  <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 flex items-center justify-between text-xs text-slate-600 rounded-b-lg">
                    <span>{ordersInColumn.length} pedido(s)</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(totalValue)}</span>
                  </div>
                </Card>
              );
            })}
            </div>
          </div>
        </div>

        {/* Modal de Detalhes do Pedido */}
        {selectedOrder && (
          <CardDetalhesPedido
            pedido={selectedOrder}
            open={showOrderDetails}
            onClose={() => setShowOrderDetails(false)}
            onPedidoUpdated={handlePedidoUpdated}
          />
        )}

        {/* Dialog para confirmar movimento e registrar funcionário */}
        <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Registrar movimentação</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {moveOrderId && moveNewStatus && (() => {
                const order = orders.find(o => o.id === moveOrderId);
                const currentLabel = getStatusInfo(order?.status || "").label;
                const newLabel = getStatusInfo(moveNewStatus).label;
                return (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded flex items-center gap-2">
                    <p className="text-sm text-slate-700 font-semibold">Pedido #{order?.codigo || moveOrderId}</p>
                    <span className="text-xs text-slate-500">|</span>
                    <Badge variant="outline" className="text-xs bg-slate-100 border-slate-200 text-slate-700">{currentLabel || "Atual"}</Badge>
                    <span className="text-slate-500">→</span>
                    <Badge className="text-xs bg-blue-600 text-white">{newLabel}</Badge>
                  </div>
                );
              })()}
              <div>
                <p className="text-sm text-slate-600">
                  Informe quem está movendo o pedido.
                </p>
                {!moveNewStatus && (
                  <p className="text-xs text-amber-600 mt-1">Destino não definido, selecione um status pelo card ou ação rápida antes de abrir.</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Funcionário</label>
                {funcionariosLoading ? (
                  <div className="text-sm text-slate-500 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Carregando funcionários...
                  </div>
                ) : funcionariosSetor.length > 0 ? (
                  <Select
                    value={funcionariosSetor.find((f) => f.nome === movedByName)?.id || ""}
                    onValueChange={(val) => {
                      const sel = funcionariosSetor.find((f) => f.id === val);
                      setMovedByName(sel?.nome || "");
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Selecione o funcionário" />
                    </SelectTrigger>
                    <SelectContent>
                      {funcionariosSetor.map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={movedByName}
                    onChange={(e) => setMovedByName(e.target.value)}
                    placeholder="Nome do funcionário"
                  />
                )}
                {funcionariosSetor.length > 0 && (
                  <div className="text-xs text-slate-500">Lista carregada do setor {moveTargetSetorId || ""}</div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Observação / Comentário (para exceções)</label>
                <Textarea
                  value={movedByNote}
                  onChange={(e) => setMovedByNote(e.target.value)}
                  placeholder="Explique o motivo ou exceção desta movimentação"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setMoveDialogOpen(false);
                  setMoveOrderId(null);
                  setMoveNewStatus(null);
                  setMoveTargetSetorId(null);
                  setMoveDialogSubmitting(false);
                }}
                disabled={moveDialogSubmitting}
              >
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  if (!moveOrderId || !moveNewStatus) return;

                  const nome = movedByName.trim();
                  const note = movedByNote.trim();
                  if (!nome) {
                    toast.error("Informe o nome do funcionário.");
                    return;
                  }
                  const userDept = (userInfo?.departamento || "").toLowerCase().trim();
                  const targetDept = resolveDeptFromStatus(moveNewStatus, moveTargetSetorId);
                  const crossDept = userInfo?.role !== 'admin' && userDept && targetDept && targetDept !== userDept;
                  if (crossDept && !note) {
                    toast.error("Adicione uma observação ao mover para outro setor.");
                    return;
                  }

                  setMoveDialogSubmitting(true);
                  try {
                    await updateOrderStatus(moveOrderId, moveNewStatus, nome, note, moveTargetSetorId);
                    setMoveDialogOpen(false);
                    setMoveOrderId(null);
                    setMoveNewStatus(null);
                    setMoveTargetSetorId(null);
                    setDraggedOrderId(null);
                  } finally {
                    setMoveDialogSubmitting(false);
                  }
                }}
                disabled={!moveNewStatus || moveDialogSubmitting}
              >
                {moveDialogSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Movendo...
                  </span>
                ) : (
                  "Confirmar"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Footer */}
        <div className="text-center mt-8 text-slate-500">
          <p className="text-sm">Worqera • Sistema de Controle de Status • Arrastar pedidos entre colunas para alterar status</p>
        </div>
      </div>
    </div>
  );
}

// Card memoizado para reduzir re-render do board
const KanbanCard = memo(function KanbanCard(props: {
  order: Order;
  statusInfo: ReturnType<typeof getStatusInfo>;
  isCardExpanded: boolean;
  compactView: boolean;
  justMovedOrderId: string | null;
  draggedOrderId: string | null;
  handleDragStart: (ev: React.DragEvent<HTMLDivElement>, id: string) => void;
  handleDragEnd: () => void;
  openMoveDialogForOrder: (order: Order, targetStatus: string | null, explicitSetorId?: string | null) => void;
  getPreviousStatus: (status: string) => string | null;
  getNextStatus: (status: string) => string | null;
  getNextStatusSameDept: (status: string) => string | null;
  getAtendimentoFinalStatus: () => string | null;
  sectorTransferOptions: Array<{ value: string; label: string; targetStatus: string | null }>;
  setSelectedOrder: (o: Order) => void;
  setShowOrderDetails: (v: boolean) => void;
}) {
  const {
    order,
    statusInfo,
    isCardExpanded,
    compactView,
    justMovedOrderId,
    draggedOrderId,
    handleDragStart,
    handleDragEnd,
    openMoveDialogForOrder,
    getPreviousStatus,
    getNextStatus,
    getNextStatusSameDept,
    getAtendimentoFinalStatus,
    sectorTransferOptions,
    setSelectedOrder,
    setShowOrderDetails,
  } = props;

  const showFullDetails = !compactView || isCardExpanded;
  const servicesText = formatServicos(order.servicos || order.serviceType || "");
  const serviceBadgesRaw = servicesText
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const serviceBadges = serviceBadgesRaw.slice(0, 2);
  const extraServicesCount = Math.max(serviceBadgesRaw.length - 2, 0);
  const dept = resolveDeptFromSetor(order.setorAtual) || resolveDeptFromStatus(order.status, order.setorAtual);
  const DeptIcon = getDeptIcon(dept) || statusInfo.icon;
  const thumb = getFirstPhotoUrl(order.fotos);
  const sla = getSlaInfo(order);
  const isOverdue = sla.tone === "red";
  const accentColor = SETORES_CORES[order.setorAtual || ""] || "#93c5fd";
  const createdAtLabel = order.dataCriacao ? new Date(order.dataCriacao).toLocaleDateString('pt-BR') : "";
  const expectedLabel = (order.expectedDate || order.dataPrevistaEntrega)
    ? new Date(order.expectedDate || order.dataPrevistaEntrega).toLocaleDateString('pt-BR')
    : "";

  return (
    <div
      key={order.id}
      draggable
      onDragStart={(ev) => handleDragStart(ev, order.id)}
      onDragEnd={handleDragEnd}
      className={`kanban-card bg-white border border-slate-200/80 rounded-xl p-3 sm:p-4 cursor-move group card-animate-in text-sm shadow-sm ${justMovedOrderId === order.id ? "card-just-moved" : ""} ${draggedOrderId === order.id ? "dragging-card" : ""} ${isOverdue ? "bg-rose-50" : ""}`}
      style={{ borderLeftWidth: 5, borderLeftColor: isOverdue ? '#f43f5e' : accentColor }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-white overflow-hidden shrink-0"
          style={{ backgroundColor: accentColor }}
          title={SETORES_NOMES[order.setorAtual || ''] || order.setorAtual || ''}
        >
          {thumb ? (
            <img src={thumb} alt="thumb" className="w-full h-full object-cover" loading="lazy" decoding="async" />
          ) : (
            <DeptIcon className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h4 className="font-semibold text-slate-900 leading-tight text-[13px] font-mono truncate">
                  #{order.codigo || order.id}
                </h4>
                <button
                  className="text-slate-400 hover:text-slate-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(order.codigo || order.id);
                    toast.success("Número copiado");
                  }}
                  title="Copiar número"
                >
                  <ClipboardCopy className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] text-slate-500">{createdAtLabel}</p>
            </div>
            <div className="flex items-center gap-2">
              {typeof order.prioridade === 'number' && order.prioridade === 1 && (
                <Badge className="bg-red-500 text-white h-6 px-2">Alta</Badge>
              )}
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-slate-200 text-slate-700 bg-slate-50 truncate max-w-[140px]">
                {SETORES_NOMES[order.setorAtual || ''] || order.setorAtual || dept || ''}
              </Badge>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[13px] text-slate-900 font-semibold line-clamp-1">{order.clientName}</p>
            <p className="text-[12px] text-slate-600 line-clamp-1">{order.modeloTenis}</p>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <Badge className={`${isOverdue ? "bg-rose-500 text-white" : "bg-emerald-100 text-emerald-700"} text-[10px] px-2 py-0.5`}>
              {isOverdue ? "Atrasado" : "Previsto"}
            </Badge>
            {expectedLabel && (
              <span className={isOverdue ? "text-rose-600 font-semibold" : "text-slate-700"}>
                {expectedLabel}
              </span>
            )}
          </div>

          {Array.isArray(order.departamentosSelecionados) && order.departamentosSelecionados.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {order.departamentosSelecionados.slice(0, 2).map((dep) => (
                <Badge key={dep.id} variant="outline" className="text-[10px] bg-slate-50 border-slate-200 text-slate-700 px-2 py-0.5">
                  {dep.nome || dep.id}
                </Badge>
              ))}
              {order.departamentosSelecionados.length > 2 && (
                <Badge variant="outline" className="text-[10px] bg-slate-50 border-dashed border-slate-200 text-slate-500 px-2 py-0.5">
                  +{order.departamentosSelecionados.length - 2}
                </Badge>
              )}
            </div>
          )}

          {serviceBadges.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {serviceBadges.map((svc) => (
                <Badge key={svc} variant="secondary" className="text-[11px] bg-slate-100 text-slate-700 border-slate-200 px-2 py-0.5">
                  {svc}
                </Badge>
              ))}
              {extraServicesCount > 0 && (
                <Badge variant="outline" className="text-[10px] bg-white border-dashed border-slate-200 text-slate-500 px-2 py-0.5">
                  +{extraServicesCount}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {showFullDetails ? (
        <div className="mt-3 flex flex-wrap gap-2 min-w-0">
          <Button
            size="sm"
            className="h-10 flex-1 min-w-[140px]"
            onClick={(e) => {
              e.stopPropagation();
              openMoveDialogForOrder(order, getNextStatusSameDept(order.status) || getNextStatus(order.status));
            }}
            disabled={!getNextStatus(order.status) && !getNextStatusSameDept(order.status)}
          >
            Avançar
          </Button>
          {sectorTransferOptions.length > 0 ? (
            <Select
              onValueChange={(sectorValue) => {
                const target = sectorTransferOptions.find((opt) => opt.value === sectorValue);
                if (target?.targetStatus) {
                  openMoveDialogForOrder(order, target.targetStatus, sectorValue);
                }
              }}
            >
              <SelectTrigger className="h-10 flex-1 min-w-[140px] text-left">Mover setor</SelectTrigger>
              <SelectContent>
                {sectorTransferOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Button size="sm" variant="outline" className="h-10 flex-1 min-w-[140px]" disabled>
              Setores indisponíveis
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-10 flex-1 min-w-[140px]"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedOrder(order);
              setShowOrderDetails(true);
            }}
          >
            Ver mais
          </Button>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2 min-w-0">
          <Button
            size="sm"
            className="h-10 flex-1 min-w-[140px]"
            onClick={(e) => {
              e.stopPropagation();
              openMoveDialogForOrder(order, getNextStatusSameDept(order.status) || getNextStatus(order.status));
            }}
            disabled={!getNextStatus(order.status) && !getNextStatusSameDept(order.status)}
          >
            Avançar
          </Button>
          {sectorTransferOptions.length > 0 ? (
            <Select
              onValueChange={(sectorValue) => {
                const target = sectorTransferOptions.find((opt) => opt.value === sectorValue);
                if (target?.targetStatus) {
                  openMoveDialogForOrder(order, target.targetStatus, sectorValue);
                }
              }}
            >
              <SelectTrigger className="h-10 flex-1 min-w-[140px] text-left">Mover setor</SelectTrigger>
              <SelectContent>
                {sectorTransferOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Button size="sm" variant="outline" className="h-10 flex-1 min-w-[140px]" disabled>
              Setores indisponíveis
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-10 flex-1 min-w-[140px]"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedOrder(order);
              setShowOrderDetails(true);
            }}
          >
            Ver mais
          </Button>
        </div>
      )}

    </div>
  );
});
KanbanCard.displayName = "KanbanCard";