"use client";

import React, { useEffect, useState } from "react";
import { Loader } from "lucide-react";
import { getSetoresEstatisticasService } from "@/lib/apiService";

type EstatisticaSetor = {
  nome: string;
  cor: string;
  quantidade: number;
  pedidos: Array<{
    id: string;
    codigo?: string;
    cliente?: string;
    tempoNoSetor?: number;
  }>;
};

export default function DashboardSetores() {
  const [estatisticas, setEstatisticas] = useState<Record<string, EstatisticaSetor> | null>(null);
  const [loading, setLoading] = useState(true);

  const buscar = async () => {
    try {
      const data = await getSetoresEstatisticasService();
      setEstatisticas(data);
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    buscar();
    const interval = setInterval(buscar, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard de Setores</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {estatisticas &&
          Object.entries(estatisticas).map(([setorId, dados]) => (
            <SetorCard key={setorId} {...dados} />
          ))}
      </div>
    </div>
  );
}

function SetorCard({ nome, cor, quantidade, pedidos }: EstatisticaSetor) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-700">{nome}</h3>
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cor }} />
      </div>

      <div className="text-3xl font-bold mb-2" style={{ color: cor }}>
        {quantidade}
      </div>

      <div className="text-sm text-gray-500">{quantidade === 1 ? "pedido" : "pedidos"}</div>

      {expanded && quantidade > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="space-y-2">
            {pedidos.map((pedido) => (
              <div key={pedido.id} className="text-xs p-2 bg-gray-50 rounded">
                <div className="font-medium">#{pedido.codigo}</div>
                <div className="text-gray-600">{pedido.cliente}</div>
                {typeof pedido.tempoNoSetor === "number" && (
                  <div className="text-gray-400">{pedido.tempoNoSetor}h no setor</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
