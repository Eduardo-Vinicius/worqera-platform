"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { resendVerificationV1, verifyEmailV1 } from "@/lib/apiV1"
import { WorqeraLogo } from "@/components/brand/WorqeraLogo"
import { Loader2, MailCheck } from "lucide-react"
import { toast } from "sonner"

function enterApp(platformAdmin?: boolean) {
  try {
    localStorage.setItem("wq-needs-onboarding", "1")
  } catch {}
  window.location.href = platformAdmin ? "/admin/shops" : "/onboarding"
}

function VerifyEmailInner() {
  const params = useSearchParams()
  const token = params.get("token") || ""
  const emailParam = params.get("email") || ""

  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">(token ? "loading" : "idle")
  const [message, setMessage] = useState("")
  const [email, setEmail] = useState(emailParam)
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [resending, setResending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const codeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    ;(async () => {
      try {
        const data = await verifyEmailV1({ token })
        if (cancelled) return
        setStatus("ok")
        setMessage("E-mail confirmado. Abrindo a sua conta…")
        toast.success("E-mail confirmado")
        setTimeout(() => enterApp(data?.platformAdmin), 900)
      } catch (err: any) {
        if (cancelled) return
        setStatus("error")
        setMessage(err?.message || "Link inválido ou expirado. Use o código do e-mail ou peça outro.")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const confirm = async (value = code) => {
    const digits = value.replace(/\D/g, "")
    if (!email.trim()) {
      toast.error("Informe o e-mail do cadastro")
      return
    }
    if (digits.length !== 6) {
      toast.error("O código tem 6 números")
      return
    }
    setBusy(true)
    setMessage("")
    try {
      const data = await verifyEmailV1({ email: email.trim(), code: digits })
      setStatus("ok")
      setMessage("E-mail confirmado. Abrindo a sua conta…")
      toast.success("E-mail confirmado")
      enterApp(data?.platformAdmin)
    } catch (err: any) {
      setStatus("error")
      setMessage(err?.message || "Código inválido")
      setCode("")
      codeRef.current?.focus()
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    if (!email.trim()) {
      toast.error("Informe o e-mail do cadastro")
      return
    }
    setResending(true)
    try {
      const res = await resendVerificationV1(email.trim())
      if (res.alreadyVerified) {
        toast.success("Esse e-mail já está confirmado. Entre com a sua senha.")
        return
      }
      setCooldown(res.retryIn || 60)
      if (res.throttled) toast.message(`Aguarde ${res.retryIn}s para pedir outro código`)
      else toast.success("Enviamos um código novo")
      if (res.devCode) toast.message(`Código (dev): ${res.devCode}`)
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível reenviar")
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--wq-paper)] px-4">
      <div className="w-full max-w-md space-y-5 rounded-2xl border border-[var(--wq-border)] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <WorqeraLogo className="h-9 w-9" />
          <div>
            <p className="font-[family-name:var(--font-display)] text-lg">Confirme seu e-mail</p>
            <p className="text-xs text-[var(--wq-text-muted)]">Último passo para abrir a conta</p>
          </div>
        </div>

        {status === "loading" ? (
          <p className="flex items-center gap-2 text-sm text-[var(--wq-text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Confirmando…
          </p>
        ) : status === "ok" ? (
          <p className="flex items-center gap-2 rounded-xl bg-[var(--wq-brand-soft)]/40 px-3 py-2.5 text-sm">
            <MailCheck className="h-4 w-4 text-[var(--wq-brand-text)]" /> {message}
          </p>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              void confirm()
            }}
          >
            <div className="flex gap-2 rounded-xl bg-[var(--wq-brand-soft)]/40 px-3 py-2.5 text-sm text-[var(--wq-text)]">
              <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--wq-brand-text)]" />
              <p>
                Enviamos um código de 6 números para{" "}
                <strong>{email || "o seu e-mail"}</strong>. Digite abaixo ou toque no botão do e-mail.
                Não chegou? Olhe o spam.
              </p>
            </div>

            {!emailParam ? (
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail do cadastro</Label>
                <Input
                  id="email"
                  type="email"
                  className="rounded-[10px]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                />
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="code">Código</Label>
              <Input
                id="code"
                ref={codeRef}
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                className="h-14 rounded-[12px] text-center font-mono text-2xl tracking-[0.5em]"
                value={code}
                onChange={(e) => {
                  const next = e.target.value.replace(/\D/g, "").slice(0, 6)
                  setCode(next)
                  if (next.length === 6) void confirm(next)
                }}
                placeholder="••••••"
              />
            </div>

            {message ? <p className="text-sm text-[var(--wq-danger)]">{message}</p> : null}

            <Button
              type="submit"
              className="w-full rounded-[10px] bg-[var(--wq-action)] hover:bg-[var(--wq-action)]/90"
              disabled={busy || code.length !== 6}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar e entrar"}
            </Button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                className="font-medium text-[var(--wq-brand-text)] hover:underline disabled:opacity-50 disabled:no-underline"
                disabled={resending || cooldown > 0}
                onClick={resend}
              >
                {cooldown > 0 ? `Reenviar em ${cooldown}s` : resending ? "Enviando…" : "Reenviar código"}
              </button>
              <Link href="/login" className="text-[var(--wq-text-muted)] hover:underline">
                Voltar ao login
              </Link>
            </div>
          </form>
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
