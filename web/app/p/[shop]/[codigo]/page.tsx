"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { getPublicOrderV1 } from "@/lib/apiV1"

export default function PublicOrderByShopPage() {
  const params = useParams()
  const shop = String(params?.shop || "")
  const code = String(params?.codigo || "")
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!code || !shop) return
    getPublicOrderV1(code, shop)
      .then(setData)
      .catch((e) => setError(e.message || "Pedido não encontrado"))
  }, [code, shop])

  const sectorName = data?.currentSector?.name || data?.sectorName
  const shopName = data?.shop?.name

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--wq-paper)] p-4 text-[var(--wq-text)]">
      <div className="w-full max-w-md rounded-2xl border border-[var(--wq-border)] bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--wq-text-muted)]">
          {shopName || "Worqera"} · acompanhar
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl">Pedido</h1>
        {error && <p className="mt-4 text-sm text-[var(--wq-danger)]">{error}</p>}
        {!error && !data && (
          <p className="mt-4 text-sm text-[var(--wq-text-muted)]">Buscando…</p>
        )}
        {data && (
          <div className="mt-4 space-y-3">
            <p className="font-mono text-4xl font-semibold tracking-tight">{data.code || code}</p>
            <p className="text-[var(--wq-text-muted)]">{data.clientName}</p>
            <div className="flex flex-wrap gap-2">
              {sectorName && (
                <Badge className="rounded-full border-0 bg-[var(--wq-brand-soft)] text-[var(--wq-text)]">
                  {sectorName}
                </Badge>
              )}
              {data.status && (
                <Badge variant="outline" className="rounded-full capitalize">
                  {data.status}
                </Badge>
              )}
            </div>
            {data.shoeModel && (
              <p className="text-sm text-[var(--wq-text-muted)]">{data.shoeModel}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
