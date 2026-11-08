"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { ApiV1Error, loginV1 } from "@/lib/apiV1"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { AuthShell, authFieldClass } from "@/components/auth/AuthShell"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    try {
      const notice = sessionStorage.getItem("wq-auth-notice")
      if (!notice) return
      sessionStorage.removeItem("wq-auth-notice")
      setError(notice)
    } catch {}
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    try {
      try {
        const data = await loginV1(email, password)
        if (data?.emailVerificationRequired || data?.emailVerified === false) {
          toast.message("E-mail ainda não confirmado", {
            description: "Você pode usar o app normalmente. Confirme quando puder pelo link do cadastro.",
          })
        }
      } catch (first) {
        if ((first as ApiV1Error)?.code === "EMAIL_NOT_VERIFIED") {
          toast.message("Falta confirmar o e-mail", {
            description: "Digite o código que enviamos para entrar.",
          })
          window.location.href = `/verify-email?pending=1&email=${encodeURIComponent(email.trim())}`
          return
        }
        const msg = String((first as Error)?.message || "")
        if (/failed to fetch|networkerror|load failed/i.test(msg)) {
          throw new Error(
            `Não conectou na API (${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001"}). Confirme make api-dev e abra o front em http://127.0.0.1:3000`
          )
        }
        throw first
      }
      window.location.href =
        localStorage.getItem("platformAdmin") === "1" ? "/admin/shops" : "/dashboard"
    } catch (err: any) {
      setError(err.message || "Erro ao autenticar")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell aside>
      <div className="space-y-1">
        <h1 className="lp-display text-2xl font-semibold tracking-tight text-[var(--ink)]">Bem-vindo de volta</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Entre com o e-mail da sua empresa.</p>
      </div>

      <form onSubmit={handleLogin} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="funcionario@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={authFieldClass}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <Label htmlFor="password">Senha</Label>
            <Link
              href="/forgot-password"
              className="shrink-0 text-xs font-medium text-[var(--primary)] underline-offset-2 hover:underline"
            >
              Esqueci a senha
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={authFieldClass}
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" className="lp-cta h-11 w-full text-[15px]" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Entrando…
            </>
          ) : (
            "Entrar"
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-balance text-[var(--muted-foreground)]">
        Nova empresa?{" "}
        <Link href="/signup" className="font-medium text-[var(--primary)] hover:underline">
          Criar conta com 7 dias grátis
        </Link>
      </p>
      <p className="mt-3 text-center text-xs text-balance text-[var(--muted-foreground)]">
        <Link href="/" className="hover:underline">
          ← Voltar para a página inicial
        </Link>
        {" · "}
        <Link href="/privacidade" className="hover:underline">
          Privacidade
        </Link>
      </p>
    </AuthShell>
  )
}
