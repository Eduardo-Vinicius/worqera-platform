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
import { AuthShell, authFieldClass } from "@/components/auth/AuthShell"

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
    <AuthShell>
      <h1 className="lp-display text-2xl font-semibold tracking-tight text-[var(--ink)]">Recuperar senha</h1>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
        Enviaremos instruções se o e-mail existir na base.
      </p>

      {error && (
        <Alert className="mt-4 border-[var(--late)]/30 bg-[var(--late)]/5">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {done ? (
        <div className="mt-6 space-y-3 text-sm">
          <p className="text-[var(--ink)]">Se o e-mail estiver cadastrado, o fluxo de reset foi iniciado.</p>
          {devToken && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--paper)] p-3">
              <p className="text-xs text-[var(--muted-foreground)]">Dev token (não aparece em produção)</p>
              <p className="lp-mono mt-1 break-all text-xs">{devToken}</p>
              <Button asChild className="lp-cta mt-3 w-full" size="sm">
                <Link href={`/reset-password?token=${encodeURIComponent(devToken)}`}>Abrir reset</Link>
              </Button>
            </div>
          )}
          <Button asChild variant="outline" className="w-full rounded-xl border-[var(--border)]">
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
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={authFieldClass}
            />
          </div>
          <Button type="submit" disabled={loading} className="lp-cta h-12 w-full text-base">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continuar"}
          </Button>
          <Button asChild variant="ghost" className="w-full text-[var(--muted-foreground)]">
            <Link href="/login">Login</Link>
          </Button>
        </form>
      )}
    </AuthShell>
  )
}
