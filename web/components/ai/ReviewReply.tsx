"use client"

import { useState } from "react"
import { Copy, Loader2, MessageCircle, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { suggestReviewReplyV1 } from "@/lib/apiV1"
import { waLink } from "@/components/quotes/quoteUi"
import { AiQuotaNotice } from "./AiQuotaNotice"

function waDigits(phone: string) {
  let d = String(phone || "").replace(/\D/g, "")
  if (d.length === 10 || d.length === 11) d = `55${d}`
  return d.length >= 12 ? d : ""
}

/** "Sugerir resposta" under a review: two options to copy or send on WhatsApp. */
export function ReviewReply({ orderId, phone }: { orderId: string; phone?: string }) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Awaited<ReturnType<typeof suggestReviewReplyV1>> | null>(null)
  const digits = waDigits(phone || "")

  const load = async () => {
    setBusy(true)
    try {
      setResult(await suggestReviewReplyV1(orderId))
    } catch (err: any) {
      toast.error(err?.message || "Não sugeriu agora")
    } finally {
      setBusy(false)
    }
  }

  if (!result) {
    return (
      <Button type="button" variant="ghost" size="sm" className="mt-2 h-8 rounded-lg px-2 text-[var(--wq-brand)]" disabled={busy} onClick={() => void load()}>
        {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
        Sugerir resposta
      </Button>
    )
  }

  return (
    <div className="mt-3 space-y-2">
      <AiQuotaNotice quota={result.aiQuota} />
      {result.ai ? (
        <span className="rounded-full bg-[var(--wq-brand)] px-1.5 py-0.5 text-[9px] font-bold text-white">IA</span>
      ) : null}
      {result.options.map((opt) => (
        <div key={opt.tone} className="rounded-xl border border-[var(--wq-border)] bg-[var(--wq-paper)]/60 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--wq-text-muted)]">{opt.label}</p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--wq-text)]">{opt.text}</p>
          <div className="mt-2 flex gap-2">
            {digits ? (
              <Button asChild size="sm" className="h-8 rounded-lg bg-[#25D366] text-[#073018] hover:bg-[#1ebe5d]">
                <a href={waLink(digits, opt.text)} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-1 h-3.5 w-3.5" /> Enviar
                </a>
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 rounded-lg"
              onClick={() => {
                void navigator.clipboard?.writeText(opt.text)
                toast.success("Resposta copiada")
              }}
            >
              <Copy className="mr-1 h-3.5 w-3.5" /> Copiar
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
