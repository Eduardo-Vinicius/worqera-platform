import React from "react";
import { CheckCircle, Clock, Circle } from "lucide-react";
import { SETORES_CORES, SETORES_NOMES } from "@/lib/setores";

export type SetorHistorico = {
  setorId: string;
  setorNome?: string;
  entradaEm: string;
  saidaEm?: string | null;
};

export type PedidoSetores = {
  setoresFluxo: string[];
  setorAtual: string;
  setoresHistorico: SetorHistorico[];
};

interface Props {
  pedido: PedidoSetores;
}

const calcularTempo = (setorId: string, historico: SetorHistorico[]) => {
  const setor = historico.find((h) => h.setorId === setorId);
  if (!setor || !setor.saidaEm) return "";

  const entrada = new Date(setor.entradaEm);
  const saida = new Date(setor.saidaEm);
  const horas = Math.floor((saida.getTime() - entrada.getTime()) / (1000 * 60 * 60));

  if (horas < 1) return "menos de 1h";
  if (horas === 1) return "1h";
  return `${horas}h`;
};

const getSetorStatus = (setorId: string, historico: SetorHistorico[], setorAtual: string) => {
  const h = historico.find((x) => x.setorId === setorId);
  if (!h && setorAtual !== setorId) return "pending";
  if (setorAtual === setorId && (!h || !h.saidaEm)) return "current";
  return "completed";
};

const getSetorIcon = (status: "completed" | "current" | "pending") => {
  switch (status) {
    case "completed":
      return <CheckCircle className="w-6 h-6 text-green-500" />;
    case "current":
      return <Clock className="w-6 h-6 text-blue-500 animate-pulse" />;
    default:
      return <Circle className="w-6 h-6 text-gray-300" />;
  }
};

export const SetorProgress: React.FC<Props> = ({ pedido }) => {
  const { setoresFluxo, setorAtual, setoresHistorico } = pedido;

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between">
        {setoresFluxo.map((setorId, index) => {
          const status = getSetorStatus(setorId, setoresHistorico, setorAtual) as
            | "completed"
            | "current"
            | "pending";
          const isLast = index === setoresFluxo.length - 1;

          return (
            <React.Fragment key={setorId}>
              <div className="flex flex-col items-center">
                <div
                  className="flex items-center justify-center w-12 h-12 rounded-full"
                  style={{
                    backgroundColor:
                      status === "pending" ? "#f0f0f0" : `${SETORES_CORES[setorId] ?? "#ddd"}20`,
                    border: `2px solid ${status === "pending" ? "#ddd" : SETORES_CORES[setorId] ?? "#ddd"}`,
                  }}
                >
                  {getSetorIcon(status)}
                </div>

                <span
                  className={`mt-2 text-xs font-medium ${
                    status === "current"
                      ? "text-blue-600"
                      : status === "completed"
                      ? "text-green-600"
                      : "text-gray-400"
                  }`}
                >
                  {SETORES_NOMES[setorId] ?? setorId}
                </span>

                {status === "completed" && (
                  <span className="text-xs text-gray-400 mt-1">
                    {calcularTempo(setorId, setoresHistorico)}
                  </span>
                )}
              </div>

              {!isLast && (
                <div
                  className="flex-1 h-1 mx-2"
                  style={{
                    backgroundColor:
                      status === "completed" ? SETORES_CORES[setorId] ?? "#ddd" : "#ddd",
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default SetorProgress;
