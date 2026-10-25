"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, PhoneOff } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { refuseOrderQuoteV1, type Quote, type QuoteReason } from "@/lib/apiV1"
import { FollowUpPicker, ReasonPicker } from "./ReasonPicker"
import { brl, followUpFromDays } from "./quoteUi"

export function RefuseQuoteDialog({
  open,
  onOpenChange,
  order,
  onDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: { id: string; code?: string; clientName?: string; total?: number } | null
  onDone?: (result: { order: any; quote: Quote }) => void
}) {
  const router = useRouter()
  const [reason, setReason] = useState<QuoteReason | null>(null)
  const [note, setNote] = useState("")
  const [followUpAt, setFollowUpAt] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setReason(null)
    setNote("")
    setFollowUpAt(followUpFromDays(3))
  }, [open])

  const submit = async () => {
    if (!order?.id) return
    if (!reason) {
      toast.message("Escolha o motivo")
      return
    }
    setSaving(true)
    try {
      const result = await refuseOrderQuoteV1(order.id, {
        reason,
        reasonNote: note.trim() || undefined,
        followUpAt,
      })
      toast.success(`#${order.code || ""} foi para Orçamentos`, {
        description: followUpAt ? "Já está na lista para ligar." : "Fica no quadro, sem data.",
        action: { label: "Abrir", onClick: () => router.push(`/orcamentos?open=${encodeURIComponent(result.quote.id)}`) },
      })
      onOpenChange(false)
      onDone?.(result)
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível registrar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PhoneOff className="h-5 w-5 text-[var(--wq-brand)]" />
            Cliente não fechou
          </DialogTitle>
          <DialogDescription>
            {order?.code ? `#${order.code}` : "Pedido"}
            {order?.clientName ? ` · ${order.clientName}` : ""}
            {order?.total ? ` · ${brl(order.total)}` : ""}. Sai da fila de produção e vai para Orçamentos, com o motivo e o dia de ligar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Por que não fechou?</Label>
            <ReasonPicker value={reason} onChange={setReason} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="refuse-note">Detalhe</Label>
            <Textarea
              id="refuse-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex.: achou caro a pintura, quer só a limpeza"
              className="min-h-20 rounded-[10px]"
            />
          </div>
          <div className="space-y-2">
            <Label>Ligar de novo</Label>
            <FollowUpPicker value={followUpAt} onChange={setFollowUpAt} />
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="rounded-[10px]" disabled={saving} onClick={() => onOpenChange(false)}>
              Voltar
            </Button>
            <Button
              type="button"
              className="rounded-[10px] bg-[var(--wq-brand)] text-white hover:bg-[var(--wq-brand-deep)]"
              disabled={saving}
              onClick={() => void submit()}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Mover para Orçamentos
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
