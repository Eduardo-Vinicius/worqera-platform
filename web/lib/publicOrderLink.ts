/**
 * Link público: /p/o/{token}. O token não revela a empresa.
 * Sem token o endereço fica vazio — o link antigo com slug continua válido se já foi impresso.
 */

export function buildPublicOrderPath(
  _shopSlug: string | null | undefined,
  _code: string | null | undefined,
  token?: string | null
): string {
  const t = String(token || "").trim()
  if (!t) return ""
  return `/p/o/${encodeURIComponent(t)}`
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
