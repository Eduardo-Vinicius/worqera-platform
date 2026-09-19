/**
 * Build wa.me suggest from shop + order (client-side), using Empresa templates.
 */

import {
  buildWaMeUrl,
  DEFAULT_WA_TEMPLATES,
  fillWaTemplate,
  type WaTemplateVars,
} from "@/lib/whatsapp"

export type WaTemplateKey = keyof typeof DEFAULT_WA_TEMPLATES

export type ShopWaDoc = {
  slug?: string
  name?: string
  branding?: { displayName?: string }
  notifications?: {
    whatsapp?: {
      enabled?: boolean
      shopPhoneE164?: string
      templates?: Partial<Record<WaTemplateKey, string>>
    }
  }
}

export function buildOrderWaFromShop(opts: {
  shop: ShopWaDoc | null | undefined
  phone?: string | null
  code: string
  clientName?: string
  sectorName?: string
  templateKey: WaTemplateKey
  /** When false, still build if phone exists (for sticky ready CTA). Default true. */
  requireEnabled?: boolean
}): { url: string; text: string } | null {
  const wa = opts.shop?.notifications?.whatsapp
  if (opts.requireEnabled !== false && !wa?.enabled) return null

  const phone = opts.phone || wa?.shopPhoneE164 || ""
  if (!phone) return null

  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const slug = opts.shop?.slug || (typeof localStorage !== "undefined" ? localStorage.getItem("shopSlug") : "") || ""
  const link = slug
    ? `${origin}/p/${slug}/${encodeURIComponent(opts.code)}`
    : `${origin}/p/${encodeURIComponent(opts.code)}`
  const shopName =
    opts.shop?.branding?.displayName ||
    opts.shop?.name ||
    (typeof localStorage !== "undefined" ? localStorage.getItem("shopName") : "") ||
    "Worqera"

  const tpl =
    wa?.templates?.[opts.templateKey] ||
    DEFAULT_WA_TEMPLATES[opts.templateKey] ||
    DEFAULT_WA_TEMPLATES.publicLink

  const vars: WaTemplateVars = {
    code: String(opts.code),
    client: opts.clientName || "",
    link,
    sector: opts.sectorName || "",
    shop: shopName,
  }
  const text = fillWaTemplate(tpl, vars)
  const url = buildWaMeUrl(phone, text)
  if (!url) return null
  return { url, text }
}
