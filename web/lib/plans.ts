/** The plan catalog shown to users. Prices must match `api/src/v1/services/billingService.js` PRODUCTS. */
export type PlanCode = "WORQERA_BASIC" | "WORQERA_PRO" | "WORQERA_BUSINESS"
export type Cycle = "monthly" | "yearly"

export type Plan = { code: PlanCode; name: string; monthly: number; yearly: number; value: string; items: string[] }

export const PLANS: Plan[] = [
  {
    code: "WORQERA_BASIC",
    name: "Basic",
    monthly: 147,
    yearly: 1470,
    value: "Um orçamento recuperado no mês já paga o plano.",
    items: [
      "Kanban por setores, TVs e consulta do cliente",
      "CRM de orçamentos e WhatsApp com texto pronto",
      "IA no resumo do dia (50 usos)",
      "Até 150 pedidos por mês",
    ],
  },
  {
    code: "WORQERA_PRO",
    name: "Pro",
    monthly: 297,
    yearly: 2970,
    value: "O caixa, a prateleira e o estoque na sua mão.",
    items: [
      "Tudo do Basic, sem limite de pedidos",
      "Financeiro, métricas e TV financeiro",
      "Produtos, estoque e marca da empresa",
      "IA em orçamentos, clientes e cobrança (300 usos)",
    ],
  },
  {
    code: "WORQERA_BUSINESS",
    name: "Business",
    monthly: 597,
    yearly: 5970,
    value: "O WhatsApp avisa sozinho e a IA escreve com você.",
    items: [
      "Tudo do Pro",
      "WhatsApp oficial automático (1.000 avisos e 100 retomadas)",
      "IA com 1.500 usos e leitura semanal",
      "Suporte prioritário",
    ],
  },
]

/** One-time setup with the Worqera team: sectors, history import and training. */
export const IMPLANTACAO = 497

/** Yearly = 10 months: 2 free, shown as a percentage. */
export const YEARLY_OFF = Math.round((1 - 10 / 12) * 100)

/** What the yearly plan costs per month. */
export const yearlyMonthly = (p: Plan) => p.yearly / 12

/** Whole reais without cents; cents only when the value has them (R$ 247,50). */
export const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: Number.isInteger(v) ? 0 : 2,
    maximumFractionDigits: Number.isInteger(v) ? 0 : 2,
  })

/** The plan the visitor chose on the signup page ("Assinar agora"), read once by /billing. */
export const CHECKOUT_INTENT_KEY = "wq-checkout-intent"

export function planOf(code?: string | null) {
  const raw = String(code || "").toUpperCase()
  const c = raw === "WORQERA_PREMIUM" ? "WORQERA_BUSINESS" : raw
  return PLANS.find((p) => p.code === c) || null
}

/** 000.000.000-00 or 00.000.000/0000-00 while typing. */
export function maskCpfCnpj(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 14)
  if (d.length <= 11) {
    return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2")
  }
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2")
}
