"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { resendVerificationV1, verifyEmailV1 } from "@/lib/apiV1"
import { WorqeraLogo } from "@/components/brand/WorqeraLogo"
import { Loader2, MailCheck } from "lucide-react"
import { toast } from "sonner"

function VerifyEmailInner() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get("token") || ""
  const pending = params.get("pending") === "1"
  const emailParam = params.get("email") || ""

  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">(
    token ? "loading" : pending ? "idle" : "idle"
  )
  const [message, setMessage] = useState(
    pending
      ? "Enviamos um link de confirmação. Abra o e-mail e clique para ativar a conta."
      : "Cole o link do e-mail ou aguarde a verificação automática."
  )
  const [email, setEmail] = useState(emailParam)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    ;(async () => {
      try {
        await verifyEmailV1(token)
        if (cancelled) return
        setStatus("ok")
        setMessage("E-mail confirmado. Você já pode entrar.")
        toast.success("E-mail confirmado")
        try {
          localStorage.setItem("wq-needs-onboarding", "1")
        } catch {}
        setTimeout(() => router.push("/login"), 1200)
      } catch (err: any) {
        if (cancelled) return
        setStatus("error")
        setMessage(err?.message || "Link inválido ou expirado")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, router])

  const resend = async () => {
    if (!email.trim()) {
      toast.error("Informe o e-mail")
      return
    }
    setBusy(true)
    try {
      await resendVerificationV1(email.trim())
      toast.success("Se a conta existir, reenviamos o link")
    } catch (err: any) {
      toast.error(err?.message || "Falha ao reenviar")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--wq-paper)] px-4">
      <div className="w-full max-w-md space-y-5 rounded-2xl border border-[var(--wq-border)] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <WorqeraLogo className="h-9 w-9" />
          <div>
            <p className="font-[family-name:var(--font-display)] text-lg">Confirmar e-mail</p>
            <p className="text-xs text-[var(--wq-text-muted)]">Worqera</p>
          </div>
        </div>

        {status === "loading" ? (
          <p className="flex items-center gap-2 text-sm text-[var(--wq-text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Confirmando…
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2 rounded-xl bg-[var(--wq-brand-soft)]/40 px-3 py-2.5 text-sm text-[var(--wq-text)]">
              <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--wq-brand)]" />
              <p>{message}</p>
            </div>

            {(status === "error" || pending || !token) && (
              <div className="space-y-2">
                <Label htmlFor="email">Reenviar confirmação</Label>
                <Input
                  id="email"
                  type="email"
                  className="rounded-[10px]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-[10px]"
                  disabled={busy}
                  onClick={resend}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reenviar e-mail"}
                </Button>
              </div>
            )}

            <Button asChild className="w-full rounded-[10px] bg-[var(--wq-action)] hover:bg-[var(--wq-action)]/90">
              <Link href="/login">Ir para o login</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-[var(--wq-text-muted)]">
          Carregando…
        </div>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  )
}
