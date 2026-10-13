"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  completeCheckoutDevV1,
  createCheckoutSessionV1,
  getSubscriptionV1,
} from "@/lib/apiV1"
import { toast } from "sonner"
import { AppHeader } from "@/components/shell/AppHeader"
import { Check, CreditCard } from "lucide-react"

export default function BillingPage() {
  const [sub, setSub] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const s = await getSubscriptionV1()
      setSub(s.subscription)
    } catch (err: any) {
      toast.error(err?.message || "Erro ao carregar billing")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const checkout = async () => {
    setBusy(true)
    try {
      const session = await createCheckoutSessionV1()
      if (session.provider === "manual" || session.configured === false || !session.url) {
        toast.message(session.message || "Pagamento online desligado. Fale com a Worqera.")
        return
      }
      if (session.url?.startsWith("http")) {
        window.location.href = session.url
        return
      }
      await completeCheckoutDevV1()
      toast.success("Assinatura ativada (dev)")
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Falha no checkout")
    } finally {
      setBusy(false)
    }
  }

  const locked =
    sub &&
    (sub.status === "expired" ||
      sub.status === "canceled" ||
      sub.status === "past_due" ||
      (sub.status === "trialing" &&
        sub.trialEndsAt &&
        new Date(sub.trialEndsAt).getTime() < Date.now()))

  const trialLeft =
    sub?.status === "trialing" && sub?.trialEndsAt
      ? Math.max(0, Math.ceil((new Date(sub.trialEndsAt).getTime() - Date.now()) / 86400000))
      : null

  const planCode =
    sub?.planCode === "WORQERA_PREMIUM" ? "WORQERA_BUSINESS" : sub?.planCode || ""
  const catalog: Record<string, { name: string; price: string; description: string; short: string }> = {
    WORQERA_BASIC: {
      name: "Worqera Basic",
      short: "Basic",
      price: "Basic · R$ 97/mês",
      description: "A fila no ar. Até 100 pedidos no mês, sem caixa, sem métricas e sem estoque.",
    },
    WORQERA_PRO: {
      name: "Worqera Pro",
      short: "Pro",
      price: "Pro · R$ 197/mês",
      description: "A oficina inteira, sem teto: financeiro, métricas, marca, produtos e estoque.",
    },
    WORQERA_BUSINESS: {
      name: "Worqera Business",
      short: "Business",
      price: "Business · R$ 499/mês",
      description: "Análises com IA, acompanhamento semanal, integração e treinamento. Tudo do Pro.",
    },
  }
  const current = catalog[planCode] || (loading ? null : catalog.WORQERA_PRO)

  const includes = [
    "Kanban por setores ilimitado",
    "Pedidos, clientes e consultas",
    "TVs Cliente e Oficina",
    "Equipe com papéis (owner, admin, setor)",
    "Pagamento seguro via AbacatePay",
  ]

  return (
    <div className="-mx-3 -mt-4 sm:-mx-5 sm:-mt-6 md:-mx-8 md:-mt-7">
      <AppHeader
        title="Plano e assinatura"
        subtitle="Basic R$ 97 · Pro R$ 197 · Business R$ 499"
        actions={
          !locked ? (
            <Button asChild variant="outline" size="sm" className="rounded-[10px]">
              <Link href="/dashboard">Portal</Link>
            </Button>
          ) : undefined
        }
      />

      <div className="mx-auto max-w-lg space-y-4 px-3 py-4 sm:px-5 sm:py-6 md:px-8">
        {locked && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
            Operações (kanban, pedidos, clientes) estão bloqueadas até a assinatura estar ativa.
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          {[
            {
              name: "Basic",
              price: "R$ 97",
              line: "Até 100 pedidos",
              tone: "border-sky-300 bg-sky-50 text-sky-900",
            },
            {
              name: "Pro",
              price: "R$ 197",
              line: "Sem teto",
              tone: "border-violet-300 bg-violet-50 text-violet-900",
            },
            {
              name: "Business",
              price: "R$ 499",
              line: "Com a Worqera",
              tone: "border-amber-300 bg-amber-50 text-amber-950",
            },
          ].map((p) => (
            <div
              key={p.name}
              className={`rounded-xl border px-2 py-2.5 text-center ${p.tone} ${
                current?.short === p.name ? "ring-2 ring-[var(--wq-text)] ring-offset-2" : ""
              }`}
            >
              <p className="text-[11px] font-bold uppercase tracking-wide">{p.name}</p>
              <p className="font-mono text-sm font-semibold">{p.price}</p>
              <p className="mt-0.5 text-[10px] leading-tight">{p.line}</p>
            </div>
          ))}
        </div>

        <Card className="rounded-2xl border-[var(--wq-border)] shadow-none">
          <CardHeader>
            <CardTitle>Status</CardTitle>
            <CardDescription className="break-words">
              {loading
                ? "Carregando…"
                : sub
                  ? `${sub.status}${
                      trialLeft != null
                        ? ` · ${trialLeft} dia${trialLeft === 1 ? "" : "s"} restantes`
                        : sub.trialEndsAt
                          ? ` · trial até ${new Date(sub.trialEndsAt).toLocaleDateString("pt-BR")}`
                          : ""
                    }`
                  : "Sem assinatura"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border-2 border-[var(--wq-brand)]/30 bg-[var(--wq-brand-soft)]/40 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--wq-brand-text)]">
                Seu plano
              </p>
              <p className="font-semibold">{current?.name || "Carregando…"}</p>
              <p className="text-sm text-[var(--wq-text-muted)]">
                {current?.description || "O plano aplicado nesta empresa."}
              </p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-lg">
                {current?.price || ""}
              </p>
            </div>

            <ul className="space-y-2">
              {includes.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-[var(--wq-text)]">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--wq-brand-text)]" />
                  <span className="min-w-0 break-words">{item}</span>
                </li>
              ))}
            </ul>

            <Button
              className="w-full rounded-[11px] bg-[var(--wq-brand)] hover:bg-[var(--wq-brand-deep)]"
              disabled={busy || sub?.status === "active"}
              onClick={checkout}
            >
              {sub?.status === "active"
                ? "Assinatura ativa"
                : busy
                  ? "Processando…"
                  : locked
                    ? "Assinar agora"
                    : "Ativar plano"}
            </Button>

            <p className="mt-2 text-sm text-[var(--wq-text-muted)]">
              Basic R$ 97 · Pro R$ 197/mês · Business R$ 499. Cobrança via AbacatePay ou PIX.
              Indique pelo link em Empresa (?ref=) — 1 mês grátis quando a oficina assinar.
            </p>

            <Button asChild variant="outline" className="w-full rounded-[11px]">
              <a
                href="https://wa.me/5511985591053?text=Ol%C3%A1%2C%20quero%20ativar%20o%20Worqera"
                target="_blank"
                rel="noopener noreferrer"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Falar com a Worqera no WhatsApp
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
