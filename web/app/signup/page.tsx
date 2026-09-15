"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signupV1 } from "@/lib/apiV1"
import { toast } from "sonner"
import { Loader2, CheckCircle2 } from "lucide-react"
import { WorqeraLogo } from "@/components/brand/WorqeraLogo"

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Worqera"

const FEATURES = [
  "Kanban por setores configuráveis",
  "Rastreio público por código",
  "Gestão de clientes e pedidos",
  "Painel financeiro (admin)",
]

export default function SignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    shopName: "",
    shopSlug: "",
  })
  const [partnerCode, setPartnerCode] = useState("")

  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search)
      const ref = q.get("ref") || q.get("partner") || ""
      if (ref) setPartnerCode(ref.toUpperCase())
    } catch {}
  }, [])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await signupV1({
        ...form,
        shopSlug: form.shopSlug || undefined,
        partnerCode: partnerCode || undefined,
        ref: partnerCode || undefined,
      })
      try {
        localStorage.setItem("wq-needs-onboarding", "1")
      } catch {}
      toast.success("Conta criada — 7 dias de trial liberados!")
      router.push("/onboarding")
    } catch (err: any) {
      toast.error(err?.message || "Falha no cadastro")
    } finally {
      setLoading(false)
    }
  }

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  })

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
          <span
            className="text-xl font-semibold text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {APP_NAME}
          </span>
        </div>

        <div className="relative space-y-6">
          <h2
            className="text-4xl xl:text-5xl font-medium leading-tight text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            7 dias grátis
            <br />
            <span style={{ color: "#ae50fd" }}>sem cartão.</span>
          </h2>
          <p className="max-w-xs text-base leading-relaxed text-[#9d9da1]">
            Cadastre sua oficina e explore todas as funcionalidades durante o período de trial.
          </p>

          <ul className="space-y-2">
            {FEATURES.map((feat) => (
              <li key={feat} className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "#ae50fd" }} />
                <span className="text-sm text-[#cfcfd4]">{feat}</span>
              </li>
            ))}
          </ul>
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
              Criar conta
            </h1>
            <p style={{ color: "var(--wq-text-muted)" }} className="text-sm">
              7 dias grátis para testar o kanban e a gestão da sua oficina.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="shopName">Nome da empresa</Label>
              <Input
                id="shopName"
                required
                placeholder="Ex.: Oficina do Zé"
                className="bg-white"
                {...field("shopName")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="shopSlug">Slug (sua frase na URL)</Label>
              <Input
                id="shopSlug"
                placeholder="ex.: oficina-do-ze"
                className="bg-white"
                {...field("shopSlug")}
              />
              <p className="text-xs text-[var(--wq-text-muted)]">
                Consulta pública: /p/{form.shopSlug || "seu-slug"}/CODIGO
              </p>
            </div>

            {partnerCode ? (
              <p className="rounded-lg border border-[var(--wq-border)] bg-[var(--wq-paper)] px-3 py-2 text-xs text-[var(--wq-text-muted)]">
                Código de parceiro: <span className="font-mono font-semibold text-[var(--wq-text)]">{partnerCode}</span>
              </p>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="name">Seu nome</Label>
              <Input
                id="name"
                required
                placeholder="Nome completo"
                className="bg-white"
                {...field("name")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                required
                placeholder="voce@email.com"
                className="bg-white"
                {...field("email")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
                className="bg-white"
                {...field("password")}
              />
            </div>

            <Button
              type="submit"
              className="w-full text-white"
              disabled={loading}
              style={{ background: "var(--wq-brand)" }}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando conta…
                </>
              ) : (
                "Começar trial de 7 dias"
              )}
            </Button>
          </form>

          <p className="text-sm text-center" style={{ color: "var(--wq-text-muted)" }}>
            Já tem conta?{" "}
            <Link
              href="/login"
              className="font-medium hover:underline"
              style={{ color: "var(--wq-brand)" }}
            >
              Entrar
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
