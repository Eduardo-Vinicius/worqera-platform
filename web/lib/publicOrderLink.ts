/**
 * Public client order URL: /p/{slug}/{code}?t={secretToken}
 */

export function buildPublicOrderPath(
  shopSlug: string | null | undefined,
  code: string | null | undefined,
  token?: string | null
): string {
  const slug = encodeURIComponent(String(shopSlug || "").trim())
  const c = encodeURIComponent(String(code || "").trim())
  const t = String(token || "").trim()
  if (!slug || !c) return ""
  const base = `/p/${slug}/${c}`
  return t ? `${base}?t=${encodeURIComponent(t)}` : base
}

export function buildPublicOrderUrl(
  origin: string,
  shopSlug: string | null | undefined,
  code: string | null | undefined,
  token?: string | null
): string {
  const base = String(origin || "").replace(/\/+$/, "")
  const path = buildPublicOrderPath(shopSlug, code, token)
  if (!path) return base
  return `${base}${path}`
}

/** Append extra query (e.g. item=1) preserving existing ?t= */
export function withPublicOrderQuery(url: string, key: string, value: string | number): string {
  if (!url) return url
  const sep = url.includes("?") ? "&" : "?"
  return `${url}${sep}${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
}
