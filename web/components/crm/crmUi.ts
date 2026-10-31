import type { CrmRow, CrmSegment } from "@/lib/apiV1"

export type CrmTab = "base" | "aniversariantes" | "sumidos" | "recorrentes" | "novos" | "todos"

export const CRM_TABS: Array<{ id: CrmTab; label: string; short: string; segment?: CrmSegment }> = [
  { id: "base", label: "Visão da base", short: "Base" },
  { id: "aniversariantes", label: "Aniversariantes", short: "Aniver.", segment: "birthdays" },
  { id: "sumidos", label: "Sumidos", short: "Sumidos", segment: "inactive" },
  { id: "recorrentes", label: "Recorrentes", short: "Fiéis", segment: "recurring" },
  { id: "novos", label: "Novos", short: "Novos", segment: "new" },
  { id: "todos", label: "Todos", short: "Todos" },
]

export const SEGMENT_TAB: Record<string, CrmTab> = {
  birthdays: "aniversariantes",
  inactive: "sumidos",
  recurring: "recorrentes",
  vip: "recorrentes",
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
