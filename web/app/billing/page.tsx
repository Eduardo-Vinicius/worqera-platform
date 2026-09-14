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
      if (session.url?.startsWith("http")) {
        window.location.href = session.url
        return
      }
      // Dev mock pode devolver path relativo ou flag — completa localmente
      await completeCheckoutDevV1()
      toast.success("Assinatura ativada (dev)")
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Falha no checkout")
    } finally {
      setBusy(false)
    }
  }

  const active = sub?.status === "trialing" || sub?.status === "active"

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-lg mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-serif font-bold">Assinatura</h1>
          {active && (
            <Link href="/dashboard">
              <Button variant="outline">Voltar ao portal</Button>
            </Link>
          )}
        </div>

        <Card>
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
            {(products[0] || { name: "Worqera Pro", priceLabel: "Sob consulta" }) && (
              <div className="rounded-lg border p-4 bg-white">
                <p className="font-semibold">{products[0]?.name || "Worqera Pro"}</p>
                <p className="text-sm text-slate-500">
                  {products[0]?.description || "Kanban, pedidos, clientes e indicadores para sua oficina."}
                </p>
                <p className="mt-2 text-lg font-serif">
                  {products[0]?.priceLabel || products[0]?.price || "Plano PRO"}
                </p>
              </div>
            )}
            <Button className="w-full" disabled={busy || sub?.status === "active"} onClick={checkout}>
              {sub?.status === "active" ? "Assinatura ativa" : busy ? "Processando…" : "Assinar com AbacatePay"}
            </Button>
            <p className="text-xs text-slate-400">
              Em desenvolvimento, o checkout pode ativar via simulação local.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
