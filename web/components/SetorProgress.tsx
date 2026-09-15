"use client"

import React, { useEffect, useState } from "react"
import { CheckCircle, Clock, Circle } from "lucide-react"
import { listSectorsV1 } from "@/lib/apiV1"

export type SetorHistorico = {
  setorId: string
  setorNome?: string
  entradaEm: string
  saidaEm?: string | null
}

export type PedidoSetores = {
  setoresFluxo: string[]
  setorAtual: string
  setoresHistorico: SetorHistorico[]
}

interface Props {
  pedido: PedidoSetores
}

type SectorMeta = { name: string; color: string }

const calcularTempo = (setorId: string, historico: SetorHistorico[]) => {
  const setor = historico.find((h) => h.setorId === setorId)
  if (!setor || !setor.saidaEm) return ""

  const entrada = new Date(setor.entradaEm)
  const saida = new Date(setor.saidaEm)
  const horas = Math.floor((saida.getTime() - entrada.getTime()) / (1000 * 60 * 60))

  if (horas < 1) return "menos de 1h"
  if (horas === 1) return "1h"
  return `${horas}h`
}

const getSetorStatus = (setorId: string, historico: SetorHistorico[], setorAtual: string) => {
  const h = historico.find((x) => x.setorId === setorId)
  if (!h && setorAtual !== setorId) return "pending"
  if (setorAtual === setorId && (!h || !h.saidaEm)) return "current"
  return "completed"
}

const getSetorIcon = (status: "completed" | "current" | "pending") => {
  switch (status) {
    case "completed":
      return <CheckCircle className="w-6 h-6 text-green-500" />
    case "current":
      return <Clock className="w-6 h-6 text-blue-500 animate-pulse" />
    default:
      return <Circle className="w-6 h-6 text-gray-300" />
  }
}

function resolveMeta(setorId: string, map: Record<string, SectorMeta>) {
  const fromApi = map[setorId]
  if (fromApi) return fromApi
  return {
    name: setorId,
    color: "#94a3b8",
  }
}

export const SetorProgress: React.FC<Props> = ({ pedido }) => {
  const { setoresFluxo, setorAtual, setoresHistorico } = pedido
  const [meta, setMeta] = useState<Record<string, SectorMeta>>({})

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await listSectorsV1()
        if (cancelled) return
        const next: Record<string, SectorMeta> = {}
        for (const s of res.sectors || []) {
          const id = String((s as any)._id || (s as any).id || "")
          if (!id) continue
          next[id] = {
            name: (s as any).name || "Setor",
            color: (s as any).color || "#7C6CF0",
          }
        }
        setMeta(next)
      } catch {
        /* keep legacy fallback */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between">
        {setoresFluxo.map((setorId, index) => {
          const status = getSetorStatus(setorId, setoresHistorico, setorAtual) as
            | "completed"
            | "current"
            | "pending"
          const isLast = index === setoresFluxo.length - 1
          const { name, color } = resolveMeta(setorId, meta)
          const histName = setoresHistorico.find((h) => h.setorId === setorId)?.setorNome

          return (
            <React.Fragment key={setorId}>
              <div className="flex flex-col items-center">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: status === "pending" ? "#f0f0f0" : `${color}20`,
                    border: `2px solid ${status === "pending" ? "#ddd" : color}`,
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
                  {histName || name}
                </span>

                {status === "completed" && (
                  <span className="mt-1 text-xs text-gray-400">
                    {calcularTempo(setorId, setoresHistorico)}
                  </span>
                )}
              </div>

              {!isLast && (
                <div
                  className="mx-2 h-1 flex-1"
                  style={{
                    backgroundColor: status === "completed" ? color : "#ddd",
                  }}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

export default SetorProgress
