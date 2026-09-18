import Link from "next/link"
import { WorqeraLogo } from "@/components/brand/WorqeraLogo"

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--wq-paper)] px-4 text-center text-[var(--wq-text)]">
      <WorqeraLogo className="mb-4 h-12 w-12" />
      <h1 className="text-2xl font-semibold tracking-tight">Página não encontrada</h1>
      <p className="mt-2 max-w-sm text-sm text-[var(--wq-text-muted)]">
        O endereço não existe ou foi movido. Volte ao início ou entre na sua oficina.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-xl bg-[var(--wq-brand)] px-4 py-2.5 text-sm font-medium text-white"
        >
          Ir ao site
        </Link>
        <Link
          href="/login"
          className="rounded-xl border border-[var(--wq-border)] bg-white px-4 py-2.5 text-sm font-medium"
        >
          Entrar
        </Link>
      </div>
    </div>
  )
}
