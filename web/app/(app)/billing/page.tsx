"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  completeCheckoutDevV1,
  createCheckoutSessionV1,
  getBillingProductsV1,
  getSubscriptionV1,
} from "@/lib/apiV1"
import { toast } from "sonner"
import { AppHeader } from "@/components/shell/AppHeader"

export default function BillingPage() {
  const [sub, setSub] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [s, p] = await Promise.all([getSubscriptionV1(), getBillingProductsV1()])
      setSub(s.subscription)
      setProducts(p.products || [])
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

  return (
    <div className="-mx-5 -mt-6 md:-mx-8 md:-mt-7">
      <AppHeader
        title="Assinatura"
        subtitle="Trial e plano Worqera Pro"
        actions={
          !locked ? (
            <Button asChild variant="outline" size="sm" className="rounded-[10px]">
              <Link href="/dashboard">Portal</Link>
            </Button>
          ) : undefined
        }
      />

      <div className="mx-auto max-w-lg space-y-4 px-5 py-6 md:px-8">
        {locked && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
            Operações (kanban, pedidos, clientes) estão bloqueadas até a assinatura estar ativa.
          </div>
        )}
        <Card className="rounded-2xl border-[var(--wq-border)] shadow-none">
          <CardHeader>
            <CardTitle>Status</CardTitle>
            <CardDescription>
              {loading
                ? "Carregando…"
                : sub
                  ? `${sub.status}${sub.trialEndsAt ? ` · trial até ${new Date(sub.trialEndsAt).toLocaleDateString("pt-BR")}` : ""}`
                  : "Sem assinatura"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-[var(--wq-border)] bg-[var(--wq-paper)] p-4">
              <p className="font-semibold">{products[0]?.name || "Worqera Pro"}</p>
              <p className="text-sm text-[var(--wq-text-muted)]">
                {products[0]?.description || "Kanban, pedidos, clientes e indicadores para sua oficina."}
              </p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-lg">
                {products[0]?.priceLabel || products[0]?.price || "Plano PRO"}
              </p>
            </div>
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
                    ? "Solicitar ativação"
                    : "Ativar plano"}
            </Button>
            <p className="text-xs text-[var(--wq-text-muted)]">
              AbacatePay está desligado em produção por enquanto. Fale com a Worqera para ativar
              a assinatura ou estender o trial. Em dev, o checkout pode simular ativação local.
            </p>
            <Button asChild variant="outline" className="w-full rounded-[11px]">
              <a
                href="https://wa.me/5511999999999?text=Ol%C3%A1%2C%20quero%20ativar%20o%20Worqera"
                target="_blank"
                rel="noopener noreferrer"
              >
                Falar com a Worqera no WhatsApp
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
