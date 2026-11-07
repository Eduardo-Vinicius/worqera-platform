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

/** CRM menu: what to do today first, then the client groups. */
export const CRM_GROUPS: Array<{ title: string; tabs: CrmTab[] }> = [
  { title: "Visão geral", tabs: ["base"] },
  { title: "Fazer hoje", tabs: ["devendo", "voltar", "aniversariantes", "feedback"] },
  { title: "Grupos de clientes", tabs: ["voltaram", "novos", "recorrentes", "vip", "sumidos"] },
  { title: "Cadastro", tabs: ["todos"] },
]

export const TAB_HINT: Record<CrmTab, string> = {
  base: "Números, leitura e quem volta",
  devendo: "Saldo em aberto para cobrar",
  voltar: "Passaram do tempo de voltar",
  aniversariantes: "Dar parabéns hoje e na semana",
  feedback: "Pedir avaliação e Google",
  voltaram: "Voltaram nos últimos 30 dias",
  novos: "Primeiro pedido em 30 dias",
  recorrentes: "Fizeram 2 ou mais pedidos",
  vip: "Quem mais gasta",
  sumidos: "Sem pedido há 90+ dias",
  todos: "Buscar e editar clientes",
}

/** Badge for each menu item (null = no badge). "Fazer hoje" items are highlighted when > 0. */
export function tabCount(tab: CrmTab, s: { counts: Record<string, number | undefined>; birthdays?: { today: number } } | null): number | null {
  if (!s) return null
  const c = s.counts
  const map: Partial<Record<CrmTab, number | undefined>> = {
    devendo: c.owing,
    voltar: c.due,
    aniversariantes: s.birthdays?.today,
    feedback: c.feedbackToAsk,
    voltaram: c.returned,
    novos: c.new30,
    recorrentes: c.recurring,
    vip: c.vip,
    sumidos: c.inactive,
    todos: c.clients,
  }
  const v = map[tab]
  return typeof v === "number" ? v : null
}

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
