export function roundMoney(value: number) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100) / 100
}

export function formatBRL(value: number) {
  return roundMoney(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function clampDiscount(subtotal: number, discount: number) {
  const sub = Math.max(0, roundMoney(subtotal))
  return Math.min(Math.max(0, roundMoney(discount)), sub)
}

export function netTotal(subtotal: number, discount: number) {
  return roundMoney(Math.max(0, roundMoney(subtotal) - clampDiscount(subtotal, discount)))
}

export type OrderPricingView = {
  subtotal: number
  discount: number
  total: number
  deposit: number
  remaining: number
}

export function readOrderPricing(order: any): OrderPricingView {
  const pricing = order?.pricing || {}
  const total = Number(pricing.total ?? order?.precoTotal ?? 0) || 0
  const discount = Math.max(0, Number(pricing.discount ?? order?.desconto ?? 0) || 0)
  const deposit = Math.max(0, Number(pricing.deposit ?? order?.valorSinal ?? 0) || 0)
  const subtotal =
    pricing.subtotal != null && pricing.subtotal !== ""
      ? Number(pricing.subtotal) || 0
      : roundMoney(total + discount)
  const remaining =
    pricing.remaining != null && pricing.remaining !== ""
      ? Math.max(0, Number(pricing.remaining) || 0)
      : Math.max(0, roundMoney(total - deposit))
  return {
    subtotal,
    discount,
    total,
    deposit,
    remaining,
  }
}
