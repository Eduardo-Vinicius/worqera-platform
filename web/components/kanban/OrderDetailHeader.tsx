"use client"

import { useState } from "react"
import { ArrowRight, Check, ChevronLeft, ChevronRight, Loader2, Mail, MessageCircle, PackageCheck, Pencil, Phone, PhoneOff, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatBRL } from "@/lib/orderMoney"
import { cn } from "@/lib/utils"
import { RECOVERY_HOW_LABEL } from "@/lib/recovery"
import { EmailHint } from "@/components/EmailHint"

export type HeaderMoveTarget = { id: string; name: string; current: boolean; terminal?: boolean }

export type PairTab = { itemId: string; itemIndex: number; label: string }

export type OrderDetailHeaderProps = {
  code: string
  clientName: string
  phone: string
  email: string
  sectorName?: string
  statusLabel?: string
  dueAt?: string | null
  openedByName?: string
  /** When set, "Aberto por" becomes a picker (fix current orders in one tap). */
  openedByPicker?: {
    value: string | null
    options: Array<{ id: string; name: string }>
    saving: boolean
    onPick: (id: string) => void
  } | null
  recovered?: { how?: string | null; byName?: string } | null
  itemCount: number
  /** Shop noun for one item ("par", "peça"). */
  pairNoun?: string
  /** True right after switching item: the code and tabs animate so the change is visible. */
  pairChanged?: boolean
  pairs?: PairTab[]
  activeItemId?: string | null
  onSelectPair?: (pair: PairTab) => void
  money: { visible: boolean; total: number; remaining: number }
  contact: {
    name: string
    phone: string
    email: string
    onName: (v: string) => void
    onPhone: (v: string) => void
    onEmail: (v: string) => void
    onSave: () => Promise<void> | void
    saving: boolean
    editable: boolean
  }
  /** `detail` = second, smaller line (e.g. the next sector), so the button never truncates on phones. */
  primary: { label: string; detail?: string; onClick: () => void; busy?: boolean; kind: "advance" | "deliver" } | null
  onNotify: () => void
  onRefuse: (() => void) | null
  moveTargets: HeaderMoveTarget[]
  onMove: (sectorId: string) => void
  moving: boolean
  onClose: () => void
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "?"
  return ((parts[0][0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase()
}

function phoneLabel(raw: string) {
  const d = raw.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "")
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return raw
}

/** Top of the kanban order drawer: who, how to reach them, what is due and the next move. */
export function OrderDetailHeader(props: OrderDetailHeaderProps) {
  const [editing, setEditing] = useState(false)
  const { contact, money } = props
  const waiting = props.statusLabel === "Entregue" || props.statusLabel === "Pronto" || props.statusLabel === "Cancelado"
  const late = props.dueAt && !waiting ? new Date(props.dueAt).getTime() < Date.now() : false
  const digits = props.phone.replace(/\D/g, "")

  return (
    <header className="border-b border-[var(--wq-border)] bg-[var(--wq-surface)] px-5 pb-4 pt-5">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--wq-brand-soft)] text-base font-semibold text-[var(--wq-brand)]">
          {initials(props.clientName)}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold tracking-tight">{props.clientName || "Cliente"}</h2>
          <p className="flex flex-wrap items-center gap-x-1.5 font-mono text-sm text-[var(--wq-text-muted)]">
            <span
              key={props.code}
              className={cn(
                "inline-block rounded-md",
                props.pairChanged &&
                  "animate-in fade-in zoom-in-90 duration-300 bg-[var(--wq-brand-soft)] px-1 font-semibold text-[var(--wq-brand)]"
              )}
            >
              #{props.code}
            </span>
            {props.openedByPicker && props.openedByPicker.options.length ? (
              <label
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-sans text-xs",
                  props.openedByPicker.value
                    ? "border-[var(--wq-border)]"
                    : "border-amber-300 bg-amber-50 font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                )}
              >
                {props.openedByPicker.saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                Aberto por
                <select
                  className="max-w-[140px] bg-transparent font-semibold text-[var(--wq-text)] outline-none"
                  value={props.openedByPicker.value || ""}
                  disabled={props.openedByPicker.saving}
                  onChange={(e) => e.target.value && props.openedByPicker?.onPick(e.target.value)}
                  aria-label="Quem abriu o pedido"
                >
                  {!props.openedByPicker.value ? <option value="">quem? ▾</option> : null}
                  {props.openedByPicker.value && !props.openedByPicker.options.some((o) => o.id === props.openedByPicker?.value) ? (
                    <option value={props.openedByPicker.value}>{props.openedByName || "—"}</option>
                  ) : null}
                  {props.openedByPicker.options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : props.openedByName ? (
              <span className="font-sans">· Aberto por {props.openedByName}</span>
            ) : null}
          </p>
          {props.recovered ? (
            <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              Recuperado
              {props.recovered.how ? ` · ${RECOVERY_HOW_LABEL[props.recovered.how] || props.recovered.how}` : ""}
              {props.recovered.byName ? ` · ${props.recovered.byName}` : ""}
            </p>
          ) : null}
          {props.pairs && props.pairs.length > 1
            ? (() => {
                const pairs = props.pairs
                const activeIndex = Math.max(
                  0,
                  pairs.findIndex((p) => (props.activeItemId ? p.itemId === props.activeItemId : p.itemIndex === 0))
                )
                const go = (delta: number) => {
                  const next = pairs[activeIndex + delta]
                  if (next) props.onSelectPair?.(next)
                }
                return (
                  <div className="mt-2 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => go(-1)}
                      disabled={activeIndex <= 0}
                      className="rounded-full border border-[var(--wq-border)] p-1 text-[var(--wq-text-muted)] hover:border-[var(--wq-brand)]/40 disabled:opacity-30"
                      aria-label={`${props.pairNoun || "Item"} anterior`}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none]" role="tablist" aria-label="Itens do pedido">
                      {pairs.map((pair, i) => {
                        const on = i === activeIndex
                        return (
                          <button
                            key={pair.itemId || String(pair.itemIndex)}
                            type="button"
                            role="tab"
                            aria-selected={on}
                            className={cn(
                              "shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all duration-200",
                              on
                                ? "scale-105 border-[var(--wq-brand)] bg-[var(--wq-brand)] text-white shadow-sm"
                                : "border-[var(--wq-border)] text-[var(--wq-text-muted)] hover:border-[var(--wq-brand)]/40 hover:text-[var(--wq-text)]"
                            )}
                            onClick={() => props.onSelectPair?.(pair)}
                          >
                            {pair.label}
                          </button>
                        )
                      })}
                    </div>
                    <span className="shrink-0 font-mono text-[11px] text-[var(--wq-text-muted)]">
                      {activeIndex + 1}/{pairs.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => go(1)}
                      disabled={activeIndex >= pairs.length - 1}
                      className="rounded-full border border-[var(--wq-border)] p-1 text-[var(--wq-text-muted)] hover:border-[var(--wq-brand)]/40 disabled:opacity-30"
                      aria-label={`Próximo ${props.pairNoun || "item"}`}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })()
            : null}
        </div>
        <button
          type="button"
          onClick={props.onClose}
          className="rounded-lg p-1.5 text-[var(--wq-text-muted)] hover:bg-[var(--wq-paper)]"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {editing ? (
        <div className="mt-3 space-y-2 rounded-xl border border-[var(--wq-border)] bg-[var(--wq-paper)] p-3">
          <Input value={contact.name} onChange={(e) => contact.onName(e.target.value)} placeholder="Nome do cliente" className="h-9 rounded-[10px] bg-[var(--wq-surface)] text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <Input value={contact.phone} onChange={(e) => contact.onPhone(e.target.value)} placeholder="Telefone" className="h-9 rounded-[10px] bg-[var(--wq-surface)] text-sm" />
            <Input type="email" value={contact.email} onChange={(e) => contact.onEmail(e.target.value)} placeholder="E-mail" className="h-9 rounded-[10px] bg-[var(--wq-surface)] text-sm" />
          </div>
          <EmailHint value={contact.email} onFix={contact.onEmail} />
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" className="rounded-[10px]" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={contact.saving}
              className="rounded-[10px] bg-[var(--wq-action)] text-white"
              onClick={async () => {
                await contact.onSave()
                setEditing(false)
              }}
            >
              {contact.saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1.5 h-3.5 w-3.5" />}
              Salvar
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
          {props.phone ? (
            <a
              href={`tel:${digits}`}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--wq-border)] px-2.5 py-1 font-medium hover:border-[var(--wq-brand)]/40"
            >
              <Phone className="h-3 w-3" /> {phoneLabel(props.phone)}
            </a>
          ) : (
            <span className="rounded-full border border-dashed border-[var(--wq-border)] px-2.5 py-1 text-[var(--wq-text-muted)]">Sem telefone</span>
          )}
          {props.email ? (
            <a
              href={`mailto:${props.email}`}
              className="inline-flex max-w-[220px] items-center gap-1 truncate rounded-full border border-[var(--wq-border)] px-2.5 py-1 font-medium hover:border-[var(--wq-brand)]/40"
            >
              <Mail className="h-3 w-3 shrink-0" /> <span className="truncate">{props.email}</span>
            </a>
          ) : (
            <span className="rounded-full border border-dashed border-[var(--wq-border)] px-2.5 py-1 text-[var(--wq-text-muted)]">Sem e-mail</span>
          )}
          {contact.editable ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 font-medium text-[var(--wq-brand)] hover:bg-[var(--wq-brand-soft)]"
            >
              <Pencil className="h-3 w-3" /> Editar
            </button>
          ) : null}
        </div>
      )}

      <div className="mt-4 flex items-end justify-between gap-3">
        {money.visible ? (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--wq-text-muted)]">
              {money.total <= 0.009 ? "Valor" : money.remaining > 0.009 ? "Falta receber" : "Total"}
            </p>
            <p
              className={cn(
                "font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums tracking-tight",
                money.total > 0.009 && money.remaining > 0.009 && "text-amber-700 dark:text-amber-400"
              )}
            >
              {money.total <= 0.009 ? "Pendente" : formatBRL(money.remaining > 0.009 ? money.remaining : money.total)}
            </p>
            {money.total > 0.009 ? (
              <p className="text-xs text-[var(--wq-text-muted)]">
                {money.remaining > 0.009 ? `de ${formatBRL(money.total)}` : "Pago"}
              </p>
            ) : null}
          </div>
        ) : (
          <div />
        )}
        <div className="flex flex-col items-end gap-1.5">
          {props.sectorName ? (
            <span className="rounded-full bg-[var(--wq-brand)] px-2.5 py-0.5 text-xs font-semibold text-white">{props.sectorName}</span>
          ) : null}
          <div className="flex flex-wrap justify-end gap-1">
            {props.statusLabel ? (
              <span className="rounded-full border border-[var(--wq-border)] px-2 py-0.5 text-[11px] font-medium text-[var(--wq-text-muted)]">
                {props.statusLabel}
              </span>
            ) : null}
            {props.dueAt ? (
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                  late
                    ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
                    : "border-[var(--wq-border)] text-[var(--wq-text-muted)]"
                )}
              >
                {late ? "Atrasado · " : "Prazo "}
                {new Date(props.dueAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
              </span>
            ) : null}
            {props.itemCount > 1 ? (
              <span className="rounded-full border border-[var(--wq-border)] px-2 py-0.5 text-[11px] font-medium text-[var(--wq-text-muted)]">
                {props.itemCount} itens
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className={cn("mt-4 grid grid-cols-2 gap-2", props.primary && props.onRefuse ? "sm:grid-cols-[1.4fr_1fr_1fr]" : props.primary ? "sm:grid-cols-[1.4fr_1fr]" : "")}>
        {props.primary ? (
          <Button
            type="button"
            disabled={props.primary.busy || props.moving}
            onClick={props.primary.onClick}
            className="col-span-2 h-12 min-w-0 rounded-[10px] bg-[var(--wq-action)] px-3 text-white hover:bg-[var(--wq-action)]/90 sm:col-span-1"
            title={props.primary.detail ? `${props.primary.label} · ${props.primary.detail}` : props.primary.label}
          >
            {props.primary.busy || props.moving ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : props.primary.kind === "deliver" ? (
              <PackageCheck className="mr-1.5 h-4 w-4" />
            ) : (
              <ArrowRight className="mr-1.5 h-4 w-4" />
            )}
            <span className="flex min-w-0 flex-col items-start leading-tight">
              <span className="font-semibold">{props.primary.label}</span>
              {props.primary.detail ? <span className="max-w-full truncate text-[11px] font-normal opacity-85">para {props.primary.detail}</span> : null}
            </span>
          </Button>
        ) : null}
        <Button
          type="button"
          onClick={props.onNotify}
          className={cn("h-12 rounded-[10px] bg-[#25D366] text-[#073018] hover:bg-[#1ebe5d]", !props.onRefuse && "col-span-2 sm:col-span-1")}
        >
          <MessageCircle className="mr-1.5 h-4 w-4" /> Avisar
        </Button>
        {props.onRefuse ? (
          <Button
            type="button"
            variant="outline"
            onClick={props.onRefuse}
            className="h-12 rounded-[10px] border-[var(--wq-brand)]/30 text-[var(--wq-brand)] hover:bg-[var(--wq-brand-soft)]"
            title="Cliente não fechou → vai para Orçamentos"
          >
            <PhoneOff className="mr-1.5 h-4 w-4" /> Não fechou
          </Button>
        ) : null}
      </div>

      {props.moveTargets.length > 1 ? (
        <div className="mt-3">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--wq-text-muted)]">Mover para</p>
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {props.moveTargets.map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={t.current || props.moving}
                onClick={() => props.onMove(t.id)}
                className={cn(
                  "shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition",
                  t.current
                    ? "border-[var(--wq-brand)] bg-[var(--wq-brand)] text-white"
                    : "border-[var(--wq-border)] text-[var(--wq-text)] hover:border-[var(--wq-brand)]/50 hover:bg-[var(--wq-brand-soft)]",
                  t.terminal && !t.current && "border-emerald-300 text-emerald-800 dark:border-emerald-800 dark:text-emerald-300"
                )}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  )
}
