"use client"

import { useEffect, useRef, useState } from "react"
import { AppHeader } from "@/components/shell/AppHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  getShopCurrentV1,
  patchShopCurrentV1,
  uploadShopLogoV1,
} from "@/lib/apiV1"
import { DEFAULT_WA_TEMPLATES } from "@/lib/whatsapp"
import {
  BRAND_PRESETS,
  applyBrandCssVars,
  normalizeHex,
  syncBrandToStorage,
} from "@/lib/shopBrand"
import { toast } from "sonner"
import { ImagePlus, Loader2, RefreshCw } from "lucide-react"

export default function EmpresaPage() {
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    name: "",
    slug: "",
    displayName: "",
    emailFromName: "",
    phone: "",
    address: "",
    logoUrl: "",
    primaryColor: "",
    accentColor: "",
    partnerCode: "",
    waEnabled: false,
    emailEnabled: true,
    waPhone: "",
    tplReady: DEFAULT_WA_TEMPLATES.ready,
    tplMoved: DEFAULT_WA_TEMPLATES.moved,
    tplCreated: DEFAULT_WA_TEMPLATES.created,
    tplLink: DEFAULT_WA_TEMPLATES.publicLink,
  })

  const livePreview = () => {
    applyBrandCssVars({
      primaryColor: form.primaryColor,
      accentColor: form.accentColor,
      logoUrl: form.logoUrl,
    })
  }

  useEffect(() => {
    livePreview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.primaryColor, form.accentColor])

  const load = async () => {
    const shop = await getShopCurrentV1()
    const doc = shop?.shop || shop
    const wa = doc?.notifications?.whatsapp || {}
    const tpl = wa.templates || {}
    const next = {
      name: doc?.name || "",
      slug: doc?.slug || "",
      displayName: doc?.branding?.displayName || doc?.name || "",
      emailFromName: doc?.branding?.emailFromName || "",
      phone: doc?.branding?.phone || "",
      address: doc?.branding?.address || "",
      logoUrl: doc?.branding?.logoUrl || "",
      primaryColor: doc?.branding?.primaryColor || "",
      accentColor: doc?.branding?.accentColor || "",
      partnerCode: doc?.partnerCode || "",
      waEnabled: Boolean(wa.enabled),
      emailEnabled: doc?.notifications?.email?.enabled !== false,
      waPhone: wa.shopPhoneE164 || doc?.branding?.phone || "",
      tplReady: tpl.ready || DEFAULT_WA_TEMPLATES.ready,
      tplMoved: tpl.moved || DEFAULT_WA_TEMPLATES.moved,
      tplCreated: tpl.created || DEFAULT_WA_TEMPLATES.created,
      tplLink: tpl.publicLink || DEFAULT_WA_TEMPLATES.publicLink,
    }
    setForm(next)
    syncBrandToStorage({
      name: next.name,
      slug: next.slug,
      displayName: next.displayName,
      logoUrl: next.logoUrl,
      primaryColor: next.primaryColor,
      accentColor: next.accentColor,
    })
    applyBrandCssVars(next)
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

  const onUploadLogo = async (file: File | null) => {
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo até 2 MB")
      return
    }
    setUploading(true)
    try {
      const shop = await uploadShopLogoV1(file)
      const url = shop?.branding?.logoUrl || ""
      setForm((f) => ({ ...f, logoUrl: url }))
      syncBrandToStorage({
        name: form.name,
        slug: form.slug,
        displayName: form.displayName,
        logoUrl: url,
        primaryColor: form.primaryColor,
        accentColor: form.accentColor,
      })
      toast.success("Logo enviado")
    } catch (err: any) {
      toast.error(err?.message || "Falha no upload")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const primary = normalizeHex(form.primaryColor)
    const accent = normalizeHex(form.accentColor)
    if (form.primaryColor && !primary) {
      toast.error("Cor principal inválida — use #RRGGBB")
      return
    }
    if (form.accentColor && !accent) {
      toast.error("Cor de ação inválida — use #RRGGBB")
      return
    }
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
          primaryColor: primary,
          accentColor: accent,
        },
        notifications: {
          email: {
            enabled: form.emailEnabled,
          },
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
      syncBrandToStorage({
        name: form.name,
        slug: form.slug,
        displayName: form.displayName || form.name,
        logoUrl: form.logoUrl,
        primaryColor: primary,
        accentColor: accent,
      })
      applyBrandCssVars({ primaryColor: primary, accentColor: accent })
      toast.success("Marca atualizada — consulta, TVs e etiqueta usam essas cores")
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

  const previewPrimary = normalizeHex(form.primaryColor) || "#7D26DE"
  const previewAccent = normalizeHex(form.accentColor) || "#0D9488"

  return (
    <div className="-mx-3 -mt-4 sm:-mx-5 sm:-mt-6 md:-mx-8 md:-mt-7">
      <AppHeader
        title="Empresa"
        subtitle="Marca da oficina — logo, cores, e-mails, TVs e link público"
      />
      <div className="mx-auto max-w-[1320px] px-5 py-6 md:px-8">
        {fetching ? (
          <p className="flex items-center gap-2 text-sm text-[var(--wq-text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </p>
        ) : (
          <form onSubmit={onSave} className="grid max-w-3xl gap-6">
            <section className="space-y-4 rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-5 sm:p-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">
                Identidade
              </h2>
              {field("name", "Nome da empresa", form.name, (v) => setForm((f) => ({ ...f, name: v })))}
              {field(
                "displayName",
                "Nome de exibição",
                form.displayName,
                (v) => setForm((f) => ({ ...f, displayName: v })),
                "Aparece na consulta pública, e-mails e TVs"
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
            </section>

            <section className="space-y-4 rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-5 sm:p-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">
                Marca visual
              </h2>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div
                  className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--wq-border)] bg-white"
                  style={{ boxShadow: `0 0 0 3px ${previewPrimary}33` }}
                >
                  {form.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.logoUrl}
                      alt="Logo"
                      className="max-h-full max-w-full object-contain p-2"
                    />
                  ) : (
                    <ImagePlus className="h-8 w-8 text-[var(--wq-text-muted)]" />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-[10px]"
                      disabled={uploading}
                      onClick={() => fileRef.current?.click()}
                    >
                      {uploading ? (
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      ) : (
                        <ImagePlus className="mr-1.5 h-4 w-4" />
                      )}
                      Enviar logo
                    </Button>
                    {form.logoUrl ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="rounded-[10px] text-[var(--wq-text-muted)]"
                        onClick={() => setForm((f) => ({ ...f, logoUrl: "" }))}
                      >
                        Remover
                      </Button>
                    ) : null}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => onUploadLogo(e.target.files?.[0] || null)}
                  />
                  {field(
                    "logoUrl",
                    "URL do logo (opcional)",
                    form.logoUrl,
                    (v) => setForm((f) => ({ ...f, logoUrl: v })),
                    "PNG/WebP com fundo transparente fica melhor na TV e na etiqueta"
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Cor principal</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      aria-label="Cor principal"
                      value={previewPrimary}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, primaryColor: e.target.value.toUpperCase() }))
                      }
                      className="h-10 w-12 cursor-pointer rounded-[8px] border border-[var(--wq-border)] bg-transparent p-1"
                    />
                    <Input
                      id="primaryColor"
                      value={form.primaryColor}
                      placeholder="#7D26DE"
                      onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
                      className="rounded-[10px] font-mono uppercase"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accentColor">Cor de ação (botões)</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      aria-label="Cor de ação"
                      value={previewAccent}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, accentColor: e.target.value.toUpperCase() }))
                      }
                      className="h-10 w-12 cursor-pointer rounded-[8px] border border-[var(--wq-border)] bg-transparent p-1"
                    />
                    <Input
                      id="accentColor"
                      value={form.accentColor}
                      placeholder="#0D9488"
                      onChange={(e) => setForm((f) => ({ ...f, accentColor: e.target.value }))}
                      className="rounded-[10px] font-mono uppercase"
                    />
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs text-[var(--wq-text-muted)]">Presets</p>
                <div className="flex flex-wrap gap-2">
                  {BRAND_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      title={p.label}
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          primaryColor: p.primary,
                          accentColor: p.accent,
                        }))
                      }
                      className="flex items-center gap-2 rounded-full border border-[var(--wq-border)] bg-white px-3 py-1.5 text-xs transition hover:border-[var(--wq-brand)]"
                    >
                      <span
                        className="h-3.5 w-3.5 rounded-full"
                        style={{ background: p.primary }}
                      />
                      {p.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="rounded-full border border-dashed border-[var(--wq-border)] px-3 py-1.5 text-xs text-[var(--wq-text-muted)]"
                    onClick={() => setForm((f) => ({ ...f, primaryColor: "", accentColor: "" }))}
                  >
                    Padrão Worqera
                  </button>
                </div>
              </div>

              {/* Live mini preview — mobile + desktop card */}
              <div
                className="overflow-hidden rounded-2xl border border-[var(--wq-border)]"
                style={{
                  background: `linear-gradient(160deg, ${previewPrimary}18 0%, #fff 45%)`,
                }}
              >
                <div
                  className="flex items-center gap-3 px-4 py-3 text-white sm:px-5"
                  style={{ background: previewPrimary }}
                >
                  {form.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.logoUrl}
                      alt=""
                      className="h-9 w-9 rounded-lg bg-white/95 object-contain p-1"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 text-xs font-bold">
                      {(form.displayName || form.name || "W").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {form.displayName || form.name || "Sua oficina"}
                    </p>
                    <p className="text-[11px] text-white/75">Prévia · consulta pública</p>
                  </div>
                </div>
                <div className="space-y-3 p-4 sm:p-5">
                  <p className="font-mono text-2xl font-semibold tracking-tight">0001</p>
                  <span
                    className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{
                      background: `${previewPrimary}22`,
                      color: previewPrimary,
                    }}
                  >
                    Em andamento
                  </span>
                  <button
                    type="button"
                    className="mt-2 w-full rounded-[10px] px-3 py-2.5 text-sm font-medium text-white"
                    style={{ background: previewAccent }}
                  >
                    Falar no WhatsApp
                  </button>
                </div>
              </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">
                    Código de parceiro
                  </h2>
                  <p className="mt-1 font-mono text-lg">{form.partnerCode || "—"}</p>
                  <p className="text-xs text-[var(--wq-text-muted)]">
                    Link: /signup?ref={form.partnerCode || "CODIGO"} — 1 mês grátis quando assinar
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={regenPartner} disabled={loading}>
                  <RefreshCw className="mr-1.5 h-4 w-4" /> Regenerar
                </Button>
              </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-5 sm:p-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">
                E-mail ao cliente
              </h2>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.emailEnabled}
                  onChange={(e) => setForm((f) => ({ ...f, emailEnabled: e.target.checked }))}
                />
                Enviar e-mails de status (criado / coluna / pronto)
              </label>
              <p className="text-xs text-[var(--wq-text-muted)]">
                Precisa de e-mail no pedido + SMTP. Quais colunas disparam: em{" "}
                <a href="/settings/setores" className="underline">
                  Setores
                </a>
                .
              </p>
            </section>

            <section className="space-y-4 rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-5 sm:p-6">
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
                Variáveis: {"{{code}} {{client}} {{link}} {{sector}} {{shop}}"}.
              </p>
            </section>

            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-[10px] text-white sm:w-fit"
              style={{ background: previewPrimary }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar marca"}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
