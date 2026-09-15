/**
 * WhatsApp wa.me helpers (no Meta Cloud API).
 */

export function digitsOnlyPhone(phone: string): string {
  return String(phone || "").replace(/\D/g, "")
}

/** BR: if 10–11 digits without country, prefix 55 */
export function toWhatsAppE164Digits(phone: string): string {
  let d = digitsOnlyPhone(phone)
  if (!d) return ""
  if (d.startsWith("55") && d.length >= 12) return d
  if (d.length === 10 || d.length === 11) return `55${d}`
  return d
}

export type WaTemplateVars = {
  code?: string
  client?: string
  link?: string
  sector?: string
  shop?: string
}

export function fillWaTemplate(template: string, vars: WaTemplateVars): string {
  const map: Record<string, string> = {
    "{{code}}": vars.code || "",
    "{{client}}": vars.client || "",
    "{{link}}": vars.link || "",
    "{{sector}}": vars.sector || "",
    "{{shop}}": vars.shop || "",
  }
  let out = String(template || "")
  for (const [k, v] of Object.entries(map)) {
    out = out.split(k).join(v)
  }
  return out
}

export const DEFAULT_WA_TEMPLATES = {
  created:
    "Olá {{client}}! Seu pedido {{code}} foi registrado em {{shop}}. Acompanhe: {{link}}",
  moved: "Olá {{client}}! Seu pedido {{code}} avançou para {{sector}}. Acompanhe: {{link}}",
  ready: "Olá {{client}}! Seu pedido {{code}} está pronto para retirada. {{link}}",
  publicLink: "Olá {{client}}! Consulte o pedido {{code}} aqui: {{link}}",
}

export function buildWaMeUrl(phone: string, text: string): string {
  const d = toWhatsAppE164Digits(phone)
  if (!d) return ""
  const q = text ? `?text=${encodeURIComponent(text)}` : ""
  return `https://wa.me/${d}${q}`
}
