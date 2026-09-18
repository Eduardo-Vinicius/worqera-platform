/** Per-shop branding helpers (logo + colors → CSS vars / localStorage). */

export const WQ_DEFAULT_PRIMARY = "#7D26DE"
export const WQ_DEFAULT_ACCENT = "#0D9488"

export const BRAND_PRESETS = [
  { label: "Worqera", primary: "#7D26DE", accent: "#0D9488" },
  { label: "Azul", primary: "#2563EB", accent: "#0EA5E9" },
  { label: "Verde", primary: "#15803D", accent: "#0D9488" },
  { label: "Laranja", primary: "#C2410C", accent: "#EA580C" },
  { label: "Ink", primary: "#0F172A", accent: "#334155" },
  { label: "Rosa", primary: "#BE185D", accent: "#DB2777" },
] as const

export type ShopBrand = {
  displayName?: string
  logoUrl?: string
  primaryColor?: string
  accentColor?: string
}

export function normalizeHex(value: string | null | undefined): string {
  const raw = String(value || "").trim()
  if (!raw) return ""
  const m = raw.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
  if (!m) return ""
  let h = m[1]
  if (h.length === 3) h = h.split("").map((c) => c + c).join("")
  return `#${h.toUpperCase()}`
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const n = normalizeHex(hex)
  if (!n) return null
  return {
    r: parseInt(n.slice(1, 3), 16),
    g: parseInt(n.slice(3, 5), 16),
    b: parseInt(n.slice(5, 7), 16),
  }
}

export function hexToRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return `rgba(125, 38, 222, ${alpha})`
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

/** Darken hex ~18% for hover / deep variant. */
export function deepenHex(hex: string): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return WQ_DEFAULT_PRIMARY
  const f = 0.72
  const to = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n * f)))
      .toString(16)
      .padStart(2, "0")
  return `#${to(rgb.r)}${to(rgb.g)}${to(rgb.b)}`.toUpperCase()
}

export function resolveBrandColors(brand?: ShopBrand | null) {
  const primary = normalizeHex(brand?.primaryColor) || WQ_DEFAULT_PRIMARY
  const accent =
    normalizeHex(brand?.accentColor) ||
    (normalizeHex(brand?.primaryColor) ? primary : WQ_DEFAULT_ACCENT)
  return {
    primary,
    accent,
    deep: deepenHex(primary),
    soft: hexToRgba(primary, 0.14),
  }
}

export function syncBrandToStorage(brand: ShopBrand & { name?: string; slug?: string }) {
  if (typeof window === "undefined") return
  if (brand.name) localStorage.setItem("shopName", brand.name)
  if (brand.slug) localStorage.setItem("shopSlug", brand.slug)
  if (brand.displayName) localStorage.setItem("shopDisplayName", brand.displayName)
  else if (brand.name) localStorage.setItem("shopDisplayName", brand.name)
  if (brand.logoUrl != null) {
    if (brand.logoUrl) localStorage.setItem("shopLogoUrl", brand.logoUrl)
    else localStorage.removeItem("shopLogoUrl")
  }
  const primary = normalizeHex(brand.primaryColor)
  const accent = normalizeHex(brand.accentColor)
  if (primary) localStorage.setItem("shopPrimaryColor", primary)
  else localStorage.removeItem("shopPrimaryColor")
  if (accent) localStorage.setItem("shopAccentColor", accent)
  else localStorage.removeItem("shopAccentColor")
  window.dispatchEvent(new Event("wq-session-updated"))
}

export function readBrandFromStorage(): ShopBrand {
  if (typeof window === "undefined") return {}
  return {
    displayName:
      localStorage.getItem("shopDisplayName") || localStorage.getItem("shopName") || undefined,
    logoUrl: localStorage.getItem("shopLogoUrl") || undefined,
    primaryColor: localStorage.getItem("shopPrimaryColor") || undefined,
    accentColor: localStorage.getItem("shopAccentColor") || undefined,
  }
}

/** Apply brand tokens on an element (default: documentElement). */
export function applyBrandCssVars(
  brand?: ShopBrand | null,
  el: HTMLElement | null = typeof document !== "undefined" ? document.documentElement : null
) {
  if (!el) return
  const { primary, accent, deep, soft } = resolveBrandColors(brand)
  el.style.setProperty("--wq-brand", primary)
  el.style.setProperty("--wq-brand-deep", deep)
  el.style.setProperty("--wq-brand-soft", soft)
  el.style.setProperty("--wq-accent", primary)
  el.style.setProperty("--wq-action", accent)
  el.style.setProperty("--primary", primary)
  el.style.setProperty("--sidebar-primary", primary)
}

export function clearBrandCssVars(
  el: HTMLElement | null = typeof document !== "undefined" ? document.documentElement : null
) {
  if (!el) return
  ;[
    "--wq-brand",
    "--wq-brand-deep",
    "--wq-brand-soft",
    "--wq-accent",
    "--wq-action",
    "--primary",
    "--sidebar-primary",
  ].forEach((k) => el.style.removeProperty(k))
}
