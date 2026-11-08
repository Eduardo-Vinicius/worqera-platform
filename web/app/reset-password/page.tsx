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
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { AuthShell, authFieldClass } from "@/components/auth/AuthShell"
import { loginErrorMessage } from "@/lib/authNext"

function ResetInner() {
  const search = useSearchParams()
  const linkToken = search.get("token") || ""
  const [token, setToken] = useState(linkToken)
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
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
      setError(loginErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <h1 className="lp-display text-2xl font-semibold tracking-tight text-[var(--ink)]">Nova senha</h1>
      {!linkToken && !done ? (
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Abra o link que enviamos por e-mail. Não chegou?{" "}
          <Link href="/forgot-password" className="font-medium text-[var(--primary)] hover:underline">
            Pedir novo link
          </Link>
        </p>
      ) : null}
      {error && (
        <Alert className="mt-4 border-[var(--late)]/30 bg-[var(--late)]/5">
          <AlertDescription>
            {error}{" "}
            <Link href="/forgot-password" className="font-medium text-[var(--primary)] underline">
              Pedir novo link
            </Link>
          </AlertDescription>
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
          {!linkToken ? (
            <div className="space-y-1.5">
              <Label htmlFor="token">Código do link</Label>
              <Input
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className={`${authFieldClass} lp-mono text-xs`}
                required
              />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="password">Nova senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={6}
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${authFieldClass} pr-11`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--ink)]"
                aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
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
