"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { getPublicOrderV1 } from "@/lib/apiV1"

/**
 * Legacy `/p/{code}` — first segment is named `shop` to match `/p/[shop]/[codigo]`
 * (Next.js requires the same dynamic slug name at this level).
 * Prefer `/p/{shopSlug}/{code}` for multi-tenant safety.
 */
export default function PublicOrderLegacyPage() {
  const params = useParams()
  const search = useSearchParams()
  const code = String(params?.shop || "")
  const shopHint = search.get("shop") || ""
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!code) return
    getPublicOrderV1(code, shopHint || undefined)
      .then((res) => {
        setData(res)
        const slug = (res as any)?.shop?.slug
        if (slug && typeof window !== "undefined") {
          window.history.replaceState(null, "", `/p/${slug}/${encodeURIComponent(code)}`)
        }
      })
      .catch((e) => setError(e.message || "Pedido não encontrado"))
  }, [code, shopHint])

  const sectorName = data?.currentSector?.name || data?.sectorName

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--wq-paper)] p-4 text-[var(--wq-text)]">
      <div className="w-full max-w-md rounded-2xl border border-[var(--wq-border)] bg-white p-6">
        <h1 className="font-[family-name:var(--font-display)] text-2xl">Acompanhar pedido</h1>
        {error && (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-[var(--wq-danger)]">{error}</p>
            <p className="text-xs text-[var(--wq-text-muted)]">
              Use o link da etiqueta com a oficina:{" "}
              <code className="font-mono">/p/&#123;oficina&#125;/&#123;código&#125;</code>
            </p>
          </div>
        )}
        {!error && !data && (
          <p className="mt-4 text-sm text-[var(--wq-text-muted)]">Buscando…</p>
        )}
        {data && (
          <div className="mt-4 space-y-3">
            <p className="font-mono text-4xl font-semibold">{data.code || code}</p>
            <p className="text-[var(--wq-text-muted)]">{data.clientName}</p>
            <div className="flex flex-wrap gap-2">
              {sectorName && <Badge>{sectorName}</Badge>}
              {data.status && (
                <Badge variant="outline" className="capitalize">
                  {data.status}
                </Badge>
              )}
            </div>
            {data.shop?.slug && (
              <Link
                className="text-sm text-[var(--wq-brand)] underline"
                href={`/p/${data.shop.slug}/${encodeURIComponent(data.code || code)}`}
              >
                Link permanente
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
