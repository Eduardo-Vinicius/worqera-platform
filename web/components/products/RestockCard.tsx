"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Check, Loader2, PackageSearch, Truck, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  cancelRestockV1,
  getRestockV1,
  orderRestockV1,
  restockArrivedV1,
  type RestockReport,
  type RestockRow,
} from "@/lib/apiV1"
import { cn } from "@/lib/utils"

const DAY = 24 * 60 * 60 * 1000

function dateInput(daysAhead: number) {
  const d = new Date(Date.now() + daysAhead * DAY)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function shortDate(iso: string | null) {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}

const GROUPS: Array<{ key: keyof Pick<RestockReport, "late" | "order" | "coming">; title: string; hint: string; tone: string; icon: typeof Truck }> = [
  { key: "late", title: "Atrasado", hint: "Passou da data prevista", tone: "text-rose-700 dark:text-rose-300", icon: AlertTriangle },
  { key: "order", title: "Hora de pedir", hint: "Pelo prazo do fornecedor, peça agora", tone: "text-amber-800 dark:text-amber-300", icon: PackageSearch },
  { key: "coming", title: "A caminho", hint: "Pedido feito ao fornecedor", tone: "text-sky-800 dark:text-sky-300", icon: Truck },
]

/** Produtos → Repor estoque: what to order now, what is on the way, what is late. */
export function RestockCard({ onChanged, refreshKey = 0 }: { onChanged: () => void; refreshKey?: number }) {
  const [report, setReport] = useState<RestockReport | null>(null)
  const [busy, setBusy] = useState("")
  const [ordering, setOrdering] = useState<string | null>(null)
  const [qty, setQty] = useState("")
  const [expected, setExpected] = useState("")
  const [variantId, setVariantId] = useState("")

  const load = () =>
    getRestockV1()
      .then(setReport)
      .catch(() => setReport(null))

  useEffect(() => {
    void load()
  }, [refreshKey])

  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key)
    try {
      await fn()
      toast.success(ok)
      setOrdering(null)
      await load()
      onChanged()
    } catch (err: any) {
      toast.error(err?.message || "Não salvou")
    } finally {
      setBusy("")
    }
  }

  const startOrder = (row: RestockRow) => {
    setOrdering(row.id)
    setQty(String(Math.max(1, row.minQty, row.reorderPoint * 2 - row.available)))
    setExpected(dateInput(row.leadTimeDays || 30))
    setVariantId(row.variants[0]?.id || "")
  }

  if (!report) return null
  const total = report.counts.order + report.counts.coming + report.counts.late
  if (!total) return null

  return (
    <section id="repor" className="scroll-mt-20 overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--wq-border)] px-4 py-3">
        <div>
          <h2 className="font-semibold">Repor estoque</h2>
          <p className="text-xs text-[var(--wq-text-muted)]">
            Considera o mínimo, o prazo do fornecedor e o quanto sai por dia (últimos 60 dias).
          </p>
        </div>
        <div className="flex gap-1.5 text-xs font-semibold">
          {report.counts.late ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-700">{report.counts.late} atrasado</span> : null}
          {report.counts.order ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-900">{report.counts.order} pedir</span> : null}
          {report.counts.coming ? <span className="rounded-full bg-sky-50 px-2 py-0.5 text-sky-900">{report.counts.coming} a caminho</span> : null}
        </div>
      </div>

      <div className="divide-y divide-[var(--wq-border)]">
        {GROUPS.filter((g) => report[g.key].length).map((g) => {
          const Icon = g.icon
          return (
            <div key={g.key} className="px-4 py-3">
              <p className={cn("flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em]", g.tone)}>
                <Icon className="h-3.5 w-3.5" />
                {g.title}
                <span className="font-normal normal-case tracking-normal text-[var(--wq-text-muted)]">· {g.hint}</span>
              </p>
              <ul className="mt-2 space-y-2">
                {report[g.key].map((row) => (
                  <li key={row.id} className="rounded-xl border border-[var(--wq-border)] px-3 py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{row.name}</p>
                        <p className="text-xs text-[var(--wq-text-muted)]">
                          {[
                            `${row.available} disponível`,
                            row.daysOfStock != null ? `dá para ~${row.daysOfStock} dias` : "",
                            row.leadTimeDays ? `fornecedor leva ${row.leadTimeDays} dias` : "sem prazo do fornecedor",
                            row.restock ? `pediu ${row.restock.qty} em ${shortDate(row.restock.orderedAt)}` : "",
                            row.restock?.expectedAt
                              ? row.state === "late"
                                ? `era para ${shortDate(row.restock.expectedAt)}`
                                : `chega ${shortDate(row.restock.expectedAt)}${row.daysLeft != null ? ` (${row.daysLeft} dias)` : ""}`
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        {row.state === "order" ? (
                          <Button type="button" size="sm" className="h-8 rounded-[10px] bg-[var(--wq-action)] text-white" onClick={() => startOrder(row)}>
                            Pedi ao fornecedor
                          </Button>
                        ) : (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              className="h-8 rounded-[10px] bg-emerald-600 text-white hover:bg-emerald-700"
                              disabled={busy === `arrived-${row.id}`}
                              onClick={() => void run(`arrived-${row.id}`, () => restockArrivedV1(row.id), `${row.name}: estoque atualizado`)}
                            >
                              {busy === `arrived-${row.id}` ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />}
                              Chegou {row.restock?.qty ? `(${row.restock.qty})` : ""}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 rounded-[10px]"
                              disabled={Boolean(busy)}
                              onClick={() => void run(`cancel-${row.id}`, () => cancelRestockV1(row.id), "Pedido ao fornecedor cancelado")}
                              aria-label="Cancelar pedido ao fornecedor"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    {ordering === row.id ? (
                      <div className="mt-2 flex flex-wrap items-end gap-2 border-t border-[var(--wq-border)] pt-2">
                        {row.variants.length ? (
                          <label className="space-y-1 text-xs">
                            <span className="block text-[var(--wq-text-muted)]">Variação</span>
                            <select
                              className="h-9 rounded-[10px] border border-[var(--wq-border)] bg-white px-2 text-sm"
                              value={variantId}
                              onChange={(e) => setVariantId(e.target.value)}
                            >
                              {row.variants.map((v) => (
                                <option key={v.id} value={v.id}>
                                  {v.name} ({v.available})
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : null}
                        <label className="space-y-1 text-xs">
                          <span className="block text-[var(--wq-text-muted)]">Quantidade</span>
                          <Input className="h-9 w-24" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} />
                        </label>
                        <label className="space-y-1 text-xs">
                          <span className="block text-[var(--wq-text-muted)]">Chega em</span>
                          <Input className="h-9 w-40" type="date" value={expected} onChange={(e) => setExpected(e.target.value)} />
                        </label>
                        <Button
                          type="button"
                          size="sm"
                          className="h-9 rounded-[10px] bg-[var(--wq-action)] text-white"
                          disabled={busy === `order-${row.id}`}
                          onClick={() =>
                            void run(
                              `order-${row.id}`,
                              () =>
                                orderRestockV1(row.id, {
                                  qty: Math.max(1, Math.floor(Number(qty) || 0)),
                                  expectedAt: expected ? new Date(`${expected}T12:00:00`).toISOString() : null,
                                  variantId: variantId || undefined,
                                }),
                              "Anotado: pedido ao fornecedor"
                            )
                          }
                        >
                          {busy === `order-${row.id}` ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                          Salvar
                        </Button>
                        <Button type="button" size="sm" variant="ghost" className="h-9" onClick={() => setOrdering(null)}>
                          Cancelar
                        </Button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}
