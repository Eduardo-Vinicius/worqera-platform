"use client"

import { useEffect, useState } from "react"
import { Check, Loader2, Pencil, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { customerSummaryV1 } from "@/lib/apiV1"
import { WORQERA_AI_CONTACT, resetLabel } from "./AiQuotaNotice"

/**
 * "O que vamos fazer" in the customer's words: shown on the laudo PDF and the
 * public tracking page. AI writes it (every plan, within the quota); the team can always edit.
 */
export function CustomerSummaryBox({
  orderId,
  summary,
  onSaved,
}: {
  orderId: string
  summary: { text: string; ai?: boolean; edited?: boolean } | null | undefined
  onSaved?: (text: string) => void
}) {
  const [text, setText] = useState(summary?.text || "")
  const [ai, setAi] = useState(Boolean(summary?.ai))
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState("")

  useEffect(() => {
    setText(summary?.text || "")
    setAi(Boolean(summary?.ai))
  }, [summary?.text, summary?.ai])

  const save = async () => {
    setBusy("save")
    try {
      const res = await customerSummaryV1(orderId, text.trim())
      setAi(false)
      setEditing(false)
      onSaved?.(res.customerSummary?.text || "")
      toast.success("Texto do cliente salvo")
    } catch (err: any) {
      toast.error(err?.message || "Não salvou")
    } finally {
      setBusy("")
    }
  }

  const generate = async () => {
    setBusy("ai")
    try {
      const res = await customerSummaryV1(orderId)
      if (res.customerSummary?.text) {
        setText(res.customerSummary.text)
        setAi(true)
        onSaved?.(res.customerSummary.text)
      } else if (res.aiQuota?.blocked) {
        toast.message("Limite de IA do mês atingido", {
          description: `Volta em ${resetLabel(res.aiQuota.resetsAt)}. Para mais usos, fale com a Worqera.`,
          action: { label: "Falar", onClick: () => window.open(WORQERA_AI_CONTACT, "_blank") },
        })
      } else {
        toast.message("A IA não respondeu agora. Escreva à mão ou tente de novo.")
      }
    } catch (err: any) {
      toast.message(err?.message || "Disponível no Business")
    } finally {
      setBusy("")
    }
  }

  return (
    <section className="rounded-xl border border-[var(--wq-border)] bg-[var(--wq-paper)]/60 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--wq-text-muted)]">
          O que o cliente lê
          {ai ? <span className="rounded-full bg-[var(--wq-brand)] px-1.5 py-0.5 text-[9px] font-bold text-white">IA</span> : null}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded-lg p-1.5 text-[var(--wq-text-muted)] hover:bg-[var(--wq-surface)]"
            onClick={() => void generate()}
            disabled={Boolean(busy)}
            title="Escrever com IA"
            aria-label="Escrever com IA"
          >
            {busy === "ai" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          </button>
          <button
            type="button"
            className="rounded-lg p-1.5 text-[var(--wq-text-muted)] hover:bg-[var(--wq-surface)]"
            onClick={() => setEditing((v) => !v)}
            aria-label="Editar"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      </div>
      {editing ? (
        <div className="mt-2 space-y-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ex.: Limpeza completa e pintura da sola. Fica pronto em 5 dias."
            className="min-h-20 rounded-[10px]"
          />
          <Button
            type="button"
            size="sm"
            className="rounded-[10px] bg-[var(--wq-action)] text-white"
            disabled={busy === "save"}
            onClick={() => void save()}
          >
            <Check className="mr-1 h-4 w-4" /> Salvar
          </Button>
        </div>
      ) : (
        <p className="mt-1 text-sm leading-relaxed text-[var(--wq-text)]">
          {text || <span className="text-[var(--wq-text-muted)]">Sem texto. Vai no laudo e na consulta do cliente.</span>}
        </p>
      )}
    </section>
  )
}
