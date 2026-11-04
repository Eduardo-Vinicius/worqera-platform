"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AdminPage, AdminPanel, when } from "@/components/admin/AdminPage"
import { Skeleton, nf } from "@/components/admin/charts"
import { listPlatformAuditV1 } from "@/lib/apiV1"
import { cn } from "@/lib/utils"

/** Auditoria: who on the Worqera team changed what, and when. Kept for 1 year. */
export default function AuditoriaPage() {
  const [action, setAction] = useState("")
  const [q, setQ] = useState("")
  const [term, setTerm] = useState("")
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState<string | null>(null)
  const [data, setData] = useState<Awaited<ReturnType<typeof listPlatformAuditV1>> | null>(null)

  useEffect(() => {
    const t = window.setTimeout(() => setTerm(q.trim()), 300)
    return () => window.clearTimeout(t)
  }, [q])
  useEffect(() => setPage(1), [action, term])
  useEffect(() => {
    let alive = true
    listPlatformAuditV1({ action: action || undefined, q: term || undefined, page })
      .then((res) => alive && setData(res))
      .catch((err) => toast.error(err?.message || "Não carregou a auditoria"))
    return () => {
      alive = false
    }
  }, [action, term, page])

  const pages = data ? Math.max(1, Math.ceil(data.total / 50)) : 1
  const targetHref = (type: string, id: string | null) => (!id ? null : type === "account" ? `/admin/contas/${id}` : type === "shop" ? `/admin/shops?open=${id}` : null)

  return (
    <AdminPage title="Auditoria" subtitle="Toda alteração feita pelo time Worqera, guardada por 1 ano" width="max-w-[1300px]">
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setAction("")}
          className={cn("rounded-full border px-3 py-1 text-xs font-semibold", !action ? "border-[var(--wq-brand)] bg-[var(--wq-brand)] text-white" : "border-[var(--wq-border)] bg-[var(--wq-surface)]")}
        >
          Tudo
        </button>
        {(data?.actions || []).map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={() => setAction(a.key)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold",
              action === a.key ? "border-[var(--wq-brand)] bg-[var(--wq-brand)] text-white" : "border-[var(--wq-border)] bg-[var(--wq-surface)]"
            )}
          >
            {a.label} <span className="opacity-75">{nf(a.count)}</span>
          </button>
        ))}
      </div>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por quem fez, loja, conta ou texto" className="max-w-sm" />

      <AdminPanel title={data ? `${nf(data.total)} registro${data.total === 1 ? "" : "s"}` : "Registros"}>
        {!data ? (
          <Skeleton className="m-4 h-60" />
        ) : data.items.length ? (
          <ul className="divide-y divide-[var(--wq-border)]">
            {data.items.map((r) => {
              const href = targetHref(r.targetType, r.targetId)
              return (
                <li key={r.id} className="px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="whitespace-nowrap text-xs tabular-nums text-[var(--wq-text-muted)]">{when(r.at)}</span>
                    <span className="rounded-full bg-[var(--wq-paper)] px-2 py-0.5 text-[11px] font-semibold">{r.actionLabel}</span>
                    {r.targetName ? (
                      href ? (
                        <Link href={href} className="font-medium text-[var(--wq-brand-text)] hover:underline">
                          {r.targetName}
                        </Link>
                      ) : (
                        <span className="font-medium">{r.targetName}</span>
                      )
                    ) : null}
                    <span className="ml-auto text-xs text-[var(--wq-text-muted)]">por {r.actorEmail || "—"}</span>
                  </div>
                  <p className="mt-1">{r.summary}</p>
                  {r.changes && Object.keys(r.changes).length ? (
                    <button type="button" onClick={() => setOpen(open === r.id ? null : r.id)} className="mt-1 text-xs font-semibold text-[var(--wq-brand-text)] hover:underline">
                      {open === r.id ? "Esconder o que foi enviado" : "Ver o que foi enviado"}
                    </button>
                  ) : null}
                  {open === r.id ? (
                    <pre className="mt-2 max-h-60 overflow-auto rounded-lg bg-[var(--wq-paper)] p-3 text-xs">{JSON.stringify(r.changes, null, 2)}</pre>
                  ) : null}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="px-4 py-6 text-sm text-[var(--wq-text-muted)]">Nenhuma alteração registrada{action || term ? " com esses filtros" : " ainda"}.</p>
        )}
      </AdminPanel>

      {data && pages > 1 ? (
        <div className="flex items-center justify-end gap-2 text-sm">
          <span className="text-[var(--wq-text-muted)]">
            Página {page} de {pages}
          </span>
          <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Próxima
          </Button>
        </div>
      ) : null}
    </AdminPage>
  )
}
