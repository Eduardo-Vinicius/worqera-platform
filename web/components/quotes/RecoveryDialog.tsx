"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, Loader2, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { listActiveEmployeesV1, type Quote, type QuoteReason, type RecoveryInput } from "@/lib/apiV1"
import { RECOVERY_HOWS, type RecoveryHow } from "@/lib/recovery"
import { cn } from "@/lib/utils"
import { REASONS } from "./quoteUi"

const chip = (on: boolean) =>
  cn(
    "inline-flex h-8 items-center gap-1 rounded-full border px-3 text-sm transition",
    on
      ? "border-emerald-600 bg-emerald-600 font-semibold text-white"
      : "border-[var(--wq-border)] bg-[var(--wq-surface)] text-[var(--wq-text)] hover:border-emerald-500/60"
  )

/** "Como recuperou?" — three taps: the real problem, how it was turned around, who helped. */
export function RecoveryDialog({
  quote,
  open,
  busy,
  onClose,
  onConfirm,
}: {
  quote: Quote | null
  open: boolean
  busy: boolean
  onClose: () => void
  onConfirm: (input: RecoveryInput) => void
}) {
  const [realReason, setRealReason] = useState<QuoteReason | null>(null)
  const [how, setHow] = useState<RecoveryHow | null>(null)
  const [helpers, setHelpers] = useState<string[]>([])
  const [note, setNote] = useState("")
  const [employees, setEmployees] = useState<Array<{ id: string; name: string }> | null>(null)

  const actedNames = useMemo(() => {
    const set = new Set<string>()
    for (const a of quote?.activity || []) {
      if (["call", "whatsapp", "note", "reply"].includes(a.kind) && a.byName) set.add(a.byName)
    }
    return [...set]
  }, [quote])

  useEffect(() => {
    if (!open || !quote) return
    setRealReason(quote.reason || null)
    setHow(null)
    setNote("")
    let cancelled = false
    listActiveEmployeesV1()
      .then((rows) => {
        if (cancelled) return
        setEmployees(rows)
        const acted = new Set(actedNames.map((n) => n.toLowerCase()))
        setHelpers(rows.filter((r) => acted.has(r.name.toLowerCase())).map((r) => r.id))
      })
      .catch(() => !cancelled && setEmployees([]))
    return () => {
      cancelled = true
    }
  }, [open, quote, actedNames])

  const toggleHelper = (id: string) =>
    setHelpers((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-emerald-600" />
            Como recuperou {quote?.name ? quote.name.split(" ")[0] : "o cliente"}?
          </DialogTitle>
          <DialogDescription>
            Fica registrado no orçamento e entra na análise de Recuperados.
            {quote?.contactCount ? ` Foram ${quote.contactCount} contato${quote.contactCount === 1 ? "" : "s"} até aqui.` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">1. O problema era</p>
            <div className="flex flex-wrap gap-1.5">
              {REASONS.map((r) => (
                <button key={r.id} type="button" className={chip(realReason === r.id)} onClick={() => setRealReason(r.id)}>
                  {realReason === r.id ? <Check className="h-3.5 w-3.5" /> : null}
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">2. Como reverteu</p>
            <div className="flex flex-wrap gap-1.5">
              {RECOVERY_HOWS.map((h) => (
                <button key={h.id} type="button" className={chip(how === h.id)} onClick={() => setHow(h.id)}>
                  {how === h.id ? <Check className="h-3.5 w-3.5" /> : null}
                  {h.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">3. Quem ajudou</p>
            {employees === null ? (
              <Loader2 className="h-4 w-4 animate-spin text-[var(--wq-text-muted)]" />
            ) : employees.length ? (
              <div className="flex flex-wrap gap-1.5">
                {employees.map((e) => (
                  <button key={e.id} type="button" className={chip(helpers.includes(e.id))} onClick={() => toggleHelper(e.id)}>
                    {helpers.includes(e.id) ? <Check className="h-3.5 w-3.5" /> : null}
                    {e.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--wq-text-muted)]">Sem funcionários cadastrados. Conta quem registrou contatos no histórico.</p>
            )}
            {actedNames.length ? (
              <p className="mt-1.5 text-xs text-[var(--wq-text-muted)]">No histórico: {actedNames.join(", ")}</p>
            ) : null}
          </div>

          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Detalhe (opcional): ex. dei 10% e prometi para sexta"
            className="rounded-[10px]"
          />
        </div>

        <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={busy}
            className="rounded-[10px] bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => onConfirm({ how, realReason, note: note.trim(), helperEmployeeIds: helpers })}
          >
            {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Trophy className="mr-1.5 h-4 w-4" />}
            Marcar recuperado
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
