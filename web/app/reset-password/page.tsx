"use client"

import type React from "react"
import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { resetPasswordV1 } from "@/lib/apiV1"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import { AuthShell, authFieldClass } from "@/components/auth/AuthShell"

function ResetInner() {
  const search = useSearchParams()
  const [token, setToken] = useState(search.get("token") || "")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      await resetPasswordV1(token, password)
      setDone(true)
    } catch (err: any) {
      setError(err?.message || "Falha ao redefinir senha")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <h1 className="lp-display text-2xl font-semibold tracking-tight text-[var(--ink)]">Nova senha</h1>
      {error && (
        <Alert className="mt-4 border-[var(--late)]/30 bg-[var(--late)]/5">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {done ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-[var(--ink)]">Senha atualizada.</p>
          <Button asChild className="lp-cta h-12 w-full text-base">
            <Link href="/login">Entrar</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="token">Token</Label>
            <Input
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className={`${authFieldClass} lp-mono text-xs`}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Nova senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={authFieldClass}
              required
            />
          </div>
          <Button type="submit" disabled={loading} className="lp-cta h-12 w-full text-base">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar senha"}
          </Button>
        </form>
      )}
    </AuthShell>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthShell>
          <p className="text-center text-sm text-[var(--muted-foreground)]">Carregando…</p>
        </AuthShell>
      }
    >
      <ResetInner />
    </Suspense>
  )
}
