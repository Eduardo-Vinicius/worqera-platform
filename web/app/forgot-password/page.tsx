"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { forgotPasswordV1 } from "@/lib/apiV1"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Worqera"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [devToken, setDevToken] = useState<string | null>(null)
  const [error, setError] = useState("")

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await forgotPasswordV1(email)
      setDone(true)
      if (res.resetToken) setDevToken(res.resetToken)
    } catch (err: any) {
      setError(err?.message || "Falha ao solicitar reset")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--wq-paper)] p-6">
      <div className="w-full max-w-md rounded-2xl border border-[var(--wq-border)] bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--wq-text-muted)]">
          {APP_NAME}
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--wq-text)]">
          Recuperar senha
        </h1>
        <p className="mt-2 text-sm text-[var(--wq-text-muted)]">
          Enviaremos instruções se o e-mail existir na base.
        </p>

        {error && (
          <Alert className="mt-4 border-[var(--wq-danger)]/30 bg-[var(--wq-danger)]/5">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {done ? (
          <div className="mt-6 space-y-3 text-sm">
            <p className="text-[var(--wq-text)]">
              Se o e-mail estiver cadastrado, o fluxo de reset foi iniciado.
            </p>
            {devToken && (
              <div className="rounded-xl border border-[var(--wq-border)] bg-[var(--wq-paper)] p-3">
                <p className="text-xs text-[var(--wq-text-muted)]">Dev token (não aparece em produção)</p>
                <p className="mt-1 break-all font-mono text-xs">{devToken}</p>
                <Button asChild className="mt-3 w-full rounded-[10px]" size="sm">
                  <Link href={`/reset-password?token=${encodeURIComponent(devToken)}`}>
                    Abrir reset
                  </Link>
                </Button>
              </div>
            )}
            <Button asChild variant="outline" className="w-full rounded-[10px]">
              <Link href="/login">Voltar ao login</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-[10px]"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-[10px] bg-[var(--wq-action)] hover:bg-[var(--wq-action)]/90"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continuar"}
            </Button>
            <Button asChild variant="ghost" className="w-full rounded-[10px]">
              <Link href="/login">Login</Link>
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
