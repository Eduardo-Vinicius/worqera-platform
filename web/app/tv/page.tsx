"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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

export default function TVDashboard() {
  const [estatisticas, setEstatisticas] = useState<Record<string, EstatisticaSetor> | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>(new Date().toLocaleTimeString("pt-BR"));
  const [flashSetor, setFlashSetor] = useState<string | null>(null);
  const prevTotalsRef = useRef<Record<string, number>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const buscar = async () => {
    try {
      const raw = await getSetoresEstatisticasService();
      const data = (raw || {}) as Record<string, EstatisticaSetor>;
      setEstatisticas(data);
      setLastUpdate(new Date().toLocaleTimeString("pt-BR"));

      // Detecta entrada de novos pedidos para flash/alerta leve
      if (data) {
        const totals: Record<string, number> = {};
        Object.entries(data).forEach(([id, d]) => {
          const qty = typeof d?.quantidade === "number" ? d.quantidade : 0;
          totals[id] = qty;
          const prev = prevTotalsRef.current[id] || 0;
          if (qty > prev) {
            setFlashSetor(id);
            if (!audioRef.current) {
              // Pequeno beep inline (data URI) para evitar asset externo
              audioRef.current = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=");
              audioRef.current.volume = 0.25;
            }
            audioRef.current?.play().catch(() => {});
            setTimeout(() => setFlashSetor(null), 1200);
          }
        });
        prevTotalsRef.current = totals;
      }
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
    }
  };

  useEffect(() => {
    buscar();
    const interval = setInterval(buscar, 30000);
    return () => clearInterval(interval);
  }, []);

  const setoresList = useMemo(() => {
    if (!estatisticas) return [] as Array<[string, EstatisticaSetor]>;
    return Object.entries(estatisticas).sort((a, b) => b[1].quantidade - a[1].quantidade);
  }, [estatisticas]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 text-white">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Worqera Production</p>
            <h1 className="text-4xl md:text-5xl font-black text-white drop-shadow">Painel TV</h1>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-400">Atualizado</p>
            <p className="text-2xl font-mono">{lastUpdate}</p>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
          {setoresList.map(([setorId, dados]) => {
            const slowPedidos = (dados.pedidos || []).filter(p => (p.tempoNoSetor || 0) >= 24);
            const hasSlow = slowPedidos.length > 0;
            return (
              <div
                key={setorId}
                className={`relative overflow-hidden rounded-2xl p-5 backdrop-blur-md border border-white/10 shadow-2xl transition-transform duration-500 ${flashSetor === setorId ? "ring-4 ring-emerald-400/70 scale-[1.01]" : "hover:-translate-y-1"}`}
                style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))" }}
              >
                <div className="absolute inset-0 opacity-60" style={{ background: `radial-gradient(circle at 20% 20%, ${dados.cor}33, transparent 40%), radial-gradient(circle at 80% 0%, #ffffff22, transparent 35%)` }} />

                <div className="relative flex flex-col items-center text-center gap-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-300">Setor</p>
                  <h3 className="text-xl font-bold text-white drop-shadow-sm line-clamp-1 max-w-[180px]">{dados.nome}</h3>
                  <div className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: `${dados.cor}22`, color: dados.cor }}>
                    {dados.quantidade === 1 ? "1 pedido" : `${dados.quantidade} pedidos`}
                  </div>
                  <div className="text-5xl font-black" style={{ color: dados.cor }}>
                    {dados.quantidade}
                  </div>
                  <div className="text-sm text-slate-200">
                    <p className="font-semibold text-white">Tempo médio</p>
                    <p className="text-slate-200">{slowPedidos[0]?.tempoNoSetor ? `${slowPedidos[0].tempoNoSetor}h` : "—"}</p>
                  </div>
                  {hasSlow && (
                    <div className="text-[11px] text-amber-200 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-300 animate-pulse" />
                      Atrasados no setor
                    </div>
                  )}
                </div>

                {dados.quantidade > 0 && (
                  <div className="relative mt-4 space-y-2 max-h-40 overflow-y-auto pr-1 text-center">
                    {dados.pedidos.map((pedido) => (
                      <div key={pedido.id} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-left backdrop-blur flex flex-col items-center gap-1">
                        <div className="text-white font-mono text-sm">#{pedido.codigo}</div>
                        <div className="text-slate-200 text-xs truncate max-w-[180px] text-center">{pedido.cliente}</div>
                        {pedido.tempoNoSetor && pedido.tempoNoSetor > 0 && (
                          <div className={`text-xs font-semibold ${pedido.tempoNoSetor >= 24 ? "text-amber-300" : "text-emerald-200"}`}>
                            ⏱ {pedido.tempoNoSetor}h
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
