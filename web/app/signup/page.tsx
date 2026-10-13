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

const BEATS = [
  "O pedido entra na fila.",
  "Passa de etapa sozinho.",
  "O cliente recebe o e-mail.",
  "O estoque baixa na entrega.",
]

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
  const [beat, setBeat] = useState(0)
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

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (media.matches) return
    const timer = window.setInterval(() => {
      setBeat((current) => (current + 1) % BEATS.length)
    }, 2200)
    return () => window.clearInterval(timer)
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
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <WorqeraLogo className="h-7 w-7" />
          <span className="text-sm font-semibold tracking-wide">{APP_NAME}</span>
        </Link>
        <Link href="/login" className="text-xs text-[#5c5852] hover:text-[#121212]">
          Já tenho conta
        </Link>
      </header>

      <main className="mx-auto grid max-w-5xl items-start gap-5 px-4 pb-12 sm:px-6 lg:grid-cols-2 lg:gap-8">
        <section>
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[#5b21b6] uppercase">7 dias grátis · sem cartão</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Comece no plano certo.</h1>
          <p className="mt-2 text-sm text-[#5c5852]">Nada é cobrado agora. No fim dos 7 dias, continua nesse plano ou cancela.</p>
          <p key={beat} className="lp-beat mt-1 text-xs text-[#121212]">{BEATS[beat]}</p>

          <div className="mt-5 grid grid-cols-2 gap-2">
            {(Object.keys(PLANS) as PlanId[]).map((id) => {
              const item = PLANS[id]
              const active = id === plan
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPlan(id)}
                  className={cn(
                    "rounded-xl border bg-white px-3 py-3 text-left transition-colors",
                    active ? "border-[#121212] shadow-[0_10px_30px_-24px_rgba(18,18,18,0.8)]" : "border-[#e4e0d8] hover:border-[#121212]/30"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{item.name}</span>
                    <span className={cn("text-[10px] font-semibold tracking-[0.12em] uppercase", id === "pro" ? "text-[#5b21b6]" : "text-[#5c5852]")}>
                      {id === "pro" ? "Recomendado" : "Começar"}
                    </span>
                  </div>
                  <p className="mt-1 text-lg font-semibold leading-none">
                    {item.price}
                    <span className="ml-1 text-[11px] font-normal text-[#5c5852]">/mês depois</span>
                  </p>
                  <p className="mt-1.5 text-xs leading-snug text-[#5c5852]">{item.line}</p>
                </button>
              )
            })}
          </div>

          <article key={plan} className="lp-day-card mt-3 rounded-xl border border-[#e4e0d8] bg-white px-3.5 py-3">
            <p className="text-[13px] font-medium leading-snug">{chosen.limit}</p>
            <ul className="mt-2.5 space-y-1.5">
              {chosen.items.map((item) => (
                <li key={item} className="flex items-center gap-2 text-[13px]">
                  <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-2.5 text-xs text-[#5c5852]">{chosen.aside}</p>
          </article>

          <p className="mt-3 text-xs text-[#5c5852]">Sem cartão agora · Cancele quando quiser · A empresa é sua</p>
          <p className="mt-2 text-xs text-[#5c5852]">
            Análise, acompanhamento e treinamento?{" "}
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="font-medium text-[#121212] underline underline-offset-2">
              Business é conversa.
            </a>
          </p>
        </section>

        <section className="rounded-2xl border border-[#e4e0d8] bg-white p-4 sm:p-5 lg:sticky lg:top-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-base font-semibold">Seus dados</h2>
            <p className="text-xs text-[#5c5852]">{chosen.name} · {chosen.price}</p>
          </div>
          <p className="mt-0.5 text-xs text-[#5c5852]">Nome, empresa e acesso. O endereço interno a gente cria.</p>

          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <div className="space-y-1">
              <Label htmlFor="name" className="text-xs">Seu nome</Label>
              <Input id="name" required autoComplete="name" placeholder="Ana Souza" className="h-10 bg-[#F6F4F0] text-sm" {...field("name")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="shopName" className="text-xs">Nome da empresa</Label>
              <Input id="shopName" required placeholder="Oficina da Ana" className="h-10 bg-[#F6F4F0] text-sm" {...field("shopName")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email" className="text-xs">E-mail</Label>
              <Input id="email" type="email" required autoComplete="email" placeholder="ana@oficina.com" className="h-10 bg-[#F6F4F0] text-sm" {...field("email")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password" className="text-xs">Senha</Label>
              <Input id="password" type="password" required minLength={6} autoComplete="new-password" placeholder="Mínimo 6 caracteres" className="h-10 bg-[#F6F4F0] text-sm" {...field("password")} />
            </div>

            {partnerCode ? (
              <p className="rounded-lg bg-[#F6F4F0] px-3 py-2 text-xs text-[#5c5852]">
                Indicação <span className="font-mono font-semibold text-[#121212]">{partnerCode}</span>
              </p>
            ) : null}

            <Button type="submit" disabled={loading} className="h-11 w-full bg-[#5b21b6] text-sm text-white hover:bg-[#4c1d95]">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Abrindo sua empresa…
                </>
              ) : (
                `Começar 7 dias no ${chosen.name}`
              )}
            </Button>
            <p className="text-center text-[11px] leading-relaxed text-[#5c5852]">
              {chosen.price}/mês só depois dos 7 dias. Entrar não cobra nada.
            </p>
          </form>
        </section>
      </main>
    </div>
  )
}
