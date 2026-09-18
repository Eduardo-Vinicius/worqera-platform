import Link from "next/link"
import { WorqeraLogo } from "@/components/brand/WorqeraLogo"

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <WorqeraLogo className="mb-4 h-11 w-11" />
      <h1 className="text-xl font-semibold tracking-tight text-[var(--wq-text)] sm:text-2xl">
        Sem permissão
      </h1>
      <p className="mt-2 max-w-md text-sm text-[var(--wq-text-muted)]">
        Esta área é restrita. Se precisar de acesso (financeiro, métricas ou configurações), fale com o
        proprietário da oficina.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/dashboard"
          className="rounded-xl bg-[var(--wq-brand)] px-4 py-2.5 text-sm font-medium text-white"
        >
          Voltar ao início
        </Link>
        <Link
          href="/kanban"
          className="rounded-xl border border-[var(--wq-border)] px-4 py-2.5 text-sm font-medium"
        >
          Ir ao kanban
        </Link>
      </div>
    </div>
  )
}
