"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Star } from "lucide-react"
import { AppHeader } from "@/components/shell/AppHeader"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { listFeedbackV1 } from "@/lib/apiV1"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type Period = "30d" | "90d" | "all"

const TAG_LABEL: Record<string, string> = {
  qualidade: "Qualidade",
  prazo: "Prazo",
  atendimento: "Atendimento",
  acabamento: "Acabamento",
}

function Stars({ score }: { score: number }) {
  const n = Math.round(Number(score) || 0)
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${n} de 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i <= n ? "fill-amber-400 text-amber-400" : "text-[var(--wq-border)]"
          )}
        />
      ))}
    </span>
  )
}

export default function AvaliacoesPage() {
  const [period, setPeriod] = useState<Period>("90d")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<Awaited<ReturnType<typeof listFeedbackV1>> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listFeedbackV1({ period, page, limit: 30 })
      setData(res)
    } catch (err: any) {
      toast.error(err?.message || "Erro ao carregar avaliações")
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [period, page])

  useEffect(() => {
    void load()
  }, [load])

  const summary = data?.summary
  const maxBar = Math.max(1, ...(summary ? Object.values(summary.distribution).map(Number) : [1]))
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1

  return (
    <div className="-mx-3 -mt-4 sm:-mx-5 sm:-mt-6 md:-mx-8 md:-mt-7">
      <AppHeader
        title="Avaliações"
        subtitle="Notas dos clientes no link público — use para melhorar o atendimento"
        actions={
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: "30d" as const, label: "30 dias" },
                { id: "90d" as const, label: "90 dias" },
                { id: "all" as const, label: "Todas" },
              ] as const
            ).map((p) => (
              <Button
                key={p.id}
                size="sm"
                variant={period === p.id ? "default" : "outline"}
                className="rounded-[10px]"
                onClick={() => {
                  setPage(1)
                  setPeriod(p.id)
                }}
              >
                {p.label}
              </Button>
            ))}
          </div>
        }
      />

      <div className="mx-auto max-w-[900px] space-y-5 px-5 py-6 md:px-8">
        {loading && !data ? (
          <p className="text-sm text-[var(--wq-text-muted)]">Carregando…</p>
        ) : null}

        {summary ? (
          <div className="grid gap-4 sm:grid-cols-[1fr_1.4fr]">
            <div className="rounded-2xl border border-[var(--wq-border)] bg-white p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--wq-text-muted)]">
                Média
              </p>
              <div className="mt-2 flex items-end gap-3">
                <p className="font-[family-name:var(--font-display)] text-5xl font-semibold tracking-tight text-[var(--wq-text)]">
                  {summary.count ? summary.avg.toFixed(1) : "—"}
                </p>
                <div className="mb-1.5">
                  <Stars score={summary.avg} />
                  <p className="mt-1 text-xs text-[var(--wq-text-muted)]">
                    {summary.count} avaliação{summary.count === 1 ? "" : "ões"}
                  </p>
                </div>
              </div>
              {summary.topTags?.length ? (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {summary.topTags.map((t) => (
                    <Badge key={t.tag} variant="secondary" className="rounded-full text-[11px]">
                      {TAG_LABEL[t.tag] || t.tag} · {t.count}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-[var(--wq-border)] bg-white p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--wq-text-muted)]">
                Distribuição
              </p>
              <div className="mt-3 space-y-2">
                {[5, 4, 3, 2, 1].map((n) => {
                  const count = Number((summary.distribution as any)[n] || 0)
                  const pct = Math.round((count / maxBar) * 100)
                  return (
                    <div key={n} className="flex items-center gap-2 text-sm">
                      <span className="w-6 text-right font-mono text-xs text-[var(--wq-text-muted)]">
                        {n}★
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--wq-paper)]">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            n <= 3 ? "bg-amber-500" : "bg-[var(--wq-brand)]"
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-6 font-mono text-xs text-[var(--wq-text-muted)]">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          {!loading && data && data.items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--wq-border)] bg-white px-5 py-12 text-center">
              <p className="text-sm text-[var(--wq-text-muted)]">
                Ainda sem avaliações neste período. Quando o pedido fica pronto, o cliente pode
                avaliar no link público.
              </p>
            </div>
          ) : null}

          {data?.items.map((f) => {
            const low = Number(f.score) > 0 && Number(f.score) <= 3
            return (
              <Link
                key={f.id}
                href={`/pedidos?q=${encodeURIComponent(f.code)}`}
                className={cn(
                  "block rounded-2xl border bg-white px-4 py-3.5 transition-colors hover:border-[var(--wq-brand)]",
                  low
                    ? "border-amber-300/80 shadow-[inset_3px_0_0_0_rgb(245,158,11)]"
                    : "border-[var(--wq-border)]"
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{f.code}</span>
                      <Stars score={Number(f.score) || 0} />
                      <span className="text-xs font-bold text-[var(--wq-text-muted)]">
                        {f.score}/5
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-[var(--wq-text)]">
                      {f.clientName || "Cliente"}
                    </p>
                  </div>
                  {f.createdAt ? (
                    <time className="text-[11px] text-[var(--wq-text-muted)]">
                      {new Date(f.createdAt).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </time>
                  ) : null}
                </div>
                {Array.isArray(f.tags) && f.tags.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {f.tags.map((t) => (
                      <Badge key={t} variant="outline" className="rounded-full text-[10px]">
                        {TAG_LABEL[t] || t}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                {f.comment ? (
                  <p className="mt-2 text-sm text-[var(--wq-text-muted)]">“{f.comment}”</p>
                ) : null}
              </Link>
            )
          })}
        </div>

        {data && data.total > data.limit ? (
          <div className="flex items-center justify-center gap-2 pb-4">
            <Button
              size="sm"
              variant="outline"
              className="rounded-[10px]"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <span className="text-xs text-[var(--wq-text-muted)]">
              {page} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="rounded-[10px]"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
