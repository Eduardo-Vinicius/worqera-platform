"use client"

import { useState } from "react"
import { toast } from "sonner"
import { AdminPage } from "@/components/admin/AdminPage"
import { Chips, DeltaBadge, Skeleton, brl0, nf, useAutoRefresh } from "@/components/admin/charts"
import { getPlatformRitualV1, type PlatformRitualStep } from "@/lib/apiV1"

const GROUPS: Array<{ title: string; hint: string; keys: string[] }> = [
  { title: "Entrada", hint: "lojas chegando e testando", keys: ["shopsNew", "trials", "activeShops"] },
  { title: "Operação", hint: "o dia a dia das lojas no sistema", keys: ["clientsNew", "ordersCreated", "laudos", "ready", "whatsapp", "ordersDelivered"] },
  { title: "Resultado", hint: "o que volta para a loja e para a Worqera", keys: ["reviews", "quotesWon", "quotesWonValue", "payments"] },
]

/** Ritual semanal: one number for every step of the business, against the previous period. */
export default function RitualPage() {
  const [days, setDays] = useState<7 | 30>(7)
  const [data, setData] = useState<Awaited<ReturnType<typeof getPlatformRitualV1>> | null>(null)
  const updated = useAutoRefresh(
    async () => {
      try {
        setData(await getPlatformRitualV1(days))
      } catch (err: any) {
        toast.error(err?.message || "Não carregou o ritual")
      }
    },
    [days],
    300000
  )
  const byKey = new Map((data?.steps || []).map((s) => [s.key, s]))

  const card = (s: PlatformRitualStep) => (
    <div key={s.key} className="min-w-0 rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] px-4 py-3.5">
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">{s.label}</p>
        <DeltaBadge delta={s} />
      </div>
      <p className="mt-1.5 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums">{s.unit === "brl" ? brl0(s.value) : nf(s.value)}</p>
      <p className="mt-0.5 truncate text-xs text-[var(--wq-text-muted)]">
        {s.hint}
        {s.prev ? ` · antes ${s.unit === "brl" ? brl0(s.prev) : nf(s.prev)}` : ""}
      </p>
    </div>
  )

  return (
    <AdminPage title="Ritual semanal" subtitle={`Os números de cada passo do negócio, para a reunião da semana · ${updated}`} width="max-w-[1300px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--wq-text-muted)]">
          {data
            ? `Últimos ${data.days} dias contra os ${data.days} anteriores · base: ${nf(data.totals.shops)} lojas, ${nf(data.totals.clients)} clientes e ${nf(data.totals.orders)} pedidos`
            : "Carregando…"}
        </p>
        <Chips value={days} onChange={setDays} options={[{ id: 7, label: "7 dias" }, { id: 30, label: "30 dias" }]} />
      </div>
      {!data ? (
        <Skeleton className="h-96" />
      ) : (
        GROUPS.map((g) => (
          <section key={g.title} className="space-y-2">
            <h2 className="text-sm font-semibold">
              {g.title} <span className="font-normal text-[var(--wq-text-muted)]">· {g.hint}</span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{g.keys.map((k) => byKey.get(k)).filter(Boolean).map((s) => card(s!))}</div>
          </section>
        ))
      )}
      <p className="text-xs text-[var(--wq-text-muted)]">
        Laudos e avisos de pronto contam os e-mails que saíram (o registro de e-mails guarda 30 dias). Recebido soma cada pagamento do Asaas uma vez.
      </p>
    </AdminPage>
  )
}
