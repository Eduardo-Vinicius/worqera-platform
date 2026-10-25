"use client"

import { useEffect, useState } from "react"
import { Check, Loader2, Plus, UserRound } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getClientesService } from "@/lib/apiService"
import { createQuoteV1, type Quote, type QuoteReason } from "@/lib/apiV1"
import { FollowUpPicker, ReasonPicker } from "./ReasonPicker"
import { followUpFromDays, formatPhone } from "./quoteUi"

type ClientHit = { id: string; nomeCompleto?: string; name?: string; telefone?: string; phone?: string; email?: string }

const empty = () => ({
  clientId: "" as string,
  name: "",
  phone: "",
  email: "",
  what: "",
  value: "",
  reasonNote: "",
})

export function NewQuoteDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (quote: Quote) => void
}) {
  const [form, setForm] = useState(empty)
  const [reason, setReason] = useState<QuoteReason | null>(null)
  const [followUpAt, setFollowUpAt] = useState<string | null>(null)
  const [hits, setHits] = useState<ClientHit[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(empty())
    setReason(null)
    setFollowUpAt(followUpFromDays(1))
    setHits([])
  }, [open])

  useEffect(() => {
    const term = form.name.trim()
    if (!open || form.clientId || term.length < 2) {
      setHits([])
      return
    }
    let cancelled = false
    const handle = window.setTimeout(() => {
      getClientesService({ q: term, limit: 5 })
        .then((res) => {
          if (!cancelled) setHits((res.data || []) as ClientHit[])
        })
        .catch(() => {
          if (!cancelled) setHits([])
        })
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [form.name, form.clientId, open])

  const set = (key: keyof ReturnType<typeof empty>, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const pick = (c: ClientHit) => {
    setForm((prev) => ({
      ...prev,
      clientId: String(c.id),
      name: c.nomeCompleto || c.name || prev.name,
      phone: c.telefone || c.phone || prev.phone,
      email: c.email || prev.email,
    }))
    setHits([])
  }

  const submit = async () => {
    if (!form.name.trim()) {
      toast.message("Informe o nome do cliente")
      return
    }
    setSaving(true)
    try {
      const { quote } = await createQuoteV1({
        clientId: form.clientId || null,
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        what: form.what.trim(),
        value: Number(String(form.value).replace(",", ".")) || 0,
        reason,
        reasonNote: form.reasonNote.trim(),
        followUpAt,
      })
      toast.success("Orçamento registrado")
      onOpenChange(false)
      onCreated(quote)
    } catch (err: any) {
      toast.error(err?.message || "Não salvou")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-h-[92dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo orçamento</DialogTitle>
          <DialogDescription>
            Cliente que pediu preço e não fechou no balcão. Não abre pedido nem entra no kanban.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="q-name">Cliente</Label>
            <div className="relative">
              <Input
                id="q-name"
                value={form.name}
                autoFocus
                autoComplete="off"
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value, clientId: "" }))}
                placeholder="Nome ou busque um cliente"
                className="h-11 rounded-[10px] pr-24"
              />
              {form.clientId ? (
                <span className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-full bg-[var(--wq-brand-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--wq-brand)]">
                  <Check className="h-3 w-3" /> Cadastrado
                </span>
              ) : null}
            </div>
            {hits.length ? (
              <ul className="overflow-hidden rounded-xl border border-[var(--wq-border)] bg-[var(--wq-surface)]">
                {hits.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => pick(c)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-[var(--wq-paper)]"
                    >
                      <UserRound className="h-4 w-4 text-[var(--wq-text-muted)]" />
                      <span className="min-w-0 flex-1 truncate font-medium">{c.nomeCompleto || c.name}</span>
                      <span className="shrink-0 text-xs text-[var(--wq-text-muted)]">
                        {formatPhone(c.telefone || c.phone || "")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="q-phone">WhatsApp</Label>
              <Input
                id="q-phone"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="(11) 99999-0000"
                className="h-11 rounded-[10px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="q-value">Valor orçado</Label>
              <Input
                id="q-value"
                inputMode="decimal"
                value={form.value}
                onChange={(e) => set("value", e.target.value)}
                placeholder="R$ 0"
                className="h-11 rounded-[10px]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="q-what">O que queria</Label>
            <Input
              id="q-what"
              value={form.what}
              onChange={(e) => set("what", e.target.value)}
              placeholder="Ex.: pintura e troca de sola no Jordan 1"
              className="h-11 rounded-[10px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Por que não fechou</Label>
            <ReasonPicker value={reason} onChange={setReason} />
            <Textarea
              value={form.reasonNote}
              onChange={(e) => set("reasonNote", e.target.value)}
              placeholder="Detalhe (opcional)"
              className="min-h-16 rounded-[10px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Ligar de novo</Label>
            <FollowUpPicker value={followUpAt} onChange={setFollowUpAt} />
          </div>

          <Button
            type="button"
            className="h-11 w-full rounded-[10px] bg-[var(--wq-brand)] text-white hover:bg-[var(--wq-brand-deep)]"
            disabled={saving}
            onClick={() => void submit()}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Registrar orçamento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
