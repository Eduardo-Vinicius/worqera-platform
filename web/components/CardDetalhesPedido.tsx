'use client'

import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { getClienteByIdService } from "@/lib/apiService";
import SetorProgress from "@/components/SetorProgress";
import MoverSetorButton from "@/components/MoverSetorButton";
import { usePedidoAssets } from "@/hooks/usePedidoAssets";

export interface PedidoDetalhes {
  id: string;
  codigo?: string;
  funcionarioAtual?: string;
  clientId: string;
  clientName: string;
  clientCpf: string;
  clientPhone?: string; // Adicionado telefone do cliente (opcional)
  sneaker: string;
  servicos: string;
  price: number;
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
  modeloTenis?: string;
  tipoServico?: string;
  descricaoServicos?: string;
  preco?: number;
  precoTotal?: number;
  valorSinal?: number;
  valorRestante?: number;
  dataPrevistaEntrega?: string;
  dataCriacao?: string;
  fotos?: string[];
  observacoes?: string;
  garantia?: {
    ativa: boolean;
    preco: number;
    duracao: string;
    data?: string;
  };
  acessorios?: string[];
  // Sistema de setores
  setoresFluxo?: string[];
  setorAtual?: string;
  setoresHistorico?: Array<{
    setorId: string;
    setorNome?: string;
    entradaEm: string;
    saidaEm?: string | null;
  }>;
  // Informações de criação
  createdBy?: {
    userId: string;
    userName: string;
    userEmail: string;
    userRole: string;
  };
  [key: string]: any; // Para permitir campos extras
}

interface Cliente {
  id: string;
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
}

export interface CardDetalhesPedidoProps {
  open: boolean;
  pedido: PedidoDetalhes | null;
  onClose: () => void;
  onPedidoUpdated?: (pedido: PedidoDetalhes) => void;
}

export const CardDetalhesPedido: React.FC<CardDetalhesPedidoProps> = ({ open, onClose, pedido, onPedidoUpdated }) => {
  const router = useRouter();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loadingCliente, setLoadingCliente] = useState(false);
  const [errorCliente, setErrorCliente] = useState("");
  const [renewedPhotos, setRenewedPhotos] = useState<Record<number, boolean>>({});
  const hasRefreshedOnOpenRef = useRef(false);
  const lastRefreshIdRef = useRef<string | null>(null);
  const lastClientFetchRef = useRef<string | null>(null);
  const {
    pedido: pedidoAtualizado,
    setPedido,
    error: assetsError,
    refreshState,
    pdfState,
    zipState,
    refreshPedido,
    generateAndDownloadPdf,
    downloadFotosZip,
  } = usePedidoAssets(pedido?.id, pedido);

  const pedidoAtual = (pedidoAtualizado || pedido) as PedidoDetalhes | null;

  // Busca os dados do cliente quando o modal é aberto
  useEffect(() => {
    const fetchCliente = async () => {
      if (!open || !pedidoAtual?.clientId) return;

      // Evita refetch desnecessário para o mesmo cliente enquanto o modal segue aberto
      if (lastClientFetchRef.current === pedidoAtual.clientId && cliente) return;

      try {
        setLoadingCliente(true);
        setErrorCliente("");
        const clienteData = await getClienteByIdService(pedidoAtual.clientId);
        setCliente(clienteData);
        lastClientFetchRef.current = pedidoAtual.clientId;
      } catch (err: any) {
        setErrorCliente(err.message || "Erro ao carregar dados do cliente");
        setCliente(null);
      } finally {
        setLoadingCliente(false);
      }
    };

    fetchCliente();
  }, [open, pedidoAtual?.clientId]);

  useEffect(() => {
    if (pedido) {
      setPedido(pedido);
    }
  }, [pedido, setPedido]);

  useEffect(() => {
    if (!open || !pedidoAtual?.id) return;
    if (hasRefreshedOnOpenRef.current && lastRefreshIdRef.current === pedidoAtual.id) return;

    hasRefreshedOnOpenRef.current = true;
    lastRefreshIdRef.current = pedidoAtual.id;

    refreshPedido()
      .then((refreshed) => {
        if (refreshed && onPedidoUpdated) {
          onPedidoUpdated(refreshed as PedidoDetalhes);
        }
      })
      .catch(() => null);
  }, [open, pedidoAtual?.id, refreshPedido, onPedidoUpdated]);

  // Reset do estado quando o modal fecha
  useEffect(() => {
    if (!open) {
      setCliente(null);
      setErrorCliente("");
      setLoadingCliente(false);
      setRenewedPhotos({});
      hasRefreshedOnOpenRef.current = false;
      lastRefreshIdRef.current = null;
      lastClientFetchRef.current = null;
    }
  }, [open]);

  if (!pedidoAtual) return null;

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

  const extractHttpPhotoUrl = (value: unknown): string | null => {
    if (!value) return null;

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (/blob(%3A|:)/i.test(trimmed)) return null;
      if (/^https?:\/\//i.test(trimmed)) return trimmed;
      if (trimmed.startsWith("blob:")) return null;

      try {
        return extractHttpPhotoUrl(JSON.parse(trimmed));
      } catch {
        return null;
      }
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const parsed = extractHttpPhotoUrl(item);
        if (parsed) return parsed;
      }
      return null;
    }

    if (typeof value === "object") {
      const obj = value as Record<string, unknown>;
      const candidates = [obj.url, obj.fotoUrl, obj.uploadedUrl, obj.s3Url, obj.location, obj.src];
      for (const candidate of candidates) {
        const parsed = extractHttpPhotoUrl(candidate);
        if (parsed) return parsed;
      }
      return null;
    }

    return null;
  };

  const fotosValidas = (pedidoAtual.fotos || [])
    .map((foto) => extractHttpPhotoUrl(foto))
    .filter((foto): foto is string => Boolean(foto));

  const servicoLabel = formatServicos(pedidoAtual.servicos || pedidoAtual.tipoServico);
  const firstFoto = fotosValidas[0] || null;

  const getInitials = (name?: string) => {
    if (!name) return "";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleRefreshLinks = async () => {
    if (!pedidoAtual.id) return;
    const refreshed = await refreshPedido();
    if (refreshed && onPedidoUpdated) {
      onPedidoUpdated(refreshed as PedidoDetalhes);
    }
  };

  const handleGeneratePdf = async () => {
    try {
      await generateAndDownloadPdf(`pedido-${pedidoAtual.id}.pdf`);
    } catch {
      // estado de erro tratado pelo hook
    }
  };

  const handleDownloadZip = async () => {
    try {
      await downloadFotosZip(`pedido-${pedidoAtual.id}-fotos.zip`);
    } catch {
      // estado de erro tratado pelo hook
    }
  };

  const handleOpenPhoto = async (foto: string, index: number) => {
    try {
      const probe = await fetch(foto, { method: "GET", cache: "no-store" });
      if (!probe.ok) throw new Error("URL expirada");
      window.open(foto, "_blank", "noopener,noreferrer");
    } catch {
      const refreshed = await refreshPedido();
      const refFotos = Array.isArray(refreshed?.fotos) ? refreshed.fotos : [];
      const novaUrl = extractHttpPhotoUrl(refFotos[index]);
      if (novaUrl) {
        setRenewedPhotos((prev) => ({ ...prev, [index]: true }));
        window.open(novaUrl, "_blank", "noopener,noreferrer");
        if (onPedidoUpdated) onPedidoUpdated(refreshed as PedidoDetalhes);
      }
    }
  };

  const handleFotoError = async (event: React.SyntheticEvent<HTMLImageElement>, index: number) => {
    const img = event.currentTarget;
    if (img.dataset.refreshed === "1") return;

    img.dataset.refreshed = "1";

    try {
      const refreshed = await refreshPedido();
      const refFotos = Array.isArray(refreshed?.fotos) ? refreshed.fotos : [];
      const novaUrl = extractHttpPhotoUrl(refFotos[index]);
      if (novaUrl) {
        setRenewedPhotos((prev) => ({ ...prev, [index]: true }));
        img.src = novaUrl;
      }
      if (refreshed && onPedidoUpdated) {
        onPedidoUpdated(refreshed as PedidoDetalhes);
      }
    } catch {
      // estado de erro já é tratado pelo hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-slate-600 text-sm font-semibold">
              {firstFoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={firstFoto} alt="Foto do pedido" className="w-full h-full object-cover" />
              ) : (
                getInitials(pedidoAtual.clientName || pedidoAtual.modeloTenis || "") || "?"
              )}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="flex items-center gap-2">
                Detalhes do Pedido #{pedidoAtual.codigo || pedidoAtual.id}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={() => navigator.clipboard.writeText(pedidoAtual.codigo || pedidoAtual.id)}
                >
                  Copiar
                </Button>
              </DialogTitle>
              <DialogDescription>
                {loadingCliente ? (
                  "Carregando dados do cliente..."
                ) : errorCliente ? (
                  <span className="text-red-500">Erro: {errorCliente}</span>
                ) : cliente ? (
                  <>
                    Cliente: <span className="font-semibold">{cliente.nomeCompleto}</span> ({cliente.cpf}
                    {cliente.telefone ? ` • ${cliente.telefone}` : ""})
                  </>
                ) : (
                  <>
                    Cliente: <span className="font-semibold">{pedidoAtual.clientName}</span> ({pedidoAtual.clientCpf}
                    {pedidoAtual.clientPhone ? ` • ${pedidoAtual.clientPhone}` : ""})
                  </>
                )}
              </DialogDescription>
            </div>
          </div>
          {loadingCliente && (
            <div className="mt-2 space-y-2">
              <div className="h-3 w-40 rounded bg-slate-200 animate-pulse" />
              <div className="h-3 w-24 rounded bg-slate-200 animate-pulse" />
            </div>
          )}
          {/* Progresso dos Setores */}
          {pedidoAtual.setoresFluxo && pedidoAtual.setorAtual && pedidoAtual.setoresHistorico && (
            <div className="mt-3">
              <SetorProgress
                pedido={{
                  setoresFluxo: pedidoAtual.setoresFluxo,
                  setorAtual: pedidoAtual.setorAtual,
                  setoresHistorico: pedidoAtual.setoresHistorico,
                }}
              />
            </div>
          )}
          {pedidoAtual.funcionarioAtual && (
            <div className="mt-3">
              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                Responsável atual: {pedidoAtual.funcionarioAtual}
              </Badge>
            </div>
          )}
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-2">{/*Conteúdo com scroll*/}
          <div><strong>Tênis:</strong> {pedidoAtual.modeloTenis || pedidoAtual.sneaker}</div>
          <div className="space-y-1">
            <div><strong>Serviço:</strong> {servicoLabel || "-"}</div>
            {servicoLabel && (
              <div className="flex flex-wrap gap-2">
                {servicoLabel.split(",").map((srv, idx) => (
                  <Badge key={`srv-${idx}`} variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-xs">
                    {srv.trim()}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          {pedidoAtual.descricaoServicos && (
            <div><strong>Descrição:</strong> {pedidoAtual.descricaoServicos}</div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div><strong>Valor Total:</strong> R$ {(pedidoAtual.precoTotal || pedidoAtual.price || 0).toFixed(2)}</div>
            {(pedidoAtual.valorSinal && pedidoAtual.valorSinal > 0) && (
              <div className="text-green-600"><strong>Sinal Pago:</strong> R$ {pedidoAtual.valorSinal.toFixed(2)}</div>
            )}
          </div>
          {(pedidoAtual.valorRestante && pedidoAtual.valorRestante > 0) && (
            <div className="text-orange-600"><strong>Valor Restante:</strong> R$ {pedidoAtual.valorRestante.toFixed(2)}</div>
          )}
          {pedidoAtual.funcionarioAtual && (
            <div><strong>Funcionário Atual:</strong> {pedidoAtual.funcionarioAtual}</div>
          )}
          <div><strong>Status:</strong> {pedidoAtual.status}</div>
          <div><strong>Data de Criação:</strong> {pedidoAtual.dataCriacao || pedidoAtual.createdDate}</div>
          <div><strong>Previsão de Entrega:</strong> {pedidoAtual.dataPrevistaEntrega || pedidoAtual.expectedDate}</div>

          {Array.isArray(pedidoAtual.departamentosSelecionados) && pedidoAtual.departamentosSelecionados.length > 0 && (
            <div className="mt-3">
              <div className="text-sm font-medium text-gray-700 mb-1">Departamentos marcados</div>
              <div className="flex flex-wrap gap-2">
                {pedidoAtual.departamentosSelecionados.map((dep, idx) => (
                  <Badge key={`${dep.id}-${idx}`} variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                    {dep.nome || dep.id}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {Array.isArray(pedidoAtual.observacoesFluxo) && pedidoAtual.observacoesFluxo.length > 0 && (
            <div className="mt-3">
              <div className="text-sm font-medium text-gray-700 mb-1">Observações do fluxo</div>
              <div className="space-y-2 text-sm text-gray-700">
                {pedidoAtual.observacoesFluxo.map((obs, idx) => (
                  <div key={idx} className="border rounded p-2 bg-slate-50 border-slate-200">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{obs.setorNome || obs.setorId || ""}</span>
                      <span>{obs.timestamp ? new Date(obs.timestamp).toLocaleString("pt-BR") : ""}</span>
                    </div>
                    <div className="text-sm text-slate-800 mt-1">{obs.observacao || "-"}</div>
                    {obs.usuarioNome || obs.usuario ? (
                      <div className="text-xs text-slate-600 mt-1">{obs.usuarioNome || obs.usuario}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Informações de criação */}
          {pedidoAtual.createdBy && (
            <div className="border-t pt-3 mt-4 bg-gray-50 p-3 rounded">
              <div className="text-sm font-medium text-gray-700 mb-2">Informações de Criação</div>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-gray-500">Criado por:</span>{" "}
                  <span className="font-medium">{pedidoAtual.createdBy.userName}</span>
                </div>
                <div>
                  <span className="text-gray-500">Email:</span>{" "}
                  <span>{pedidoAtual.createdBy.userEmail}</span>
                </div>
                <div>
                  <span className="text-gray-500">Cargo:</span>{" "}
                  <span className="capitalize">{pedidoAtual.createdBy.userRole}</span>
                </div>
                <div>
                  <span className="text-gray-500">Data:</span>{" "}
                  <span>{new Date(pedidoAtual.dataCriacao || pedidoAtual.createdDate).toLocaleString('pt-BR')}</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Garantia */}
          {pedidoAtual.garantia?.ativa && (
            <div className="border-t pt-3 mt-4 bg-blue-50 p-3 rounded">
              <div className="font-semibold mb-2 text-blue-800">Garantia Contratada:</div>
              <div className="text-sm space-y-1">
                <div><strong>Duração:</strong> {pedidoAtual.garantia.duracao}</div>
                <div><strong>Valor:</strong> R$ {pedidoAtual.garantia.preco.toFixed(2)}</div>
                {pedidoAtual.garantia.data && (
                  <div><strong>Válida até:</strong> {pedidoAtual.garantia.data}</div>
                )}
              </div>
            </div>
          )}
          
          {/* Acessórios */}
          {pedidoAtual.acessorios && pedidoAtual.acessorios.length > 0 && (
            <div className="border-t pt-3 mt-4">
              <div className="font-semibold mb-2">Acessórios Inclusos:</div>
              <div className="flex flex-wrap gap-1">
                {pedidoAtual.acessorios.map((acessorio, index) => (
                  <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm">
                    {acessorio}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Fotos */}
          {fotosValidas.length > 0 && (
            <div className="border-t pt-3 mt-4">
              <div className="font-semibold mb-2">Fotos do Tênis:</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {fotosValidas.map((foto, index) => (
                  <div key={index} className="relative">
                    <img
                      src={foto}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-24 object-cover rounded border cursor-pointer hover:opacity-75"
                      onError={(event) => handleFotoError(event, index)}
                      onClick={() => handleOpenPhoto(foto, index)}
                    />
                    {renewedPhotos[index] && (
                      <span className="absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">
                        link renovado
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Observações do pedido */}
          {pedidoAtual.observacoes && (
            <div className="border-t pt-3 mt-4">
              <div><strong>Observações do Pedido:</strong></div>
              <div className="whitespace-pre-wrap text-sm mt-1 p-2 bg-gray-50 rounded border">
                {pedidoAtual.observacoes}
              </div>
            </div>
          )}
          
          {/* Dados completos do cliente */}
          {cliente && (
            <div className="border-t pt-3 mt-4">
              <div className="font-semibold mb-2">Dados do Cliente:</div>
              <div><strong>Nome:</strong> {cliente.nomeCompleto}</div>
              <div><strong>CPF:</strong> {cliente.cpf}</div>
              <div><strong>Telefone:</strong> {cliente.telefone}</div>
              <div><strong>Email:</strong> {cliente.email}</div>
              <div>
                <strong>Endereço:</strong> {cliente.logradouro}, {cliente.numero}
                {cliente.complemento && `, ${cliente.complemento}`}
                <br />
                {cliente.bairro}, {cliente.cidade} - {cliente.estado}
                <br />
                CEP: {cliente.cep}
              </div>
              {cliente.observacoes && (
                <div><strong>Observações do Cliente:</strong> {cliente.observacoes}</div>
              )}
            </div>
          )}

          <div className="border-t pt-3 mt-4">
            <div className="font-semibold mb-2">Assets</div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshLinks}
                disabled={refreshState === "loading"}
              >
                {refreshState === "loading" ? "Atualizando..." : "Atualizar links"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGeneratePdf}
                disabled={pdfState === "loading"}
              >
                {pdfState === "loading" ? "Gerando PDF..." : "Gerar/Baixar PDF"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadZip}
                disabled={zipState === "loading"}
              >
                {zipState === "loading" ? "Baixando ZIP..." : "Baixar fotos (.zip)"}
              </Button>
            </div>

            {(assetsError || refreshState === "success" || pdfState === "success" || zipState === "success") && (
              <div className={`text-sm mt-2 ${assetsError ? "text-red-600" : "text-green-600"}`}>
                {assetsError || "Ação concluída com sucesso."}
              </div>
            )}
          </div>
          
          <div>
            <strong>Histórico:</strong>
            <ul className="list-disc ml-5">
              {pedidoAtual.statusHistory.map((h, i) => (
                <li key={i}>{h.status} - {h.date} às {h.time}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex gap-2 mt-4 flex-shrink-0 border-t pt-4">{/*Botões fixos na parte inferior*/}
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => router.push(`/clientes/${pedidoAtual.clientId}`)}
            disabled={loadingCliente}
          >
            {loadingCliente ? "Carregando..." : "Ver Cliente"}
          </Button>
          {/* Botão para mover entre setores */}
          {pedidoAtual.id && (
            <MoverSetorButton
              pedidoId={pedidoAtual.id}
              onSuccess={(pedidoAtualizado) => {
                setPedido(pedidoAtualizado as PedidoDetalhes);
                onPedidoUpdated?.(pedidoAtualizado as PedidoDetalhes);
              }}
            />
          )}
          <DialogClose asChild>
            <Button variant="outline" className="flex-1">Fechar</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
};
