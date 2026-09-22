"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AppHeader } from "@/components/shell/AppHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getShopCurrentV1, patchShopCurrentV1 } from "@/lib/apiV1"
import { toast } from "sonner"
import { Loader2, ExternalLink } from "lucide-react"

export default function TvSettingsPage() {
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [client, setClient] = useState({
    title: "",
    showLogo: true,
    tilesPerPage: 8,
    refreshMs: 30000,
    carouselMs: 8000,
  })
  const [floor, setFloor] = useState({
    title: "",
    hotOnlyDefault: false,
    overdueHours: 24,
    refreshMs: 15000,
  })
  const [shopLabel, setShopLabel] = useState("")

  useEffect(() => {
    ;(async () => {
      try {
        const shop = await getShopCurrentV1()
        const doc = shop?.shop || shop
        setShopLabel(doc?.branding?.displayName || doc?.name || "")
        if (doc?.tvSettings?.client) {
          setClient((c) => ({ ...c, ...doc.tvSettings.client }))
        }
        if (doc?.tvSettings?.floor) {
          setFloor((f) => ({ ...f, ...doc.tvSettings.floor }))
        }
      } catch (err: any) {
        toast.error(err?.message || "Erro ao carregar TVs")
      } finally {
        setFetching(false)
      }
    })()
  }, [])

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await patchShopCurrentV1({
        tvSettings: {
          client: {
            ...client,
            tilesPerPage: Number(client.tilesPerPage) || 8,
            refreshMs: Number(client.refreshMs) || 30000,
            carouselMs: Number(client.carouselMs) || 8000,
          },
          floor: {
            ...floor,
            overdueHours: Number(floor.overdueHours) || 24,
            refreshMs: Number(floor.refreshMs) || 15000,
          },
        },
      })
      toast.success("Configuração das TVs salva")
    } catch (err: any) {
      toast.error(err?.message || "Falha ao salvar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="-mx-3 -mt-4 sm:-mx-5 sm:-mt-6 md:-mx-8 md:-mt-7">
      <AppHeader
        title="TVs"
        subtitle={`Painéis da ${shopLabel || "empresa"} — Cliente, Oficina e Financeiro (admin)`}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="rounded-[10px]">
              <Link
                href="/tv"
                target="_blank"
                onClick={() => {
                  try {
                    localStorage.setItem("wq-tv-opened", "1")
                  } catch {}
                }}
              >
                <ExternalLink className="mr-1 h-3.5 w-3.5" /> Cliente
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-[10px]">
              <Link
                href="/tv-dashboard"
                target="_blank"
                onClick={() => {
                  try {
                    localStorage.setItem("wq-tv-opened", "1")
                  } catch {}
                }}
              >
                <ExternalLink className="mr-1 h-3.5 w-3.5" /> Oficina
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-[10px]">
              <Link href="/tv-financeiro" target="_blank">
                <ExternalLink className="mr-1 h-3.5 w-3.5" /> Financeiro
              </Link>
            </Button>
          </div>
        }
      />
      <div className="mx-auto max-w-[900px] px-5 py-6 md:px-8">
        {fetching ? (
          <p className="flex items-center gap-2 text-sm text-[var(--wq-text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </p>
        ) : (
          <form onSubmit={onSave} className="space-y-6">
            <section className="space-y-4 rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">
                TV Cliente
              </h2>
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={client.title}
                  onChange={(e) => setClient((c) => ({ ...c, title: e.target.value }))}
                  placeholder="Acompanhe seu pedido"
                  className="rounded-[10px]"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={client.showLogo}
                  onChange={(e) => setClient((c) => ({ ...c, showLogo: e.target.checked }))}
                />
                Mostrar logo / nome da empresa
              </label>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Pedidos por tela</Label>
                  <Input
                    type="number"
                    min={4}
                    max={12}
                    value={client.tilesPerPage}
                    onChange={(e) =>
                      setClient((c) => ({ ...c, tilesPerPage: Number(e.target.value) }))
                    }
                    className="rounded-[10px]"
                  />
                  <p className="text-[11px] text-[var(--wq-text-muted)]">Padrão 8 · o resto gira no carrossel</p>
                </div>
                <div className="space-y-2">
                  <Label>Refresh (ms)</Label>
                  <Input
                    type="number"
                    value={client.refreshMs}
                    onChange={(e) =>
                      setClient((c) => ({ ...c, refreshMs: Number(e.target.value) }))
                    }
                    className="rounded-[10px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Carrossel (ms)</Label>
                  <Input
                    type="number"
                    value={client.carouselMs}
                    onChange={(e) =>
                      setClient((c) => ({ ...c, carouselMs: Number(e.target.value) }))
                    }
                    className="rounded-[10px]"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">
                TV Oficina
              </h2>
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={floor.title}
                  onChange={(e) => setFloor((f) => ({ ...f, title: e.target.value }))}
                  placeholder="TV Oficina"
                  className="rounded-[10px]"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={floor.hotOnlyDefault}
                  onChange={(e) => setFloor((f) => ({ ...f, hotOnlyDefault: e.target.checked }))}
                />
                Foco em setores quentes por padrão
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Horas p/ atraso</Label>
                  <Input
                    type="number"
                    value={floor.overdueHours}
                    onChange={(e) =>
                      setFloor((f) => ({ ...f, overdueHours: Number(e.target.value) }))
                    }
                    className="rounded-[10px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Refresh (ms)</Label>
                  <Input
                    type="number"
                    value={floor.refreshMs}
                    onChange={(e) =>
                      setFloor((f) => ({ ...f, refreshMs: Number(e.target.value) }))
                    }
                    className="rounded-[10px]"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-[var(--wq-text)]">TV Financeiro</h2>
              <p className="mt-1 text-sm text-[var(--wq-text-muted)]">
                Painel privado (owner/admin): líquido e bruto do ano, barras mensais e meta anual
                (padrão = 2× o bruto já realizado). Opcional:{" "}
                <code className="rounded bg-[var(--wq-paper)] px-1 text-xs">?meta=500000</code>
              </p>
              <Button asChild variant="outline" size="sm" className="mt-3 rounded-[10px]">
                <Link href="/tv-financeiro" target="_blank">
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Abrir TV Financeiro
                </Link>
              </Button>
            </section>

            <Button type="submit" disabled={loading} className="bg-[var(--wq-brand)]">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar TVs"}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
