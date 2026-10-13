"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signupV1 } from "@/lib/apiV1"
import { toast } from "sonner"
import { Check, Loader2 } from "lucide-react"
import { WorqeraLogo } from "@/components/brand/WorqeraLogo"
import { cn } from "@/lib/utils"
import "@/components/landing/landing.css"

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Worqera"
const WHATSAPP =
  "https://wa.me/5511985591053?text=" +
  encodeURIComponent("Olá! Quero o plano Business Worqera (R$ 499).")

type PlanId = "basic" | "pro"

const PLANS: Record<
  PlanId,
  {
    code: string
    name: string
    price: string
    line: string
    limit: string
    items: string[]
    aside: string
  }
> = {
  basic: {
    code: "WORQERA_BASIC",
    name: "Basic",
    price: "R$ 97",
    line: "A fila no ar esta semana.",
    limit: "Até 100 pedidos criados no mês. Passou disso, o próximo pede o Pro.",
    items: ["Kanban por setores", "Cliente consulta sozinho", "TV da oficina"],
    aside: "Sem caixa, sem métricas e sem estoque.",
  },
  pro: {
    code: "WORQERA_PRO",
    name: "Pro",
    price: "R$ 197",
    line: "A oficina inteira, sem teto.",
    limit: "Pedidos sem limite neste plano.",
    items: ["Financeiro e métricas", "TV financeiro", "Marca da empresa", "Produtos, estoque e vendas"],
    aside: "Tudo o que a operação usa no dia a dia.",
  },
}

export default function SignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState<PlanId>("pro")
  const [partnerCode, setPartnerCode] = useState("")
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    shopName: "",
  })

  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search)
      const picked = (q.get("plan") || "").toLowerCase()
      if (picked === "basic" || picked === "pro") setPlan(picked)
      const ref = q.get("ref") || q.get("partner") || ""
      if (ref) setPartnerCode(ref.toUpperCase())
    } catch {}
  }, [])

  const chosen = PLANS[plan]

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await signupV1({
        ...form,
        planCode: chosen.code,
        partnerCode: partnerCode || undefined,
        ref: partnerCode || undefined,
      })
      if (data?.requiresEmailVerification) {
        toast.success("Conta criada — confira seu e-mail para confirmar")
        router.push(`/verify-email?pending=1&email=${encodeURIComponent(form.email)}`)
        return
      }
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
      setForm((current) => ({ ...current, [key]: e.target.value })),
  })

  return (
    <div className="lp min-h-screen bg-[#F6F4F0] text-[#121212]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <WorqeraLogo className="h-8 w-8" />
          <span className="text-lg font-semibold tracking-wide">{APP_NAME}</span>
        </Link>
        <Link href="/login" className="text-sm text-[#5c5852] hover:text-[#121212]">
          Já tenho conta
        </Link>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-4 pb-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
        <section>
          <p className="text-xs font-semibold tracking-[0.18em] text-[#5b21b6] uppercase">7 dias grátis · sem cartão</p>
          <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">Comece no plano certo.</h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-[#5c5852]">
            Nada é cobrado agora. Você escolhe Basic ou Pro, cria a empresa e entra. No fim dos 7 dias, continua nesse plano ou cancela.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {(Object.keys(PLANS) as PlanId[]).map((id) => {
              const item = PLANS[id]
              const active = id === plan
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPlan(id)}
                  className={cn(
                    "rounded-2xl border bg-white p-4 text-left transition-colors",
                    active ? "border-[#121212]" : "border-[#e4e0d8] hover:border-[#121212]/40"
                  )}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-lg font-semibold">{item.name}</span>
                    {id === "pro" ? (
                      <span className="text-[10px] font-semibold tracking-[0.14em] text-[#5b21b6] uppercase">Recomendado</span>
                    ) : (
                      <span className="text-[10px] font-semibold tracking-[0.14em] text-[#5c5852] uppercase">Começar</span>
                    )}
                  </div>
                  <p className="mt-2 text-2xl font-semibold">{item.price}<span className="text-sm font-normal text-[#5c5852]">/mês depois</span></p>
                  <p className="mt-1 text-sm text-[#5c5852]">{item.line}</p>
                </button>
              )
            })}
          </div>

          <article key={plan} className="lp-day-card mt-4 rounded-2xl border border-[#e4e0d8] bg-white p-5">
            <p className="text-sm font-medium">{chosen.limit}</p>
            <ul className="mt-4 space-y-2">
              {chosen.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-[#5c5852]">{chosen.aside}</p>
          </article>

          <ul className="mt-6 grid gap-2 text-sm text-[#5c5852] sm:grid-cols-3">
            <li>Sem cartão agora</li>
            <li>Cancele quando quiser</li>
            <li>A empresa é sua</li>
          </ul>

          <p className="mt-6 text-sm text-[#5c5852]">
            Quer a Worqera no dia a dia, com análise, acompanhamento e treinamento?{" "}
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="font-medium text-[#121212] underline underline-offset-4">
              Business é conversa.
            </a>
          </p>
        </section>

        <section className="rounded-3xl border border-[#e4e0d8] bg-white p-5 sm:p-7">
          <h2 className="text-xl font-semibold">Seus dados</h2>
          <p className="mt-1 text-sm text-[#5c5852]">Nome, empresa e o acesso. O endereço interno a gente cria.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Seu nome</Label>
              <Input id="name" required autoComplete="name" placeholder="Ana Souza" className="h-11 bg-[#F6F4F0]" {...field("name")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shopName">Nome da empresa</Label>
              <Input id="shopName" required placeholder="Oficina da Ana" className="h-11 bg-[#F6F4F0]" {...field("shopName")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required autoComplete="email" placeholder="ana@oficina.com" className="h-11 bg-[#F6F4F0]" {...field("email")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" required minLength={6} autoComplete="new-password" placeholder="Mínimo 6 caracteres" className="h-11 bg-[#F6F4F0]" {...field("password")} />
            </div>

            {partnerCode ? (
              <p className="rounded-xl bg-[#F6F4F0] px-3 py-2 text-xs text-[#5c5852]">
                Indicação <span className="font-mono font-semibold text-[#121212]">{partnerCode}</span>
              </p>
            ) : null}

            <Button type="submit" disabled={loading} className="h-12 w-full bg-[#5b21b6] text-base text-white hover:bg-[#4c1d95]">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Abrindo sua empresa…
                </>
              ) : (
                `Começar 7 dias no ${chosen.name}`
              )}
            </Button>
            <p className="text-center text-xs leading-relaxed text-[#5c5852]">
              Plano {chosen.name} · {chosen.price}/mês depois do trial. Você não paga nada para entrar.
            </p>
          </form>
        </section>
      </main>
    </div>
  )
}
