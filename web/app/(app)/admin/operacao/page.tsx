"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { AppHeader } from "@/components/shell/AppHeader"
import { Button } from "@/components/ui/button"
import { enterPlatformShop, getPlatformQueuesV1, patchPlatformShopV1, type PlatformQueue, type QueueItem } from "@/lib/apiV1"
import { Skeleton, nf, useAutoRefresh } from "@/components/admin/charts"
import { cn } from "@/lib/utils"

const SLA = {
  ok: { label: "No prazo", tone: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200" },
  warn: { label: "Atenção", tone: "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200" },
  late: { label: "Atrasado", tone: "bg-rose-100 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200" },
}

const age = (h: number) => (h < 48 ? `${nf(h)} h` : `${nf(Math.round(h / 24))} dias`)

/** Platform work queues: who needs a touch from the Worqera team, oldest first. */
export default function OperacaoPage() {
  const [queues, setQueues] = useState<PlatformQueue[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const updated = useAutoRefresh(
    async () => {
      try {
        setQueues((await getPlatformQueuesV1()).queues)
      } catch (err: any) {
        toast.error(err?.message || "Não carregou as filas")
      }
    },
    [reload]
  )

  const act = async (item: QueueItem) => {
    if (item.action === "openShop" && item.shopId) {
      enterPlatformShop({ id: item.shopId, name: item.title })
      window.location.href = "/dashboard"
      return
    }
    if (item.action === "extendTrial" && item.shopId) {
      setBusy(item.id)
      try {
        await patchPlatformShopV1(item.shopId, { extendTrialDays: 7 })
        toast.success(`Teste de ${item.title} estendido por 7 dias`)
        setReload((n) => n + 1)
      } catch (err: any) {
        toast.error(err?.message || "Não deu para estender")
      } finally {
        setBusy(null)
      }
    }
  }

  return (
    <div className="-mx-2.5 -mt-3 sm:-mx-5 sm:-mt-5 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-6">
      <AppHeader title="Operação" subtitle={`Filas do time Worqera · ${updated}`} showInbox={false} showOrderJump={false} />
      <div className="mx-auto w-full max-w-[1200px] space-y-4 px-2.5 py-4 sm:px-5 md:px-6 lg:px-8">
        {!queues ? (
          <Skeleton className="h-80" />
        ) : (
          queues.map((q) => (
            <section key={q.key} id={q.key} className="scroll-mt-20 overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
              <header className="flex flex-wrap items-center gap-2 border-b border-[var(--wq-border)] px-4 py-3">
                <h2 className="text-sm font-semibold">{q.label}</h2>
                <span className="rounded-full bg-[var(--wq-paper)] px-2 py-0.5 text-xs font-semibold tabular-nums">{nf(q.count)}</span>
                {q.count ? <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", SLA[q.sla].tone)}>{SLA[q.sla].label}</span> : null}
                <p className="w-full text-xs text-[var(--wq-text-muted)]">{q.hint}</p>
              </header>
              {q.items.length ? (
                <ul className="divide-y divide-[var(--wq-border)]">
                  {q.items.map((item) => (
                    <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", { ok: "bg-emerald-500", warn: "bg-amber-500", late: "bg-rose-500" }[item.sla])} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{item.title}</span>
                        <span className="block truncate text-xs text-[var(--wq-text-muted)]">{item.detail}</span>
                      </span>
                      <span className="text-xs tabular-nums text-[var(--wq-text-muted)]">há {age(item.hours)}</span>
                      {item.action === "metrics" ? (
                        <Link href="/admin/metricas" className="text-xs font-semibold text-[var(--wq-brand-text)] hover:underline">
                          Ver métricas
                        </Link>
                      ) : item.shopId ? (
                        <span className="flex gap-1.5">
                          {item.action === "extendTrial" ? (
                            <Button type="button" size="sm" variant="outline" className="h-8 rounded-[10px]" disabled={busy === item.id} onClick={() => void act(item)}>
                              {busy === item.id ? "Estendendo…" : "+7 dias"}
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 rounded-[10px] bg-[var(--wq-action)] text-white hover:bg-[var(--wq-action)]/90"
                            onClick={() => void act({ ...item, action: "openShop" })}
                          >
                            Entrar
                          </Button>
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-3 text-sm text-[var(--wq-text-muted)]">Nada pendente.</p>
              )}
            </section>
          ))
        )}
      </div>
    </div>
  )
}
