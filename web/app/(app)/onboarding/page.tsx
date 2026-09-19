"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AppHeader } from "@/components/shell/AppHeader"
import { Button } from "@/components/ui/button"
import {
  createDemoOrderV1,
  listSectorsV1,
  patchShopCurrentV1,
  seedShopCatalogV1,
} from "@/lib/apiV1"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

type Sector = { _id: string; name: string; order?: number; active?: boolean }

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [sectors, setSectors] = useState<Sector[]>([])
  const [loadingSectors, setLoadingSectors] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingSectors(true)
      try {
        const res = await listSectorsV1()
        if (!cancelled) {
          setSectors(
            (res.sectors || [])
              .filter((s: Sector) => s.active !== false)
              .sort((a: Sector, b: Sector) => (a.order || 0) - (b.order || 0))
          )
        }
      } catch (err: any) {
        if (!cancelled) toast.error(err?.message || "Erro ao carregar setores")
      } finally {
        if (!cancelled) setLoadingSectors(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const finish = async (dest = "/dashboard") => {
    setBusy(true)
    try {
      await patchShopCurrentV1({ onboardingComplete: true })
      try {
        localStorage.removeItem("wq-needs-onboarding")
      } catch {}
      toast.success("Pode configurar o resto quando quiser")
      router.push(dest)
    } catch (err: any) {
      toast.error(err?.message || "Falha ao concluir")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="-mx-3 -mt-4 sm:-mx-5 sm:-mt-6 md:-mx-8 md:-mt-7">
      <AppHeader
        title="Bem-vindo ao Worqera"
        subtitle="2 passos rápidos — o resto você configura depois"
        actions={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-[10px] text-[var(--wq-text-muted)]"
            disabled={busy}
            onClick={() => finish("/dashboard")}
          >
            Configurar depois
          </Button>
        }
      />

      <div className="mx-auto max-w-[520px] space-y-6 px-5 py-8 md:px-8">
        <div className="flex gap-2">
          {[1, 2].map((n) => (
            <div
              key={n}
              className={`h-1.5 flex-1 rounded-full ${
                n <= step ? "bg-[var(--wq-brand)]" : "bg-[var(--wq-border)]"
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4 rounded-2xl border border-[var(--wq-border)] bg-white p-5">
            <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--wq-text)]">
              1. Seu kanban já tem setores
            </h2>
            <p className="text-sm text-[var(--wq-text-muted)]">
              Criamos um fluxo inicial. Você pode renomear ou mudar em{" "}
              <strong className="font-medium text-[var(--wq-text)]">Setores</strong> depois —
              sem pressa.
            </p>
            {loadingSectors ? (
              <p className="text-sm text-[var(--wq-text-muted)]">Carregando…</p>
            ) : (
              <ul className="space-y-1.5">
                {sectors.map((s, i) => (
                  <li
                    key={String(s._id)}
                    className="flex items-center gap-2 rounded-xl border border-[var(--wq-border)] px-3 py-2 text-sm"
                  >
                    <span className="text-xs text-[var(--wq-text-muted)]">{i + 1}.</span>
                    <span className="font-medium">{s.name}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                className="rounded-[10px] bg-[var(--wq-action)] hover:bg-[var(--wq-action)]/90"
                onClick={() => setStep(2)}
              >
                Continuar
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-[10px]"
                disabled={busy}
                onClick={() => finish("/settings/setores")}
              >
                Ir para Setores e sair do tour
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 rounded-2xl border border-[var(--wq-border)] bg-white p-5">
            <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--wq-text)]">
              2. Ver o kanban funcionando
            </h2>
            <p className="text-sm text-[var(--wq-text-muted)]">
              Gere um pedido de exemplo ou vá direto ao painel. Serviços e marca ficam em
              Empresa / Serviços quando quiser.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                className="rounded-[10px] bg-[var(--wq-action)] hover:bg-[var(--wq-action)]/90"
                disabled={busy}
                onClick={async () => {
                  setBusy(true)
                  try {
                    await seedShopCatalogV1().catch(() => null)
                    await createDemoOrderV1()
                    toast.success("Pedido de exemplo criado")
                    await finish("/kanban")
                  } catch (err: any) {
                    toast.error(err?.message || "Falha no exemplo")
                    setBusy(false)
                  }
                }}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Pedido exemplo + kanban"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-[10px]"
                disabled={busy}
                onClick={() => finish("/dashboard")}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ir ao painel"}
              </Button>
              <Button type="button" variant="ghost" className="rounded-[10px]" onClick={() => setStep(1)}>
                Voltar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
