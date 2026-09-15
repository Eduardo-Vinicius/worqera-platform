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
    <div className="flex min-h-screen items-center justify-center bg-[var(--wq-paper)] p-6">
      <div className="w-full max-w-md rounded-2xl border border-[var(--wq-border)] bg-white p-6">
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--wq-text)]">
          Nova senha
        </h1>
        {error && (
          <Alert className="mt-4 border-[var(--wq-danger)]/30 bg-[var(--wq-danger)]/5">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {done ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-[var(--wq-text)]">Senha atualizada.</p>
            <Button asChild className="w-full rounded-[10px] bg-[var(--wq-action)]">
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
                className="rounded-[10px] font-mono text-xs"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Nova senha</Label>
              <Input
                id="password"
                type="password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-[10px]"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-[10px] bg-[var(--wq-action)] hover:bg-[var(--wq-action)]/90"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar senha"}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-sm text-[var(--wq-text-muted)]">…</p>}>
      <ResetInner />
    </Suspense>
  )
}
