"use client"

import { useEffect, useState } from "react"
import { Loader2, Printer } from "lucide-react"
import { toast } from "sonner"
import { AppHeader } from "@/components/shell/AppHeader"
import { Button } from "@/components/ui/button"
import { getShopCurrentV1, patchShopCurrentV1 } from "@/lib/apiV1"
import { resolveItemNoun } from "@/lib/itemNoun"
import {
  LABEL_SIZES,
  printLabelJobs,
  readAfterCreate,
  readLabelSettings,
  writeAfterCreate,
  type AfterCreate,
  type LabelSize,
} from "@/lib/labelPrint"

const AFTER_CREATE: Array<{ id: AfterCreate; title: string; hint: string }> = [
  { id: "ask", title: "Perguntar", hint: "Aparece \"Imprimir a etiqueta agora?\" com o botão já selecionado: Enter imprime." },
  { id: "auto", title: "Imprimir direto", hint: "A impressão abre sozinha ao criar o pedido. Bom no computador do balcão." },
  { id: "off", title: "Não imprimir", hint: "Para computadores sem impressora. O botão Imprimir etiqueta continua no pedido." },
]

const SIZE_ORDER: LabelSize[] = ["60x40", "50x30", "100x50", "62x40", "a4"]

function Choice({ checked, title, hint, onSelect }: { checked: boolean; title: string; hint: string; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl border p-3 text-left transition ${
        checked ? "border-[var(--wq-action)] bg-[color-mix(in_srgb,var(--wq-action)_8%,var(--wq-surface))]" : "border-[var(--wq-border)] hover:bg-[var(--wq-paper)]"
      }`}
      aria-pressed={checked}
    >
      <p className="text-sm font-semibold text-[var(--wq-text)]">{title}</p>
      <p className="text-xs text-[var(--wq-text-muted)]">{hint}</p>
    </button>
  )
}

export default function LabelSettingsPage() {
  const [shop, setShop] = useState<any>(null)
  const [fetching, setFetching] = useState(true)
  const [saving, setSaving] = useState(false)
  const [size, setSize] = useState<LabelSize>("a4")
  const [perItem, setPerItem] = useState(false)
  const [afterCreate, setAfterCreate] = useState<AfterCreate>("ask")

  useEffect(() => {
    setAfterCreate(readAfterCreate())
    ;(async () => {
      try {
        const res = await getShopCurrentV1()
        const doc = res?.shop || res
        setShop(doc)
        const settings = readLabelSettings(doc)
        setSize(settings.size)
        setPerItem(settings.perItem)
      } catch (err: any) {
        toast.error(err?.message || "Erro ao carregar")
      } finally {
        setFetching(false)
      }
    })()
  }, [])

  const noun = resolveItemNoun(shop)

  const save = async (next: { size?: LabelSize; perItem?: boolean }) => {
    const prev = { size, perItem }
    if (next.size) setSize(next.size)
    if (next.perItem != null) setPerItem(next.perItem)
    setSaving(true)
    try {
      const updated = await patchShopCurrentV1({ labelSettings: { size: next.size ?? size, perItem: next.perItem ?? perItem } })
      setShop(updated?.shop || updated || shop)
      toast.success("Etiqueta salva")
    } catch (err: any) {
      setSize(prev.size)
      setPerItem(prev.perItem)
      toast.error(err?.message || "Não salvou")
    } finally {
      setSaving(false)
    }
  }

  const chooseAfterCreate = (value: AfterCreate) => {
    setAfterCreate(value)
    writeAfterCreate(value)
    toast.success("Salvo neste computador")
  }

  const printTest = async () => {
    try {
      await printLabelJobs(
        [
          {
            brand: String(shop?.branding?.displayName || shop?.name || "Sua empresa"),
            code: "00042",
            client: "Cliente teste",
            detail: "Nike Air Force 1",
            services: "Higienização + Pintura da sola",
            due: "Entrega 12/11",
            url: `${window.location.origin}/p/o/teste`,
          },
        ],
        size
      )
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível imprimir")
    }
  }

  return (
    <div className="-mx-3 -mt-4 sm:-mx-5 sm:-mt-6 md:-mx-8 md:-mt-7">
      <AppHeader
        title="Etiqueta e impressora"
        subtitle="O QR que vai colado no item. Escolha o tamanho do rolo e o que acontece ao criar o pedido."
        actions={
          <Button type="button" size="sm" className="rounded-[10px] bg-[var(--wq-action)] text-white" onClick={() => void printTest()} disabled={fetching}>
            <Printer className="mr-1.5 h-4 w-4" /> Imprimir teste
          </Button>
        }
      />
      <div className="mx-auto max-w-[900px] space-y-6 px-5 py-6 md:px-8">
        {fetching ? (
          <p className="flex items-center gap-2 text-sm text-[var(--wq-text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </p>
        ) : (
          <>
            <section className="space-y-3 rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">Tamanho da etiqueta</h2>
              <p className="text-xs text-[var(--wq-text-muted)]">Vale para toda a empresa. Use o mesmo tamanho do rolo colocado na impressora.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {SIZE_ORDER.map((id) => (
                  <Choice
                    key={id}
                    checked={size === id}
                    title={`${LABEL_SIZES[id].title}${id === "60x40" ? " · recomendada" : ""}`}
                    hint={LABEL_SIZES[id].hint}
                    onSelect={() => !saving && size !== id && void save({ size: id })}
                  />
                ))}
              </div>
              <label className="flex items-start gap-2 pt-2 text-sm">
                <input type="checkbox" className="mt-1" checked={perItem} disabled={saving} onChange={(e) => void save({ perItem: e.target.checked })} />
                <span>
                  Uma etiqueta por {noun.singular}
                  <span className="block text-xs text-[var(--wq-text-muted)]">
                    Pedido com 3 {noun.plural} sai com 3 etiquetas (código-1, código-2…), cada uma com o próprio QR.
                  </span>
                </span>
              </label>
            </section>

            <section className="space-y-3 rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">Ao criar o pedido · neste computador</h2>
              <p className="text-xs text-[var(--wq-text-muted)]">Cada computador escolhe o seu: o do balcão imprime, o notebook do dono não precisa.</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {AFTER_CREATE.map((opt) => (
                  <Choice key={opt.id} checked={afterCreate === opt.id} title={opt.title} hint={opt.hint} onSelect={() => chooseAfterCreate(opt.id)} />
                ))}
              </div>
            </section>

            <section className="space-y-3 rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-6 text-sm text-[var(--wq-text)]">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">Qual impressora comprar</h2>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>
                  <b>Térmica de etiqueta, USB</b> (não usa tinta): Elgin L42 Pro, Zebra ZD220/ZD230 ou Argox OS-2140. Rolo de etiqueta
                  adesiva térmica <b>60 × 40 mm</b>.
                </li>
                <li>
                  <b>Mac ou iPhone:</b> Brother QL-800 (USB) ou QL-820NWB (Wi-Fi, imprime do iPhone). Rolo de 62 mm.
                </li>
                <li>
                  <b>Evite:</b> impressora de cupom (58/80 mm, papel sem cola) e mini impressoras Bluetooth, que só imprimem pelo
                  aplicativo do fabricante.
                </li>
                <li>Depois de instalar, deixe a térmica como impressora padrão e o papel do driver no mesmo tamanho do rolo.</li>
              </ul>
            </section>

            <section className="space-y-2 rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-6 text-sm text-[var(--wq-text)]">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">Imprimir sem a janela de impressão</h2>
              <p className="text-[var(--wq-text-muted)]">
                No computador do balcão, abra a Worqera por um atalho do Chrome com <code className="rounded bg-[var(--wq-paper)] px-1">--kiosk-printing</code>.
                Com &quot;Imprimir direto&quot;, a etiqueta sai na impressora padrão assim que o pedido é criado, sem clicar.
              </p>
              <p className="font-mono text-xs text-[var(--wq-text-muted)]">
                &quot;C:\Program Files\Google\Chrome\Application\chrome.exe&quot; --kiosk-printing https://worqera.com/kanban
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
