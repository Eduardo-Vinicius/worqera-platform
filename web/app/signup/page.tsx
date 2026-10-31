"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signupV1 } from "@/lib/apiV1"
import { BUSINESS_TYPES } from "@/lib/itemNoun"
import { CHECKOUT_INTENT_KEY, IMPLANTACAO, PLANS as CATALOG, formatBRL } from "@/lib/plans"
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
  encodeURIComponent("Olá! Quero a implantação da Worqera na minha empresa.")

type PlanId = "basic" | "pro" | "business"

const ASIDE: Record<PlanId, { limit: string; aside: string }> = {
  basic: {
    limit: "Até 150 pedidos criados no mês. Passou disso, o próximo pede o Pro.",
    aside: "Sem caixa, sem métricas e sem estoque.",
  },
  pro: { limit: "Pedidos sem limite neste plano.", aside: "Tudo o que a operação usa no dia a dia." },
  business: {
    limit: "Pedidos sem limite. O WhatsApp oficial liga quando a assinatura começar.",
    aside: "No teste, a IA tem 30 usos para você experimentar.",
  },
}

const PLANS = Object.fromEntries(
  CATALOG.map((p) => {
    const id = p.name.toLowerCase() as PlanId
    return [id, { code: p.code, name: p.name, price: formatBRL(p.monthly), line: p.value, items: p.items, ...ASIDE[id] }]
  })
) as Record<PlanId, { code: string; name: string; price: string; line: string; limit: string; items: string[]; aside: string }>

export default function SignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState<PlanId>("pro")
  const [start, setStart] = useState<"trial" | "pay">("trial")
  const [beat, setBeat] = useState(0)
  const [partnerCode, setPartnerCode] = useState("")
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    shopName: "",
  })
  const [kit, setKit] = useState("")

  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search)
      const picked = (q.get("plan") || "").toLowerCase()
      if (picked === "basic" || picked === "pro" || picked === "business") setPlan(picked)
      if (q.get("start") === "pay") setStart("pay")
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
  const person = form.name.trim().split(/\s+/)[0]
  const shop = form.shopName.trim()
  const shopLabel = shop || "sua empresa"

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      try {
        if (start === "pay") localStorage.setItem(CHECKOUT_INTENT_KEY, JSON.stringify({ planCode: chosen.code, cycle: "monthly" }))
        else localStorage.removeItem(CHECKOUT_INTENT_KEY)
      } catch {}
      const data = await signupV1({
        ...form,
        planCode: chosen.code,
        kit: kit || undefined,
        partnerCode: partnerCode || undefined,
        ref: partnerCode || undefined,
      })
      if (data?.requiresEmailVerification) {
        toast.success("Conta criada. Digite o código que enviamos para o seu e-mail.")
        if (data?.devCode) toast.message(`Código (dev): ${data.devCode}`)
        router.push(`/verify-email?pending=1&email=${encodeURIComponent(form.email)}`)
        return
      }
      try {
        localStorage.setItem("wq-needs-onboarding", "1")
      } catch {}
      if (start === "pay") {
        toast.success("Conta criada. Agora é só escolher a forma de pagamento.")
        router.push("/billing")
        return
      }
      toast.success("Conta criada — 7 dias de teste liberados!")
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
    <div className="lp lp-hero-wash min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <WorqeraLogo className="h-8 w-8" />
          <span className="lp-display text-base font-semibold tracking-wide">{APP_NAME}</span>
        </Link>
        <Link href="/login" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--ink)]">
          Já tenho conta
        </Link>
      </header>

      <main className="mx-auto grid max-w-6xl items-start gap-8 px-5 pb-16 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12 lg:pb-20">
        <section className="pt-2 lg:pt-6">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--primary)] uppercase">7 dias com a Worqera · sem cartão</p>
          <h1 className="lp-display mt-3 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
            {person ? `${person}, a sua operação entra hoje.` : "A sua operação entra hoje."}
          </h1>
          <p className="mt-3 max-w-lg text-base leading-relaxed text-[var(--muted-foreground)]">
            Você escolhe o plano, abre a empresa e usa de verdade. No sétimo dia decide se continua. Nada é cobrado para entrar.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {(Object.keys(PLANS) as PlanId[]).map((id) => {
              const item = PLANS[id]
              const active = id === plan
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPlan(id)}
                  className={cn(
                    "rounded-2xl border bg-[var(--surface)] px-4 py-4 text-left transition-colors",
                    active ? "border-[var(--ink)]" : "border-[var(--border)] hover:border-[var(--primary)]"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base font-semibold">{item.name}</span>
                    <span className={cn("text-[10px] font-semibold tracking-[0.14em] uppercase", active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]")}>
                      {id === "pro" ? "Recomendado" : id === "basic" ? "Começar" : "Automático"}
                    </span>
                  </div>
                  <p className="lp-display mt-2 text-2xl font-semibold leading-none">
                    {item.price}
                    <span className="ml-1 text-xs font-normal text-[var(--muted-foreground)]">/mês depois</span>
                  </p>
                  <p className="mt-2 text-sm leading-snug text-[var(--muted-foreground)]">{item.line}</p>
                </button>
              )
            })}
          </div>

          <article key={plan} className="lp-day-card mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
            <p className="text-sm text-[var(--muted-foreground)]">
              {person ? `${person}, ` : ""}
              <span className="font-medium text-[var(--ink)]">{shopLabel}</span> fica no {chosen.name}.
            </p>
            <p key={beat} className="lp-beat mt-2 text-sm text-[var(--ink)]">{BEATS[beat]}</p>
            <p className="mt-4 text-sm font-medium leading-relaxed">{chosen.limit}</p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {chosen.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" strokeWidth={2} />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-[var(--muted-foreground)]">{chosen.aside}</p>

            <ol className="mt-6 grid gap-3 border-t border-[var(--border)] pt-5 sm:grid-cols-3">
              {[
                ["Hoje", "A conta abre. Sem cartão."],
                ["Na semana", "A fila, o pedido e o aviso ao cliente."],
                ["No 7º dia", "Continua neste plano ou cancela."],
              ].map(([when, what]) => (
                <li key={when}>
                  <p className="text-[11px] font-semibold tracking-[0.14em] text-[var(--primary)] uppercase">{when}</p>
                  <p className="mt-1 text-sm leading-snug text-[var(--muted-foreground)]">{what}</p>
                </li>
              ))}
            </ol>
          </article>

          <p className="mt-4 text-sm text-[var(--muted-foreground)]">
            7 dias grátis em qualquer plano. Quer a Worqera montando tudo com você (setores, carga do histórico e treinamento)?{" "}
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="font-medium text-[var(--ink)] underline underline-offset-4">
              Implantação por {formatBRL(IMPLANTACAO)}, uma vez.
            </a>
          </p>
        </section>

        <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.45)] sm:p-7 lg:sticky lg:top-6">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--primary)] uppercase">{chosen.name} · 7 dias</p>
          <h2 className="lp-display mt-2 text-2xl font-semibold tracking-tight">{shop || "Sua empresa"}</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {chosen.price}/mês só se você continuar. O endereço da empresa a gente cria.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Seu nome</Label>
              <Input id="name" required autoComplete="name" placeholder="Ana Souza" className="h-12 border-[var(--border)] bg-[var(--paper)] text-base" {...field("name")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shopName">Nome da empresa</Label>
              <Input id="shopName" required placeholder="Oficina da Ana" className="h-12 border-[var(--border)] bg-[var(--paper)] text-base" {...field("shopName")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kit">O que a sua empresa faz?</Label>
              <select
                id="kit"
                value={kit}
                onChange={(e) => setKit(e.target.value)}
                className="h-12 w-full rounded-md border border-[var(--border)] bg-[var(--paper)] px-3 text-base"
              >
                <option value="">Escolha o ramo (dá para mudar depois)</option>
                {BUSINESS_TYPES.map((b) => (
                  <option key={b.kit} value={b.kit}>
                    {b.label}
                  </option>
                ))}
              </select>
              {kit ? (
                <p className="text-xs text-[var(--muted,#6b7280)]">
                  {BUSINESS_TYPES.find((b) => b.kit === kit)?.hint}. Já criamos as etapas do kanban e os serviços desse ramo.
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required autoComplete="email" placeholder="ana@oficina.com" className="h-12 border-[var(--border)] bg-[var(--paper)] text-base" {...field("email")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" required minLength={6} autoComplete="new-password" placeholder="Mínimo 6 caracteres" className="h-12 border-[var(--border)] bg-[var(--paper)] text-base" {...field("password")} />
            </div>

            {partnerCode ? (
              <p className="rounded-xl bg-[var(--paper)] px-3 py-2 text-sm text-[var(--muted-foreground)]">
                Indicação <span className="font-mono font-semibold text-[var(--ink)]">{partnerCode}</span>
              </p>
            ) : null}

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Como quer começar?</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {([
                  ["trial", "Testar 7 dias grátis", "Sem cartão. Decide no fim do teste."],
                  ["pay", "Assinar agora", "Pix, boleto ou cartão. Os 7 dias continuam valendo."],
                ] as const).map(([id, title, hint]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setStart(id)}
                    aria-pressed={start === id}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-left transition-colors",
                      start === id ? "border-[var(--ink)] bg-[var(--surface)]" : "border-[var(--border)] hover:border-[var(--primary)]"
                    )}
                  >
                    <span className="block text-sm font-semibold">{title}</span>
                    <span className="block text-xs text-[var(--muted-foreground)]">{hint}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <Button type="submit" disabled={loading} className="lp-cta h-12 w-full text-base">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Abrindo {shopLabel}…
                </>
              ) : (
                start === "pay"
                  ? `Criar conta e assinar o ${chosen.name} · ${chosen.price}/mês`
                  : shop
                    ? `Abrir ${shop} no ${chosen.name}`
                    : `Abrir sua empresa no ${chosen.name}`
              )}
            </Button>
            <p className="text-center text-xs leading-relaxed text-[var(--muted-foreground)]">
              {start === "pay"
                ? "A primeira cobrança vence no fim dos 7 dias. Cancele quando quiser."
                : "Sem cartão. Cancele quando quiser. Os dados ficam na sua empresa."}
            </p>
          </form>
        </section>
      </main>
    </div>
  )
}
