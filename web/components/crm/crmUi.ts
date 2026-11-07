import type { CrmRow, CrmSegment } from "@/lib/apiV1"

export type CrmTab = "base" | "feedback" | "devendo" | "voltar" | "voltaram" | "sumidos" | "aniversariantes" | "vip" | "recorrentes" | "novos" | "todos"

export const CRM_TABS: Array<{ id: CrmTab; label: string; short: string; segment?: CrmSegment }> = [
  { id: "base", label: "Visão da base", short: "Base" },
  { id: "feedback", label: "Feedback", short: "Feedback" },
  { id: "devendo", label: "Devendo", short: "Devendo", segment: "owing" },
  { id: "voltar", label: "Hora de voltar", short: "Voltar", segment: "due" },
  { id: "voltaram", label: "Voltaram", short: "Voltaram", segment: "returned" },
  { id: "sumidos", label: "Sumidos", short: "Sumidos", segment: "inactive" },
  { id: "aniversariantes", label: "Aniversariantes", short: "Aniver.", segment: "birthdays" },
  { id: "vip", label: "VIP", short: "VIP", segment: "vip" },
  { id: "recorrentes", label: "Recorrentes", short: "Fiéis", segment: "recurring" },
  { id: "novos", label: "Novos", short: "Novos", segment: "new" },
  { id: "todos", label: "Todos", short: "Todos" },
]

export const SEGMENT_TAB: Record<string, CrmTab> = {
  birthdays: "aniversariantes",
  inactive: "sumidos",
  recurring: "recorrentes",
  vip: "vip",
  owing: "devendo",
  due: "voltar",
  returned: "voltaram",
  new: "novos",
  all: "todos",
  never: "todos",
}

export const SEGMENT_LABEL: Record<string, string> = {
  recurring: "Recorrente",
  new: "Novo",
  inactive: "Sumido",
  once: "1 pedido",
  never: "Sem pedido",
}

export function birthdayLabel(b: CrmRow["birthday"]) {
  if (!b) return ""
  return `${String(b.day).padStart(2, "0")}/${String(b.month).padStart(2, "0")}`
}

export function birthdayWhen(days: number | null) {
  if (days == null) return ""
  if (days === 0) return "Hoje"
  if (days === 1) return "Amanhã"
  return `Em ${days} dias`
}

export function sinceLabel(days: number | null) {
  if (days == null) return "Nunca pediu"
  if (days === 0) return "Pediu hoje"
  if (days === 1) return "Último pedido ontem"
  if (days < 60) return `Último pedido há ${days} dias`
  return `Último pedido há ${Math.round(days / 30)} meses`
}

export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })

export function gapLabel(days: number | null | undefined) {
  if (days == null) return ""
  if (days < 1) return "no mesmo dia"
  if (days < 60) return `${days} dia${days === 1 ? "" : "s"}`
  if (days < 365) return `${Math.round(days / 30)} meses`
  const years = Math.floor(days / 365)
  return `${years} ano${years === 1 ? "" : "s"}`
}
