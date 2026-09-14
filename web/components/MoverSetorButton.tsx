'use client'

import React, { useEffect, useState } from "react";
import { ArrowRight, Loader } from "lucide-react";
import { toast } from "sonner";
import { getProximoSetorService, moverPedidoSetorService } from "@/lib/apiService";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  pedidoId: string;
  onSuccess?: (pedidoAtualizado: any) => void;
}

export const MoverSetorButton: React.FC<Props> = ({ pedidoId, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [proximoSetor, setProximoSetor] = useState<{ id: string; nome: string } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [funcionarioNome, setFuncionarioNome] = useState("");
  const [observacao, setObservacao] = useState("");

  useEffect(() => {
    const buscar = async () => {
      try {
        const data = await getProximoSetorService(pedidoId);
        setProximoSetor(data?.data || data || null);
      } catch (error) {
        console.error("Erro ao buscar próximo setor:", error);
      }
    };
    buscar();
  }, [pedidoId]);

  const moverParaProximoSetor = async () => {
    if (!proximoSetor) {
      toast.info("Pedido já está no último setor");
      return;
    }

    setLoading(true);
    try {
      const updated = await moverPedidoSetorService(pedidoId, proximoSetor.id, funcionarioNome, observacao);
      toast.success(`Pedido movido para ${proximoSetor.nome}`);

      if (proximoSetor.id === "atendimento-final") {
        toast.success("Pedido finalizado! Email enviado ao cliente.");
      }

      onSuccess?.(updated?.data || updated);
      setDialogOpen(false);
      setObservacao("");
      // Atualiza próximo setor após mover
      try {
        const data = await getProximoSetorService(pedidoId);
        setProximoSetor(data?.data || data || null);
      } catch {}
    } catch (error: any) {
      toast.error(error?.message || "Erro ao mover pedido");
    } finally {
      setLoading(false);
    }
  };

  if (!proximoSetor) {
    return <div className="text-sm text-green-600 font-medium">✓ Pedido finalizado</div>;
  }

  return (
    <>
      <button
        onClick={() => setDialogOpen(true)}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader className="w-4 h-4 animate-spin" />
            Movendo...
          </>
        ) : (
          <>
            Avançar para {proximoSetor.nome}
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mover para setor</DialogTitle>
            <DialogDescription>
              Informe o funcionário atual e, se necessário, uma observação para a movimentação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Funcionário (opcional)</label>
              <Input
                value={funcionarioNome}
                onChange={(e) => setFuncionarioNome(e.target.value)}
                placeholder="Ex.: João Silva"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Observação (opcional)</label>
              <Input
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex.: Pedido urgente"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={moverParaProximoSetor} disabled={loading}>
              {loading ? "Movendo..." : `Confirmar para ${proximoSetor.nome}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MoverSetorButton;
