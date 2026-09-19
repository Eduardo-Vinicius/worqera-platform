"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { loginService } from "@/lib/apiService"
import { loginV1 } from "@/lib/apiV1"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import { WorqeraLogo } from "@/components/brand/WorqeraLogo"
import { toast } from "sonner"

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Worqera"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    try {
      try {
        await loginV1(email, password)
      } catch (first) {
        const msg = String((first as Error)?.message || "")
        const code = (first as any)?.code
        if (code === "EMAIL_NOT_VERIFIED" || /confirm|e-mail|email not verified/i.test(msg)) {
          toast.error("Confirme seu e-mail antes de entrar")
          window.location.href = `/verify-email?pending=1&email=${encodeURIComponent(email)}`
          return
        }
        if (/failed to fetch|networkerror|load failed/i.test(msg)) {
          throw new Error(
            `Não conectou na API (${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001"}). Confirme make api-dev e abra o front em http://127.0.0.1:3000`
          )
        }
        await loginService(email, password)
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
    <div className="flex min-h-screen">
      <div
        className="relative hidden overflow-hidden lg:flex lg:w-[46%] xl:w-[42%] shrink-0 flex-col justify-between p-10 xl:p-14"
        style={{ background: "#110f17" }}
      >
        <div
          className="pointer-events-none absolute -left-20 top-1/4 h-72 w-72 rounded-full bg-[#7d26de]/30 blur-[100px]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-10 right-0 h-56 w-56 rounded-full bg-[#ae50fd]/20 blur-[90px]"
          aria-hidden
        />

        <div className="relative flex items-center gap-3">
          <WorqeraLogo className="h-10 w-10" />
          <span className="text-xl font-semibold text-white" style={{ fontFamily: "var(--font-display)" }}>
            {APP_NAME}
          </span>
        </div>

        <div className="relative space-y-6">
          <h2
            className="text-4xl xl:text-5xl font-medium leading-tight text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Gestão moderna
            <br />
            <span style={{ color: "#ae50fd" }}>para sua oficina.</span>
          </h2>
          <p className="max-w-xs text-base leading-relaxed text-[#9d9da1]">
            Kanban por setores, pedidos, clientes e métricas — tudo em um painel pensado
            para a rotina do dia a dia.
          </p>
          <div className="flex flex-wrap gap-2">
            {["Kanban setorial", "Rastreio público", "AbacatePay", "Trial 7 dias"].map((f) => (
              <span
                key={f}
                className="rounded-full px-3 py-1 text-xs font-medium"
                style={{ background: "rgba(125,38,222,0.2)", color: "#d4b4ff" }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-[#5c5670]">
          © {new Date().getFullYear()} {APP_NAME}. Todos os direitos reservados.
        </p>
      </div>

      <div
        className="flex flex-1 flex-col items-center justify-center p-6 sm:p-12"
        style={{ background: "var(--wq-paper)" }}
      >
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <WorqeraLogo className="h-9 w-9" />
          <span
            className="text-xl font-semibold"
            style={{ color: "var(--wq-ink)", fontFamily: "var(--font-display)" }}
          >
            {APP_NAME}
          </span>
        </div>

        <div className="w-full max-w-[400px] space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold" style={{ color: "var(--wq-text)" }}>
              Bem-vindo de volta
            </h1>
            <p style={{ color: "var(--wq-text-muted)" }} className="text-sm">
              Entre com suas credenciais para acessar o sistema.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="funcionario@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-[var(--wq-brand)] underline-offset-2 hover:underline"
                >
                  Esqueci a senha
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full text-white"
              disabled={isLoading}
              style={{ background: "var(--wq-brand)" }}
            >
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

          <p className="text-sm text-center" style={{ color: "var(--wq-text-muted)" }}>
            Nova oficina?{" "}
            <Link
              href="/signup"
              className="font-medium hover:underline"
              style={{ color: "var(--wq-brand)" }}
            >
              Criar conta com 7 dias grátis
            </Link>
          </p>
          <p className="text-center text-xs" style={{ color: "var(--wq-text-muted)" }}>
            <Link href="/" className="hover:underline">
              ← Voltar para a página inicial
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
