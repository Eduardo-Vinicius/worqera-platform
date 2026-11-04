"use client"

import { useEffect, useState } from "react"
import { Check, Pencil } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { customerSummaryV1 } from "@/lib/apiV1"

/**
 * "O que vamos fazer" in the customer's words: shown on the laudo PDF and the
 * public tracking page. Written by the team; the AI version is paused (it said
 * things different from what was agreed at the counter), so old AI texts stay hidden.
 */
export function CustomerSummaryBox({
  orderId,
  summary,
  onSaved,
}: {
  orderId: string
  summary: { text: string; ai?: boolean; edited?: boolean; visibleToClient?: boolean } | null | undefined
  onSaved?: (text: string) => void
}) {
  const hiddenAi = (s: typeof summary) => Boolean(s?.text) && (s?.visibleToClient === false || (s?.visibleToClient == null && s?.ai && !s?.edited))
  const [text, setText] = useState(summary?.text || "")
  const [hidden, setHidden] = useState(hiddenAi(summary))
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setText(summary?.text || "")
    setHidden(hiddenAi(summary))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary?.text, summary?.ai, summary?.edited, summary?.visibleToClient])

  const save = async () => {
    setBusy(true)
    try {
      const res = await customerSummaryV1(orderId, text.trim())
      setHidden(false)
      setEditing(false)
      onSaved?.(res.customerSummary?.text || "")
      toast.success("Texto do cliente salvo")
    } catch (err: any) {
      toast.error(err?.message || "Não salvou")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-xl border border-[var(--wq-border)] bg-[var(--wq-paper)]/60 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--wq-text-muted)]">O que o cliente lê</p>
        <button
          type="button"
          className="rounded-lg p-1.5 text-[var(--wq-text-muted)] hover:bg-[var(--wq-surface)]"
          onClick={() => setEditing((v) => !v)}
          aria-label="Editar"
        >
          <Pencil className="h-4 w-4" />
        </button>
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
            disabled={busy}
            onClick={() => void save()}
          >
            <Check className="mr-1 h-4 w-4" /> Salvar
          </Button>
        </div>
      ) : (
        <>
          <p className={`mt-1 text-sm leading-relaxed ${hidden ? "text-[var(--wq-text-muted)] line-through" : "text-[var(--wq-text)]"}`}>
            {text || <span className="text-[var(--wq-text-muted)]">Sem texto. Se escrever, vai no laudo e na consulta do cliente.</span>}
          </p>
          {hidden ? (
            <p className="mt-1 text-xs text-[var(--wq-text-muted)]">Texto da IA: não aparece para o cliente. Edite e salve para publicar.</p>
          ) : null}
        </>
      )}
    </section>
  )
}
