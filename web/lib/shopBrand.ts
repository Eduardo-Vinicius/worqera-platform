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

function channelLuma(c: number) {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0
  return 0.2126 * channelLuma(rgb.r) + 0.7152 * channelLuma(rgb.g) + 0.0722 * channelLuma(rgb.b)
}

export function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a)
  const l2 = relativeLuminance(b)
  const hi = Math.max(l1, l2)
  const lo = Math.min(l1, l2)
  return (hi + 0.05) / (lo + 0.05)
}

export function mixHex(from: string, to: string, t: number): string {
  const a = hexToRgb(from)
  const b = hexToRgb(to)
  if (!a || !b) return normalizeHex(from) || to
  const ch = (x: number, y: number) =>
    Math.max(0, Math.min(255, Math.round(x + (y - x) * t)))
      .toString(16)
      .padStart(2, "0")
  return `#${ch(a.r, b.r)}${ch(a.g, b.g)}${ch(a.b, b.b)}`.toUpperCase()
}

/** Shift `color` toward black or white until it can be read on `background`. */
export function paintForBackground(color: string, background: string, min = 4.5): string {
  const base = normalizeHex(color)
  const bg = normalizeHex(background)
  if (!base || !bg) return base || color
  if (contrastRatio(base, bg) >= min) return base
  const target = relativeLuminance(bg) > 0.45 ? "#0F172A" : "#F8FAFC"
  let best = target
  for (let i = 1; i <= 16; i++) {
    best = mixHex(base, target, i / 16)
    if (contrastRatio(best, bg) >= min) return best
  }
  return best
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
  const explicitAccent = normalizeHex(brand?.accentColor)
  const accent =
    explicitAccent ||
    (relativeLuminance(primary) < 0.2 ? WQ_DEFAULT_ACCENT : primary)
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
  const darkPage = el.classList.contains("dark")
  const pageBg = darkPage ? "#0B1220" : "#FFFFFF"
  const inkBg = darkPage ? "#020617" : "#0F172A"
  const onFill = contrastRatio("#F8FAFC", primary) >= 3 ? "#F8FAFC" : "#0F172A"
  const onInk = paintForBackground(primary, inkBg)
  const softOnInk =
    relativeLuminance(primary) < 0.35 ? "rgba(248,250,252,0.16)" : hexToRgba(onInk, 0.28)

  el.style.setProperty("--wq-brand", primary)
  el.style.setProperty("--wq-brand-text", paintForBackground(primary, pageBg))
  el.style.setProperty("--wq-brand-on-ink", onInk)
  el.style.setProperty("--wq-brand-soft-on-ink", softOnInk)
  el.style.setProperty("--wq-brand-deep", deep)
  el.style.setProperty("--wq-brand-soft", soft)
  el.style.setProperty("--wq-accent", primary)
  el.style.setProperty("--wq-action", accent)
  el.style.setProperty("--wq-action-text", paintForBackground(accent, pageBg))
  el.style.setProperty("--primary", primary)
  el.style.setProperty("--primary-foreground", onFill)
  el.style.setProperty("--sidebar-primary", primary)
  el.style.setProperty("--sidebar-primary-foreground", onFill)
}

let brandThemeWatch: MutationObserver | null = null

/** Recompute contrast tokens when the light/dark class flips. */
export function bindBrandToTheme() {
  applyBrandCssVars(readBrandFromStorage())
  if (brandThemeWatch || typeof document === "undefined") return
  brandThemeWatch = new MutationObserver(() => {
    applyBrandCssVars(readBrandFromStorage())
  })
  brandThemeWatch.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  })
}

export function clearBrandCssVars(
  el: HTMLElement | null = typeof document !== "undefined" ? document.documentElement : null
) {
  if (!el) return
  ;[
    "--wq-brand",
    "--wq-brand-text",
    "--wq-brand-on-ink",
    "--wq-brand-soft-on-ink",
    "--wq-brand-deep",
    "--wq-brand-soft",
    "--wq-accent",
    "--wq-action",
    "--wq-action-text",
    "--primary",
    "--primary-foreground",
    "--sidebar-primary",
    "--sidebar-primary-foreground",
  ].forEach((k) => el.style.removeProperty(k))
}
