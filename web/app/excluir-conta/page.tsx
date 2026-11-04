"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { clearSession, deleteAccountV1 } from "@/lib/apiV1"

/** Public page for account deletion (Play Store data-deletion URL; same rule as the app). */
export default function ExcluirContaPage() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [email, setEmail] = useState("")
  const [typed, setTyped] = useState("")
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    try {
      setLoggedIn(Boolean(localStorage.getItem("token")))
      setEmail(localStorage.getItem("email") || "")
    } catch {
      setLoggedIn(false)
    }
  }, [])

  const remove = async () => {
    setBusy(true)
    setError("")
    try {
      await deleteAccountV1()
      clearSession()
      setDone(true)
    } catch (err: any) {
      setError(err?.message || "Não deu para excluir agora. Tente de novo.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-12 text-[var(--wq-text)]">
      <p className="text-xs font-semibold tracking-[0.18em] text-[var(--wq-brand)]">WORQERA</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Excluir minha conta</h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--wq-text-muted)]">
        Você pode excluir a conta pelo app (Mais › Excluir minha conta) ou por esta página. Não dá para desfazer.
      </p>
      <ul className="mt-6 list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
        <li>Seu nome, e-mail e senha são apagados e você sai de todos os aparelhos.</li>
        <li>Se você for o único dono, a loja é suspensa e a assinatura é cancelada (inclusive a cobrança no Asaas).</li>
        <li>Pedidos e clientes ficam com a loja, como registro do negócio da empresa.</li>
      </ul>

      {done ? (
        <p className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Conta excluída. Obrigado por ter usado o Worqera.</p>
      ) : loggedIn ? (
        <section className="mt-8 space-y-3 rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
          <p className="text-sm">
            Conta: <b>{email || "sua conta"}</b>
          </p>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Digite EXCLUIR para confirmar" className="max-w-xs bg-white" />
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          <Button type="button" disabled={busy || typed.trim().toUpperCase() !== "EXCLUIR"} onClick={() => void remove()} className="bg-rose-600 text-white hover:bg-rose-700">
            {busy ? "Excluindo…" : "Excluir conta"}
          </Button>
        </section>
      ) : (
        <p className="mt-8 text-sm">
          <Link href="/login?next=/excluir-conta" className="font-semibold text-[var(--wq-brand-text)] underline">
            Entre na sua conta
          </Link>{" "}
          para excluir. Sem acesso? <a className="underline" href="https://wa.me/5511985591053?text=Quero%20excluir%20minha%20conta%20Worqera" target="_blank" rel="noreferrer">Fale com a Worqera no WhatsApp</a> com o e-mail da conta.
        </p>
      )}
      <p className="mt-10 text-xs text-[var(--wq-text-muted)]">
        <Link href="/privacidade" className="underline">
          Privacidade
        </Link>
      </p>
    </main>
  )
}
