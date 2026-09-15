"use client"

import { useEffect, useState } from "react"
import { AppHeader } from "@/components/shell/AppHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getShopCurrentV1, patchShopCurrentV1 } from "@/lib/apiV1"
import { DEFAULT_WA_TEMPLATES } from "@/lib/whatsapp"
import { toast } from "sonner"
import { Loader2, RefreshCw } from "lucide-react"

export default function EmpresaPage() {
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [form, setForm] = useState({
    name: "",
    slug: "",
    displayName: "",
    emailFromName: "",
    phone: "",
    address: "",
    logoUrl: "",
    partnerCode: "",
    waEnabled: false,
    waPhone: "",
    tplReady: DEFAULT_WA_TEMPLATES.ready,
    tplMoved: DEFAULT_WA_TEMPLATES.moved,
    tplCreated: DEFAULT_WA_TEMPLATES.created,
    tplLink: DEFAULT_WA_TEMPLATES.publicLink,
  })

  const load = async () => {
    const shop = await getShopCurrentV1()
    const doc = shop?.shop || shop
    const wa = doc?.notifications?.whatsapp || {}
    const tpl = wa.templates || {}
    setForm({
      name: doc?.name || "",
      slug: doc?.slug || "",
      displayName: doc?.branding?.displayName || doc?.name || "",
      emailFromName: doc?.branding?.emailFromName || "",
      phone: doc?.branding?.phone || "",
      address: doc?.branding?.address || "",
      logoUrl: doc?.branding?.logoUrl || "",
      partnerCode: doc?.partnerCode || "",
      waEnabled: Boolean(wa.enabled),
      waPhone: wa.shopPhoneE164 || doc?.branding?.phone || "",
      tplReady: tpl.ready || DEFAULT_WA_TEMPLATES.ready,
      tplMoved: tpl.moved || DEFAULT_WA_TEMPLATES.moved,
      tplCreated: tpl.created || DEFAULT_WA_TEMPLATES.created,
      tplLink: tpl.publicLink || DEFAULT_WA_TEMPLATES.publicLink,
    })
    if (doc?.name) localStorage.setItem("shopName", doc.name)
    if (doc?.slug) localStorage.setItem("shopSlug", doc.slug)
    if (doc?.branding?.displayName) {
      localStorage.setItem("shopDisplayName", doc.branding.displayName)
    }
    window.dispatchEvent(new Event("wq-session-updated"))
  }

  useEffect(() => {
    ;(async () => {
      try {
        await load()
      } catch (err: any) {
        toast.error(err?.message || "Não foi possível carregar a empresa")
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
        name: form.name,
        slug: form.slug,
        branding: {
          displayName: form.displayName || form.name,
          emailFromName: form.emailFromName || form.displayName || form.name,
          phone: form.phone,
          address: form.address,
          logoUrl: form.logoUrl,
        },
        notifications: {
          whatsapp: {
            enabled: form.waEnabled,
            shopPhoneE164: form.waPhone,
            templates: {
              ready: form.tplReady,
              moved: form.tplMoved,
              created: form.tplCreated,
              publicLink: form.tplLink,
            },
          },
        },
      })
      localStorage.setItem("shopName", form.name)
      localStorage.setItem("shopSlug", form.slug)
      localStorage.setItem("shopDisplayName", form.displayName || form.name)
      window.dispatchEvent(new Event("wq-session-updated"))
      toast.success("Empresa atualizada — nome aparece nos e-mails e TVs")
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar")
    } finally {
      setLoading(false)
    }
  }

  const regenPartner = async () => {
    setLoading(true)
    try {
      await patchShopCurrentV1({ regeneratePartnerCode: true })
      toast.success("Código de parceiro regenerado")
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Falha ao regenerar")
    } finally {
      setLoading(false)
    }
  }

  const field = (
    id: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    hint?: string
  ) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[10px] bg-[var(--wq-surface)]"
      />
      {hint ? <p className="text-xs text-[var(--wq-text-muted)]">{hint}</p> : null}
    </div>
  )

  return (
    <div className="-mx-5 -mt-6 md:-mx-8 md:-mt-7">
      <AppHeader
        title="Empresa"
        subtitle="Nome e slug da sua marca dentro da Worqera — e-mails, TVs e links públicos"
      />
      <div className="mx-auto max-w-[1320px] px-5 py-6 md:px-8">
        {fetching ? (
          <p className="flex items-center gap-2 text-sm text-[var(--wq-text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </p>
        ) : (
          <form onSubmit={onSave} className="grid max-w-3xl gap-6">
            <section className="space-y-4 rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">
                Identidade
              </h2>
              {field("name", "Nome da empresa", form.name, (v) => setForm((f) => ({ ...f, name: v })))}
              {field(
                "displayName",
                "Nome de exibição",
                form.displayName,
                (v) => setForm((f) => ({ ...f, displayName: v })),
                "Aparece no assunto dos e-mails e nas TVs"
              )}
              {field(
                "slug",
                "Slug (sua frase na URL)",
                form.slug,
                (v) => setForm((f) => ({ ...f, slug: v })),
                form.slug ? `Consulta pública: /p/${form.slug}/CODIGO` : undefined
              )}
              {field(
                "emailFromName",
                "Remetente dos e-mails",
                form.emailFromName,
                (v) => setForm((f) => ({ ...f, emailFromName: v })),
                'Formato: "Sua Empresa via Worqera"'
              )}
              {field("phone", "Telefone / WhatsApp", form.phone, (v) =>
                setForm((f) => ({ ...f, phone: v }))
              )}
              {field("address", "Endereço", form.address, (v) =>
                setForm((f) => ({ ...f, address: v }))
              )}
              {field(
                "logoUrl",
                "URL do logo",
                form.logoUrl,
                (v) => setForm((f) => ({ ...f, logoUrl: v })),
                "URL pública (CDN ou upload futuro)"
              )}
            </section>

            <section className="space-y-4 rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">
                    Código de parceiro
                  </h2>
                  <p className="mt-1 font-mono text-lg">{form.partnerCode || "—"}</p>
                  <p className="text-xs text-[var(--wq-text-muted)]">
                    Signup com ?ref={form.partnerCode || "CODIGO"}
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={regenPartner} disabled={loading}>
                  <RefreshCw className="mr-1.5 h-4 w-4" /> Regenerar
                </Button>
              </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">
                WhatsApp (wa.me)
              </h2>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.waEnabled}
                  onChange={(e) => setForm((f) => ({ ...f, waEnabled: e.target.checked }))}
                />
                Habilitar botões WhatsApp no pedido
              </label>
              {field("waPhone", "Telefone da loja (E.164 / BR)", form.waPhone, (v) =>
                setForm((f) => ({ ...f, waPhone: v }))
              )}
              {field("tplReady", "Template pronto", form.tplReady, (v) =>
                setForm((f) => ({ ...f, tplReady: v }))
              )}
              {field("tplMoved", "Template avançou setor", form.tplMoved, (v) =>
                setForm((f) => ({ ...f, tplMoved: v }))
              )}
              {field("tplCreated", "Template criado", form.tplCreated, (v) =>
                setForm((f) => ({ ...f, tplCreated: v }))
              )}
              {field("tplLink", "Template link público", form.tplLink, (v) =>
                setForm((f) => ({ ...f, tplLink: v }))
              )}
              <p className="text-xs text-[var(--wq-text-muted)]">
                Variáveis: {"{{code}} {{client}} {{link}} {{sector}} {{shop}}"}
              </p>
            </section>

            <Button
              type="submit"
              disabled={loading}
              className="w-fit bg-[var(--wq-brand)] hover:bg-[var(--wq-brand-deep)]"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar empresa"}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
