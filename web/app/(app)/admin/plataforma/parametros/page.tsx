"use client"

import { useEffect, useState } from "react"
import { AppHeader } from "@/components/shell/AppHeader"
import { Button } from "@/components/ui/button"
import {
  getPlatformConfigV1,
  listPlatformShopsV1,
  meV1,
  patchPlatformShopV1,
  putPlatformConfigV1,
  type PlatformFlag,
} from "@/lib/apiV1"
import { toast } from "sonner"

const HINT: Record<string, string> = {
  kanban: "Quadro de produção",
  orders: "Lista, cadastro e etiqueta",
  clients: "Cadastro de clientes",
  consultas: "Busca de pedidos na oficina",
  publicOrder: "Página do cliente com o código do pedido",
  reviews: "Notas que o cliente deixa",
  emailNotify: "Aviso por e-mail na criação e quando fica pronto",
  finance: "Caixa e TV financeiro",
  metrics: "Atraso e desempenho da oficina",
  tv: "TV da oficina e do cliente",
}

const SEALS = [
  { value: "", label: "Sem selo" },
  { value: "verificado", label: "Verificado" },
  { value: "destaque", label: "Destaque" },
  { value: "parceiro", label: "Parceiro" },
]

function shopOverride(flag: PlatformFlag, shopId: string) {
  return flag.shops.find((s) => s.shopId === shopId)
}

export default function PlatformParamsPage() {
  const [allowed, setAllowed] = useState(false)
  const [modules, setModules] = useState<PlatformFlag[]>([])
  const [shops, setShops] = useState<Array<{ id: string; name: string; seal?: string }>>([])
  const [shopId, setShopId] = useState("")
  const [seal, setSeal] = useState("")
  const [busy, setBusy] = useState("")

  const load = async () => {
    const me = await meV1()
    if (!me?.platformAdmin) {
      setAllowed(false)
      toast.error("Acesso restrito ao time Worqera")
      return
    }
    setAllowed(true)
    const [config, shopRes] = await Promise.all([getPlatformConfigV1(), listPlatformShopsV1()])
    setModules(config.services || [])
    const list = (shopRes.shops || []).map((s: any) => ({
      id: String(s.id),
      name: s.name,
      seal: s.seal || "",
    }))
    setShops(list)
    setShopId((prev) => prev || "")
    if (!shopId) setSeal("")
  }

  useEffect(() => {
    load().catch((err) => toast.error(err?.message || "Falha ao carregar parâmetros"))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setSeal(shops.find((s) => s.id === shopId)?.seal || "")
  }, [shopId, shops])

  const saveModules = async (
    patch: Array<{ key: string; enabled?: boolean; shopId?: string; shopEnabled?: boolean; inherit?: boolean }>
  ) => {
    const next = await putPlatformConfigV1({ services: patch })
    setModules(next.services || [])
  }

  return (
    <div className="-mx-2.5 -mt-3 sm:-mx-5 sm:-mt-5 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-6">
      <AppHeader
        title="Parâmetros"
        subtitle="Desligar some o item do menu na hora. Consulta pública e e-mail do laudo valem para o cliente. Empresa, setores e equipe continuam."
      />
      <div className="mx-auto w-full max-w-[720px] space-y-4 px-2.5 py-4 sm:px-5">
        {!allowed ? <p className="text-sm text-[var(--wq-text-muted)]">Sem acesso.</p> : null}
        {allowed ? (
          <>
            <section className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-4">
              <p className="text-sm font-medium">Selo da oficina</p>
              <p className="mt-1 text-xs text-[var(--wq-text-muted)]">Aparece debaixo do nome no menu.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <select
                  className="h-10 min-w-[180px] flex-1 rounded-[10px] border border-[var(--wq-border)] bg-[var(--wq-paper)] px-3 text-sm"
                  value={shopId}
                  onChange={(e) => setShopId(e.target.value)}
                >
                  <option value="">Escolha a oficina</option>
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <select
                  className="h-10 min-w-[140px] rounded-[10px] border border-[var(--wq-border)] bg-[var(--wq-paper)] px-3 text-sm"
                  value={seal}
                  disabled={!shopId}
                  onChange={(e) => setSeal(e.target.value)}
                >
                  {SEALS.map((opt) => (
                    <option key={opt.value || "none"} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  className="rounded-[10px]"
                  disabled={!shopId || busy === "seal"}
                  onClick={async () => {
                    setBusy("seal")
                    try {
                      await patchPlatformShopV1(shopId, { seal })
                      setShops((prev) => prev.map((s) => (s.id === shopId ? { ...s, seal } : s)))
                      toast.success("Selo atualizado")
                    } catch (err: any) {
                      toast.error(err?.message || "Não salvou o selo")
                    } finally {
                      setBusy("")
                    }
                  }}
                >
                  Salvar
                </Button>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
              <h2 className="border-b border-[var(--wq-border)] px-4 py-3 text-sm font-semibold">O que a oficina usa</h2>
              <ul className="divide-y divide-[var(--wq-border)]">
                {modules.map((flag) => {
                  const over = shopId ? shopOverride(flag, shopId) : undefined
                  const here = over ? over.enabled : flag.enabled
                  return (
                    <li key={flag.key} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="font-medium">{flag.label}</p>
                        <p className="text-xs text-[var(--wq-text-muted)]">
                          {HINT[flag.key] || flag.key}
                          {shopId
                            ? over
                              ? here
                                ? " · ligado só nesta oficina"
                                : " · desligado só nesta oficina"
                              : " · esta oficina segue o geral"
                            : flag.enabled
                              ? " · ligado para todas"
                              : " · desligado para todas"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={flag.enabled ? "outline" : "default"}
                          className={`rounded-[10px] ${flag.enabled ? "" : "bg-[var(--wq-action)] text-white hover:bg-[var(--wq-action)]/90"}`}
                          disabled={busy === flag.key}
                          onClick={async () => {
                            setBusy(flag.key)
                            try {
                              await saveModules([{ key: flag.key, enabled: !flag.enabled }])
                            } catch (err: any) {
                              toast.error(err?.message || "Não salvou")
                            } finally {
                              setBusy("")
                            }
                          }}
                        >
                          {flag.enabled ? "Desligar geral" : "Ligar geral"}
                        </Button>
                        {shopId ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={busy === `${flag.key}:shop`}
                            onClick={async () => {
                              setBusy(`${flag.key}:shop`)
                              try {
                                await saveModules(
                                  over
                                    ? [{ key: flag.key, shopId, inherit: true }]
                                    : [{ key: flag.key, shopId, shopEnabled: !flag.enabled }]
                                )
                              } catch (err: any) {
                                toast.error(err?.message || "Não salvou")
                              } finally {
                                setBusy("")
                              }
                            }}
                          >
                            {over ? "Voltar ao geral" : here ? "Desligar aqui" : "Ligar aqui"}
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          </>
        ) : null}
      </div>
    </div>
  )
}
