import { formatBRL, readOrderPricing, type MoneyVisibility } from "@/lib/orderMoney"

export function OrderPricingSummary({
  order,
  tone = "explicit",
}: {
  order: any
  tone?: Extract<MoneyVisibility, "explicit" | "quiet">
}) {
  const pricing = readOrderPricing(order)
  const paid = pricing.total > 0 && pricing.remaining <= 0.009

  if (tone === "quiet") {
    return (
      <p className="text-xs text-[var(--wq-text-muted)]">
        {pricing.total > 0.009 ? formatBRL(pricing.total) : "A definir"}
        {pricing.remaining > 0.009 ? ` · falta ${formatBRL(pricing.remaining)}` : paid ? " · pago" : ""}
      </p>
    )
  }

  return (
    <div className="space-y-1.5 rounded-xl border border-[var(--wq-border)] bg-[var(--wq-paper)] p-3 text-sm">
      {pricing.discount > 0 ? (
        <>
          <div className="flex items-center justify-between gap-3 text-[var(--wq-text-muted)]">
            <span>Subtotal</span>
            <span className="font-mono">{formatBRL(pricing.subtotal)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-[var(--wq-text-muted)]">
            <span>Desconto</span>
            <span className="font-mono">− {formatBRL(pricing.discount)}</span>
          </div>
        </>
      ) : null}
      <div className="flex items-center justify-between gap-3 font-semibold text-[var(--wq-text)]">
        <span>Total</span>
        <span className="font-mono">{pricing.total > 0.009 ? formatBRL(pricing.total) : "A definir"}</span>
      </div>
      {pricing.deposit > 0 ? (
        <div className="flex items-center justify-between gap-3 text-[var(--wq-text)]">
          <span>Sinal pago</span>
          <span className="font-mono">{formatBRL(pricing.deposit)}</span>
        </div>
      ) : null}
      {pricing.remaining > 0.009 ? (
        <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-amber-950">
          <p className="text-[11px] font-semibold uppercase tracking-wide">Falta pagar</p>
          <p className="font-mono text-lg font-semibold">{formatBRL(pricing.remaining)}</p>
        </div>
      ) : paid ? (
        <p className="text-xs font-medium text-emerald-700">Pago</p>
      ) : null}
    </div>
  )
}
