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

const SEAL_OPTIONS = [
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
  const [features, setFeatures] = useState<PlatformFlag[]>([])
  const [services, setServices] = useState<PlatformFlag[]>([])
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
    const [config, shopRes] = await Promise.all([
      getPlatformConfigV1(),
      listPlatformShopsV1(),
    ])
    setFeatures(config.features || [])
    setServices(config.services || [])
    const list = (shopRes.shops || []).map((s: any) => ({
      id: String(s.id),
      name: s.name,
      seal: s.seal || "",
    }))
    setShops(list)
    setShopId((prev) => prev || list[0]?.id || "")
    const current = list.find((s) => s.id === (shopId || list[0]?.id))
    setSeal(current?.seal || "")
  }

  useEffect(() => {
    load().catch((err) => toast.error(err?.message || "Falha ao carregar parâmetros"))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const current = shops.find((s) => s.id === shopId)
    setSeal(current?.seal || "")
  }, [shopId, shops])

  const toggleGlobal = async (kind: "features" | "services", flag: PlatformFlag) => {
    setBusy(flag.key)
    try {
      const body = { [kind]: [{ key: flag.key, enabled: !flag.enabled }] }
      const next = await putPlatformConfigV1(body)
      setFeatures(next.features)
      setServices(next.services)
    } catch (err: any) {
      toast.error(err?.message || "Não salvou")
    } finally {
      setBusy("")
    }
  }

  const toggleShop = async (kind: "features" | "services", flag: PlatformFlag) => {
    if (!shopId) return
    const over = shopOverride(flag, shopId)
    const shopEnabled = over ? !over.enabled : !flag.enabled
    setBusy(`${flag.key}:${shopId}`)
    try {
      const next = await putPlatformConfigV1({
        [kind]: [{ key: flag.key, shopId, shopEnabled }],
      })
      setFeatures(next.features)
      setServices(next.services)
    } catch (err: any) {
      toast.error(err?.message || "Não salvou")
    } finally {
      setBusy("")
    }
  }

  const inheritShop = async (kind: "features" | "services", flag: PlatformFlag) => {
    if (!shopId) return
    setBusy(`${flag.key}:inherit`)
    try {
      const next = await putPlatformConfigV1({
        [kind]: [{ key: flag.key, shopId, inherit: true }],
      })
      setFeatures(next.features)
      setServices(next.services)
    } catch (err: any) {
      toast.error(err?.message || "Não salvou")
    } finally {
      setBusy("")
    }
  }

  const saveSeal = async () => {
    if (!shopId) return
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
  }

  const rows = (kind: "features" | "services", list: PlatformFlag[]) =>
    list.map((flag) => {
      const over = shopId ? shopOverride(flag, shopId) : undefined
      const effective = over ? over.enabled : flag.enabled
      return (
        <li key={flag.key} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="font-medium">{flag.label}</p>
            <p className="text-xs text-[var(--wq-text-muted)]">
              Global {flag.enabled ? "ligado" : "desligado"}
              {over ? ` · esta oficina ${over.enabled ? "ligada" : "desligada"}` : " · oficina herda o global"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-[10px]"
              disabled={busy === flag.key}
              onClick={() => void toggleGlobal(kind, flag)}
            >
              {flag.enabled ? "Desligar global" : "Ligar global"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-[10px]"
              disabled={!shopId || busy === `${flag.key}:${shopId}`}
              onClick={() => void toggleShop(kind, flag)}
            >
              {effective ? "Desligar nesta oficina" : "Ligar nesta oficina"}
            </Button>
            {over ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy === `${flag.key}:inherit`}
                onClick={() => void inheritShop(kind, flag)}
              >
                Herdar
              </Button>
            ) : null}
          </div>
        </li>
      )
    })

  return (
    <div className="-mx-2.5 -mt-3 sm:-mx-5 sm:-mt-5 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-6">
      <AppHeader
        title="Parâmetros"
        subtitle="Vale na próxima leitura do app e do site, sem novo deploy"
      />
      <div className="mx-auto w-full max-w-[900px] space-y-4 px-2.5 py-4 sm:px-5">
        {!allowed ? <p className="text-sm text-[var(--wq-text-muted)]">Sem acesso.</p> : null}
        {allowed ? (
          <>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--wq-text-muted)]">
                Oficina
              </span>
              <select
                className="h-10 w-full rounded-[10px] border border-[var(--wq-border)] bg-[var(--wq-surface)] px-3"
                value={shopId}
                onChange={(e) => setShopId(e.target.value)}
              >
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            <section className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-4">
              <h2 className="text-sm font-semibold">Selo</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <select
                  className="h-10 min-w-[180px] flex-1 rounded-[10px] border border-[var(--wq-border)] bg-[var(--wq-paper)] px-3"
                  value={seal}
                  onChange={(e) => setSeal(e.target.value)}
                >
                  {SEAL_OPTIONS.map((opt) => (
                    <option key={opt.value || "none"} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <Button type="button" className="rounded-[10px]" disabled={busy === "seal"} onClick={() => void saveSeal()}>
                  Salvar selo
                </Button>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
              <h2 className="border-b border-[var(--wq-border)] px-4 py-3 text-sm font-semibold">Funções</h2>
              <ul className="divide-y divide-[var(--wq-border)]">{rows("features", features)}</ul>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
              <h2 className="border-b border-[var(--wq-border)] px-4 py-3 text-sm font-semibold">Serviços</h2>
              <ul className="divide-y divide-[var(--wq-border)]">{rows("services", services)}</ul>
            </section>
          </>
        ) : null}
      </div>
    </div>
  )
}
