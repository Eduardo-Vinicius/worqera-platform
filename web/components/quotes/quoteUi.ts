import type { Quote, QuoteReason, QuoteStage } from "@/lib/apiV1"

export const STAGES: Array<{ id: QuoteStage; label: string; hint: string }> = [
  { id: "new", label: "Novo", hint: "Ainda sem contato" },
  { id: "contact", label: "Em contato", hint: "Já falou com a loja" },
  { id: "followup", label: "Retorno", hint: "Tem dia para ligar" },
  { id: "won", label: "Recuperado", hint: "Voltou e fechou" },
  { id: "lost", label: "Perdido", hint: "Desistiu de vez" },
]

export const STAGE_LABEL: Record<QuoteStage, string> = Object.fromEntries(
  STAGES.map((s) => [s.id, s.label])
) as Record<QuoteStage, string>

export const REASONS: Array<{ id: QuoteReason; label: string }> = [
  { id: "price", label: "Preço" },
  { id: "thinking", label: "Vai pensar" },
  { id: "deadline", label: "Prazo" },
  { id: "other_shop", label: "Foi em outro lugar" },
  { id: "no_need", label: "Não precisa mais" },
  { id: "other", label: "Outro" },
]

export const FOLLOW_UP_PRESETS: Array<{ id: string; label: string; days: number | null }> = [
  { id: "today", label: "Hoje", days: 0 },
  { id: "1", label: "Amanhã", days: 1 },
  { id: "3", label: "3 dias", days: 3 },
  { id: "7", label: "1 semana", days: 7 },
  { id: "15", label: "15 dias", days: 15 },
  { id: "30", label: "1 mês", days: 30 },
  { id: "none", label: "Sem data", days: null },
]

/** 10:00 local on the chosen day — a sane hour to call. */
export function followUpFromDays(days: number | null): string | null {
  if (days == null) return null
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(10, 0, 0, 0)
  if (days === 0 && d.getTime() < Date.now()) d.setTime(Date.now() + 60 * 1000)
  return d.toISOString()
}

export function followUpFromDateInput(value: string): string | null {
  if (!value) return null
  const d = new Date(`${value}T10:00:00`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function dateInputValue(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function brl(value: number, digits = 0) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(Number(value) || 0)
}

export function followUpLabel(q: Pick<Quote, "followUp" | "followUpAt">) {
  const { state, days } = q.followUp
  if (state === "overdue") return days === 1 ? "Atrasado 1 dia" : `Atrasado ${days} dias`
  if (state === "today") return "Ligar hoje"
  if (state === "later") {
    if (days === 1) return "Amanhã"
    if (!q.followUpAt) return `Em ${days} dias`
    return new Date(q.followUpAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
  }
  return "Sem data"
}

export function followUpTone(state: Quote["followUp"]["state"]) {
  if (state === "overdue") return "border-rose-300/70 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300"
  if (state === "today") return "border-amber-300/70 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
  if (state === "later") return "border-[var(--wq-border)] bg-[var(--wq-paper)] text-[var(--wq-text-muted)]"
  return "border-dashed border-[var(--wq-border)] text-[var(--wq-text-muted)]"
}

export function priorityDot(level: Quote["priority"]["level"]) {
  if (level === "high") return "bg-rose-500"
  if (level === "medium") return "bg-amber-400"
  if (level === "low") return "bg-slate-300 dark:bg-slate-600"
  return "bg-transparent"
}

export const PRIORITY_LABEL: Record<Quote["priority"]["level"], string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
  none: "",
}

export function stageTone(stage: QuoteStage) {
  if (stage === "won") return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30"
  if (stage === "lost") return "bg-[var(--wq-paper)] text-[var(--wq-text-muted)] border-[var(--wq-border)]"
  if (stage === "followup") return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30"
  if (stage === "contact") return "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/30"
  return "bg-[var(--wq-brand-soft)] text-[var(--wq-brand)] border-[var(--wq-brand)]/25"
}

export function initials(name: string) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "?"
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase()
}

export function formatPhone(phone: string) {
  const d = String(phone || "").replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "")
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return phone || ""
}

export function waLink(phoneDigits: string, text?: string) {
  if (!phoneDigits) return ""
  return `https://wa.me/${phoneDigits}${text ? `?text=${encodeURIComponent(text)}` : ""}`
}

export function relativeTime(iso: string | null) {
  if (!iso) return ""
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.round(diff / 60000)
  if (min < 1) return "agora"
  if (min < 60) return `há ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.round(h / 24)
  if (d < 30) return d === 1 ? "ontem" : `há ${d} dias`
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}
