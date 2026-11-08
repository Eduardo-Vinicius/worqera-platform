"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { resendVerificationV1, verifyEmailV1 } from "@/lib/apiV1"
import { Loader2, MailCheck } from "lucide-react"
import { toast } from "sonner"
import { AuthShell, authFieldClass } from "@/components/auth/AuthShell"

function enterApp(platformAdmin?: boolean) {
  try {
    localStorage.setItem("wq-needs-onboarding", "1")
  } catch {}
  let wantsToPay = false
  try {
    wantsToPay = Boolean(localStorage.getItem("wq-checkout-intent"))
  } catch {}
  window.location.href = platformAdmin ? "/admin/shops" : wantsToPay ? "/billing" : "/onboarding"
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
    <AuthShell>
      <div>
        <h1 className="lp-display text-2xl font-semibold tracking-tight text-[var(--ink)]">Confirme seu e-mail</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">Último passo para abrir a conta</p>
      </div>

      {status === "loading" ? (
        <p className="mt-6 flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
          <Loader2 className="h-4 w-4 animate-spin" /> Confirmando…
        </p>
      ) : status === "ok" ? (
        <p className="mt-6 flex items-center gap-2 rounded-xl bg-[var(--brand-soft)] px-3 py-2.5 text-sm">
          <MailCheck className="h-4 w-4 text-[var(--primary)]" /> {message}
        </p>
      ) : (
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void confirm()
          }}
        >
          <div className="flex gap-2 rounded-xl bg-[var(--brand-soft)] px-3 py-2.5 text-sm text-[var(--ink)]">
            <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
            <p>
              Enviamos um código de 6 números para <strong>{email || "o seu e-mail"}</strong>. Digite abaixo ou toque no
              botão do e-mail. Não chegou? Olhe o spam.
            </p>
          </div>

          {!emailParam ? (
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail do cadastro</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                className={authFieldClass}
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
              className={`${authFieldClass} h-14 text-center font-mono text-2xl tracking-[0.5em]`}
              value={code}
              onChange={(e) => {
                const next = e.target.value.replace(/\D/g, "").slice(0, 6)
                setCode(next)
                if (next.length === 6) void confirm(next)
              }}
              placeholder="••••••"
            />
          </div>

          {message ? <p className="text-sm text-[var(--late)]">{message}</p> : null}

          <Button
            type="submit"
            className="lp-cta h-12 w-full text-base"
            disabled={busy || code.length !== 6}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar e entrar"}
          </Button>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              className="font-medium text-[var(--primary)] hover:underline disabled:opacity-50 disabled:no-underline"
              disabled={resending || cooldown > 0}
              onClick={resend}
            >
              {cooldown > 0 ? `Reenviar em ${cooldown}s` : resending ? "Enviando…" : "Reenviar código"}
            </button>
            <Link href="/login" className="text-[var(--muted-foreground)] hover:underline">
              Voltar ao login
            </Link>
          </div>
        </form>
      )}
    </AuthShell>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <AuthShell>
          <p className="text-center text-sm text-[var(--muted-foreground)]">Carregando…</p>
        </AuthShell>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  )
}
