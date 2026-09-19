"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  downloadBlobAsFile,
  downloadPedidoFotosZipService,
  generateOrderPDFService,
  getPedidoService,
  listPedidoPdfsService,
  uploadPedidoFotosService,
} from "@/lib/apiService";

type AsyncState = "idle" | "loading" | "success" | "error";

export function usePedidoAssets(pedidoId?: string, initialPedido?: any) {
  const [pedido, setPedido] = useState<any | null>(initialPedido || null);
  const [pdfState, setPdfState] = useState<AsyncState>("idle");
  const [zipState, setZipState] = useState<AsyncState>("idle");
  const [uploadState, setUploadState] = useState<AsyncState>("idle");
  const [refreshState, setRefreshState] = useState<AsyncState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pdfs, setPdfs] = useState<Awaited<ReturnType<typeof listPedidoPdfsService>>>([]);
  const [pdfsLoading, setPdfsLoading] = useState(false);
  const refreshPromiseRef = useRef<Promise<any> | null>(null);

  const resetError = useCallback(() => setError(null), []);

  const refreshPedido = useCallback(async () => {
    if (!pedidoId) return null;

    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    setRefreshState("loading");
    setError(null);

    const promise = (async () => {
      try {
        const freshPedido = await getPedidoService(pedidoId);
        setPedido(freshPedido);
        setRefreshState("success");
        return freshPedido;
      } catch (err: any) {
        setRefreshState("error");
        setError(err?.message || "Erro ao atualizar links do pedido");
        throw err;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    refreshPromiseRef.current = promise;
    return promise;
  }, [pedidoId]);

  const listPdfs = useCallback(async () => {
    if (!pedidoId) return [];
    setPdfsLoading(true);
    try {
      const list = await listPedidoPdfsService(pedidoId);
      setPdfs(Array.isArray(list) ? list : []);
      return list;
    } catch (err: any) {
      setError(err?.message || "Erro ao listar laudos");
      setPdfs([]);
      return [];
    } finally {
      setPdfsLoading(false);
    }
  }, [pedidoId]);

  const generateAndDownloadPdf = useCallback(
    async (fileName?: string) => {
      if (!pedidoId) return;

      setPdfState("loading");
      setError(null);

      try {
        const blob = await generateOrderPDFService(pedidoId);
        downloadBlobAsFile(blob, fileName || `laudo-${pedidoId}.pdf`);
        setPdfState("success");
        await listPdfs().catch(() => null);
      } catch (err: any) {
        setPdfState("error");
        setError(err?.message || "Erro ao gerar PDF do pedido");
        throw err;
      }
    },
    [pedidoId, listPdfs]
  );

  const downloadFotosZip = useCallback(
    async (fileName?: string) => {
      if (!pedidoId) return;

      setZipState("loading");
      setError(null);

      try {
        const blob = await downloadPedidoFotosZipService(pedidoId);
        downloadBlobAsFile(blob, fileName || `pedido-${pedidoId}-fotos.zip`);
        setZipState("success");
      } catch (err: any) {
        setZipState("error");
        setError(err?.message || "Erro ao baixar ZIP das fotos");
        throw err;
      }
    },
    [pedidoId]
  );

  const uploadFotos = useCallback(
    async (files: File[]) => {
      if (!pedidoId || files.length === 0) return [];

      setUploadState("loading");
      setError(null);

      try {
        const urls = await uploadPedidoFotosService(pedidoId, files);
        await refreshPedido().catch(() => null);
        setUploadState("success");
        return urls;
      } catch (err: any) {
        setUploadState("error");
        setError(err?.message || "Erro ao fazer upload de fotos");
        throw err;
      }
    },
    [pedidoId, refreshPedido]
  );

  const recoverPhotoUrl = useCallback(
    async (failedUrl: string) => {
      if (!failedUrl) return null;

      const freshPedido = await refreshPedido();
      const freshFotos = Array.isArray(freshPedido?.fotos) ? freshPedido.fotos : [];
      return (
        freshFotos.find((url: string) => typeof url === "string" && url !== failedUrl) || null
      );
    },
    [refreshPedido]
  );

  const states = useMemo(
    () => ({
      pdfState,
      zipState,
      uploadState,
      refreshState,
    }),
    [pdfState, refreshState, uploadState, zipState]
  );

  return {
    pedido,
    setPedido,
    error,
    resetError,
    pdfs,
    pdfsLoading,
    ...states,
    refreshPedido,
    generateAndDownloadPdf,
    downloadFotosZip,
    uploadFotos,
    recoverPhotoUrl,
    listPdfs,
  };
}
