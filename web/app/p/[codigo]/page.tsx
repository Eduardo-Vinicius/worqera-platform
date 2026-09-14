"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getPublicOrderV1 } from "@/lib/apiV1"

export default function PublicOrderPage() {
  const params = useParams()
  const code = String(params?.codigo || "")
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!code) return
    getPublicOrderV1(code)
      .then(setData)
      .catch((e) => setError(e.message || "Pedido não encontrado"))
  }, [code])

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-serif">Acompanhar pedido</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="text-red-600">{error}</p>}
          {!error && !data && <p className="text-slate-500">Buscando…</p>}
          {data && (
            <div className="space-y-2">
              <p className="text-2xl font-bold">{data.code || code}</p>
              <p className="text-slate-600">{data.clientName}</p>
              {data.sectorName && <Badge>{data.sectorName}</Badge>}
              {data.status && <Badge variant="outline">{data.status}</Badge>}
              {data.shoeModel && <p className="text-sm text-slate-500">{data.shoeModel}</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
