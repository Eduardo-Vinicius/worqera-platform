"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { acceptInviteV1, getInviteV1 } from "@/lib/apiV1"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

export default function InviteAcceptPage() {
  const params = useParams()
  const router = useRouter()
  const token = String(params?.token || "")

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [invite, setInvite] = useState<{
    email: string
    role: string
    shop?: { name?: string } | null
  } | null>(null)
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")

  useEffect(() => {
    if (!token) {
      setError("Token inválido")
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError("")
      try {
        const data = await getInviteV1(token)
        if (!cancelled) setInvite(data)
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Convite inválido ou expirado")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setSubmitting(true)
    setError("")
    try {
      await acceptInviteV1(token, { name: name.trim(), password })
      router.push("/login")
    } catch (err: any) {
      setError(err?.message || "Falha ao aceitar convite")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--wq-paper)] p-6">
      <div className="w-full max-w-md rounded-2xl border border-[var(--wq-border)] bg-white p-6">
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--wq-text)]">
          Aceitar convite
        </h1>
        {invite?.shop?.name && (
          <p className="mt-1 text-sm text-[var(--wq-text-muted)]">
            {invite.shop.name}
            {invite.role ? ` · ${invite.role}` : ""}
          </p>
        )}

        {error && (
          <Alert className="mt-4 border-[var(--wq-danger)]/30 bg-[var(--wq-danger)]/5">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <p className="mt-6 flex items-center gap-2 text-sm text-[var(--wq-text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando convite…
          </p>
        ) : invite ? (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input className="rounded-[10px]" value={invite.email} disabled />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Seu nome</Label>
              <Input
                id="name"
                className="rounded-[10px]"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                minLength={6}
                className="rounded-[10px]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full rounded-[10px] bg-[var(--wq-action)] hover:bg-[var(--wq-action)]/90"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar acesso"}
            </Button>
          </form>
        ) : (
          <div className="mt-6">
            <Button asChild variant="outline" className="rounded-[10px]">
              <Link href="/login">Voltar ao login</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
