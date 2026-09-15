"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Search, Users } from "lucide-react"
import { AppHeader } from "@/components/shell/AppHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { getClientesService, getPedidosConsultaService } from "@/lib/apiService"
import { toast } from "sonner"
import { pairCount } from "@/lib/utils"

type ClientRow = {
  id?: string
  _id?: string
  nomeCompleto?: string
  name?: string
  cpf?: string
  telefone?: string
  phone?: string
  email?: string
}

export default function ConsultasClientesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [clients, setClients] = useState<ClientRow[]>([])
  const [nextToken, setNextToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [clientOrders, setClientOrders] = useState<any[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selected = clients.find((c) => String(c.id || c._id) === selectedId) || null

  const search = useCallback(
    async (overrides?: { q?: string; append?: boolean; cursor?: string | null }) => {
      const append = Boolean(overrides?.append)
      if (append) setLoadingMore(true)
      else setLoading(true)
      setHasSearched(true)
      if (!append) {
        setSelectedId(null)
        setClientOrders([])
      }
      try {
        const term = (overrides?.q ?? searchTerm).trim()
        const result = await getClientesService({
          q: term || undefined,
          limit: 40,
          lastKey: overrides?.cursor || undefined,
          forceRefresh: true,
        })
        setClients((prev) => (append ? [...prev, ...result.data] : result.data))
        setNextToken(result.nextToken)
      } catch (err: any) {
        toast.error(err?.message || "Erro ao buscar clientes")
        if (!append) setClients([])
        setNextToken(null)
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [searchTerm]
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (searchTerm.trim().length >= 2 || searchTerm.trim().length === 0) {
        // only auto-search after user started typing once
        if (hasSearched || searchTerm.trim().length >= 2) search({ q: searchTerm })
      }
    }, 320)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm])

  useEffect(() => {
    if (!selectedId || !selected) return
    let cancelled = false
    ;(async () => {
      setOrdersLoading(true)
      try {
        const result: any = await getPedidosConsultaService(
          { clientId: selectedId, limit: 40 },
          { forceRefresh: true }
        )
        const raw = Array.isArray(result?.data)
          ? result.data
          : Array.isArray(result?.orders)
            ? result.orders
            : Array.isArray(result)
              ? result
              : []
        if (!cancelled) setClientOrders(raw)
      } catch {
        if (!cancelled) {
          setClientOrders([])
          toast.error("Não foi possível carregar pedidos deste cliente")
        }
      } finally {
        if (!cancelled) setOrdersLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedId, selected])

  return (
    <div className="-mx-5 -mt-6 md:-mx-8 md:-mt-7">
      <AppHeader
        title="Consultar clientes"
        subtitle="Busca no servidor por nome, CPF, telefone ou e-mail"
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="rounded-[10px]">
              <Link href="/consultas">Voltar</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-[10px]">
              <Link href="/consultas/pedidos?tab=finalizados">Pedidos</Link>
            </Button>
          </div>
        }
      />

      <div className="mx-auto max-w-[1100px] space-y-4 px-5 py-6 md:px-8">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--wq-text-muted)]" />
            <Input
              className="h-10 rounded-[10px] pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Nome, CPF, telefone ou e-mail…"
            />
          </div>
          <Button
            onClick={() => search()}
            disabled={loading}
            className="rounded-[10px] bg-[var(--wq-action)] hover:bg-[var(--wq-action)]/90"
          >
            {loading ? "…" : "Buscar"}
          </Button>
        </div>

        {!hasSearched && (
          <div className="rounded-2xl border border-dashed border-[var(--wq-border)] py-16 text-center">
            <Users className="mx-auto mb-3 h-8 w-8 text-[var(--wq-text-muted)]" />
            <p className="text-sm text-[var(--wq-text-muted)]">Digite pelo menos 2 caracteres ou clique em Buscar.</p>
          </div>
        )}

        {hasSearched && (
          <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
            <div className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-white">
              <div className="border-b border-[var(--wq-border)] bg-[var(--wq-paper)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--wq-text-muted)]">
                Clientes ({clients.length}
                {nextToken ? "+" : ""})
              </div>
              <ul className="divide-y divide-[var(--wq-border)]">
                {clients.length === 0 && !loading && (
                  <li className="px-4 py-8 text-center text-sm text-[var(--wq-text-muted)]">
                    Nenhum cliente encontrado.
                  </li>
                )}
                {clients.map((c) => {
                  const id = String(c.id || c._id)
                  const active = id === selectedId
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(id)}
                        className={`w-full px-4 py-3 text-left transition-colors ${
                          active ? "bg-[var(--wq-brand-soft)]" : "hover:bg-[var(--wq-paper)]"
                        }`}
                      >
                        <p className="font-medium text-[var(--wq-text)]">
                          {c.nomeCompleto || c.name || "Cliente"}
                        </p>
                        <p className="text-xs text-[var(--wq-text-muted)]">
                          {[c.telefone || c.phone, c.cpf, c.email].filter(Boolean).join(" · ") || "Sem contato"}
                        </p>
                      </button>
                    </li>
                  )
                })}
              </ul>
              {nextToken && (
                <div className="border-t border-[var(--wq-border)] p-3 text-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-[10px]"
                    disabled={loadingMore}
                    onClick={() => search({ append: true, cursor: nextToken })}
                  >
                    {loadingMore ? "…" : "Carregar mais"}
                  </Button>
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-white">
              <div className="flex items-center justify-between border-b border-[var(--wq-border)] bg-[var(--wq-paper)] px-4 py-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--wq-text-muted)]">
                  Pedidos do cliente
                </span>
                {selectedId && (
                  <Button asChild variant="outline" size="sm" className="h-7 rounded-[8px] text-xs">
                    <Link href={`/clientes/${selectedId}`}>Ficha</Link>
                  </Button>
                )}
              </div>
              {!selected && (
                <p className="px-4 py-10 text-center text-sm text-[var(--wq-text-muted)]">
                  Selecione um cliente à esquerda.
                </p>
              )}
              {selected && ordersLoading && (
                <p className="px-4 py-10 text-center text-sm text-[var(--wq-text-muted)]">Carregando…</p>
              )}
              {selected && !ordersLoading && (
                <ul className="divide-y divide-[var(--wq-border)]">
                  {clientOrders.length === 0 && (
                    <li className="px-4 py-8 text-center text-sm text-[var(--wq-text-muted)]">
                      Sem pedidos para este cliente.
                    </li>
                  )}
                  {clientOrders.map((o) => {
                    const id = String(o.id || o._id)
                    const code = o.code || o.codigo || id
                    return (
                      <li key={id} className="flex items-center gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-semibold">{code}</span>
                            {pairCount(o) > 1 && (
                              <Badge variant="secondary" className="font-mono text-[10px]">
                                {pairCount(o)} pares
                              </Badge>
                            )}
                            {o.status && (
                              <Badge variant="outline" className="text-[10px]">
                                {o.status}
                              </Badge>
                            )}
                          </div>
                          <p className="truncate text-xs text-[var(--wq-text-muted)]">
                            {o.shoeModel || o.modeloTenis || "—"}
                          </p>
                        </div>
                        <Button asChild size="sm" variant="outline" className="rounded-[8px]">
                          <Link
                            href={`/consultas/pedidos?q=${encodeURIComponent(code)}&tab=${
                              o.status === "delivered" ? "finalizados" : "ativos"
                            }`}
                          >
                            Abrir
                          </Link>
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
