"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AppHeader } from "@/components/shell/AppHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  createServiceV1,
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
  const [serviceName, setServiceName] = useState("")
  const [servicePrice, setServicePrice] = useState("0")
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

  const finish = async () => {
    setBusy(true)
    try {
      await patchShopCurrentV1({ onboardingComplete: true })
      try {
        localStorage.removeItem("wq-needs-onboarding")
      } catch {}
      toast.success("Onboarding concluído")
      router.push("/kanban")
    } catch (err: any) {
      toast.error(err?.message || "Falha ao concluir")
    } finally {
      setBusy(false)
    }
  }

  const createService = async () => {
    if (!serviceName.trim()) {
      toast.error("Informe o nome do serviço")
      return
    }
    setBusy(true)
    try {
      await createServiceV1({
        name: serviceName.trim(),
        defaultPrice: Number(servicePrice) || 0,
        active: true,
        sortOrder: 1,
      })
      toast.success("Serviço criado")
      setStep(3)
    } catch (err: any) {
      toast.error(err?.message || "Falha ao criar serviço")
    } finally {
      setBusy(false)
    }
  }

  const applyDefaultCatalog = async () => {
    setBusy(true)
    try {
      const res = await seedShopCatalogV1()
      if (res.seeded > 0) toast.success(`${res.seeded} serviços padrão aplicados`)
      else toast.message(`Catálogo já tinha ${res.existing} serviço(s)`)
      setStep(3)
    } catch (err: any) {
      toast.error(err?.message || "Falha ao aplicar catálogo")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="-mx-5 -mt-6 md:-mx-8 md:-mt-7">
      <AppHeader
        title="Bem-vindo ao Worqera"
        subtitle="Configure a oficina em 3 passos rápidos"
        actions={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-[10px] text-[var(--wq-text-muted)]"
            disabled={busy}
            onClick={finish}
          >
            Pular
          </Button>
        }
      />

      <div className="mx-auto max-w-[560px] space-y-6 px-5 py-8 md:px-8">
        <div className="flex gap-2">
          {[1, 2, 3].map((n) => (
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
              1. Setores do fluxo
            </h2>
            <p className="text-sm text-[var(--wq-text-muted)]">
              Revise os setores do kanban. Você pode usar os padrões e seguir, ou editar em
              Configurações.
            </p>
            {loadingSectors ? (
              <p className="text-sm text-[var(--wq-text-muted)]">Carregando…</p>
            ) : sectors.length === 0 ? (
              <p className="text-sm text-[var(--wq-text-muted)]">
                Nenhum setor ainda — a API cria padrões no signup.{" "}
                <Link href="/settings/setores" className="text-[var(--wq-brand)] underline-offset-2 hover:underline">
                  Abrir setores
                </Link>
              </p>
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
            <p className="text-xs text-[var(--wq-text-muted)]">
              Dica: use os padrões e continue — você pode ajustar depois em{" "}
              <Link href="/settings/setores" className="text-[var(--wq-brand)] underline-offset-2 hover:underline">
                /settings/setores
              </Link>
              .
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                className="rounded-[10px] bg-[var(--wq-action)] hover:bg-[var(--wq-action)]/90"
                onClick={() => setStep(2)}
              >
                Continuar
              </Button>
              <Button asChild type="button" variant="outline" className="rounded-[10px]">
                <Link href="/settings/setores">Editar setores</Link>
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 rounded-2xl border border-[var(--wq-border)] bg-white p-5">
            <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--wq-text)]">
              2. Primeiro serviço
            </h2>
            <p className="text-sm text-[var(--wq-text-muted)]">
              Cadastre um serviço do catálogo (nome + preço). Usado no novo pedido.
            </p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="svc-name">Nome</Label>
                <Input
                  id="svc-name"
                  className="rounded-[10px]"
                  placeholder="Ex.: Limpeza profunda"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="svc-price">Preço (R$)</Label>
                <Input
                  id="svc-price"
                  type="number"
                  min={0}
                  step="0.01"
                  className="rounded-[10px] w-36"
                  value={servicePrice}
                  onChange={(e) => setServicePrice(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                disabled={busy}
                className="rounded-[10px] bg-[var(--wq-brand)] hover:bg-[var(--wq-brand-deep)]"
                onClick={createService}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar e continuar"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                className="rounded-[10px]"
                onClick={applyDefaultCatalog}
              >
                Aplicar catálogo padrão
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-[10px]"
                onClick={() => setStep(3)}
              >
                Pular serviço
              </Button>
              <Button type="button" variant="ghost" className="rounded-[10px]" onClick={() => setStep(1)}>
                Voltar
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 rounded-2xl border border-[var(--wq-border)] bg-white p-5">
            <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--wq-text)]">
              3. Criar o primeiro pedido
            </h2>
            <p className="text-sm text-[var(--wq-text-muted)]">
              Pronto. Abra o formulário de novo pedido ou vá direto ao kanban.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button asChild className="rounded-[10px] bg-[var(--wq-action)] hover:bg-[var(--wq-action)]/90">
                <Link href="/pedidos/novo">Novo pedido →</Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-[10px]"
                disabled={busy}
                onClick={finish}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Concluir"}
              </Button>
              <Button type="button" variant="ghost" className="rounded-[10px]" onClick={() => setStep(2)}>
                Voltar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
