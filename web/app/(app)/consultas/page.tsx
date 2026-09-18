"use client"

import Link from "next/link"
import { Package, Users } from "lucide-react"
import { AppHeader } from "@/components/shell/AppHeader"
import { Button } from "@/components/ui/button"

export default function ConsultasHubPage() {
  return (
    <div className="-mx-3 -mt-4 sm:-mx-5 sm:-mt-6 md:-mx-8 md:-mt-7">
      <AppHeader
        title="Consultas"
        subtitle="Escolha o que deseja buscar"
        actions={
          <Button asChild size="sm" className="rounded-[10px] bg-[var(--wq-action)] hover:bg-[var(--wq-action)]/90">
            <Link href="/pedidos/novo">Novo pedido</Link>
          </Button>
        }
      />

      <div className="mx-auto grid max-w-[900px] gap-4 px-5 py-8 md:grid-cols-3 md:px-8">
        <Link
          href="/consultas/clientes"
          className="group rounded-2xl border border-[var(--wq-border)] bg-white p-6 transition-colors hover:border-[var(--wq-brand)] hover:bg-[var(--wq-brand-soft)]/40"
        >
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--wq-paper)] text-[var(--wq-brand)] group-hover:bg-white">
            <Users className="h-5 w-5" />
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--wq-text)]">
            Clientes
          </h2>
          <p className="mt-1 text-sm text-[var(--wq-text-muted)]">
            Busca rápida por nome, CPF, telefone ou e-mail.
          </p>
        </Link>

        <Link
          href="/consultas/pedidos?tab=ativos"
          className="group rounded-2xl border border-[var(--wq-border)] bg-white p-6 transition-colors hover:border-[var(--wq-brand)] hover:bg-[var(--wq-brand-soft)]/40"
        >
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--wq-paper)] text-[var(--wq-brand)] group-hover:bg-white">
            <Package className="h-5 w-5" />
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--wq-text)]">
            Pedidos ativos
          </h2>
          <p className="mt-1 text-sm text-[var(--wq-text-muted)]">
            Ainda no fluxo / kanban.
          </p>
        </Link>

        <Link
          href="/consultas/pedidos?tab=finalizados"
          className="group rounded-2xl border border-[var(--wq-border)] bg-white p-6 transition-colors hover:border-[var(--wq-brand)] hover:bg-[var(--wq-brand-soft)]/40"
        >
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--wq-paper)] text-[var(--wq-brand)] group-hover:bg-white">
            <Package className="h-5 w-5" />
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--wq-text)]">
            Finalizados
          </h2>
          <p className="mt-1 text-sm text-[var(--wq-text-muted)]">
            Histórico entregue (fora do kanban).
          </p>
        </Link>
      </div>
    </div>
  )
}
