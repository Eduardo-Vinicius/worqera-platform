"use client"

import { useEffect, useMemo, useState } from "react"
import { Copy, Loader2, Mail, MessageCircle, Sparkles } from "lucide-react"
import { improveClientMessageV1 } from "@/lib/apiV1"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { buildWaMeUrl, DEFAULT_WA_TEMPLATES, fillWaTemplate } from "@/lib/whatsapp"
import { cn } from "@/lib/utils"

type Templates = Partial<Record<keyof typeof DEFAULT_WA_TEMPLATES, string>>

export type NotifyClientInfo = {
  orderId?: string
  clientName: string
  phone: string
  email: string
  code: string
  link: string
  shopName: string
  sectorName: string
  status: string
  dueAt?: string | null
  remaining?: number
  templates?: Templates
}

type Option = { id: string; label: string; text: string }

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || ""
}

function brl(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

/** Ready-made messages for the order's current moment, using the shop's own templates first. */
export function buildClientMessages(info: NotifyClientInfo): Option[] {
  const vars = {
    code: info.code,
    client: firstName(info.clientName),
    link: info.link,
    sector: info.sectorName,
    shop: info.shopName,
  }
  const tpl = (key: keyof typeof DEFAULT_WA_TEMPLATES) => fillWaTemplate(info.templates?.[key] || DEFAULT_WA_TEMPLATES[key], vars)
  const hi = vars.client ? `Oi, ${vars.client}!` : "Oi!"
  const balance = (info.remaining || 0) > 0.009 ? ` O saldo para retirada é ${brl(info.remaining || 0)}.` : ""
  const late = info.dueAt && new Date(info.dueAt).getTime() < Date.now() && info.status !== "ready"

  const options: Option[] = []
  if (info.status === "ready") {
    options.push({ id: "ready", label: "Pronto para retirar", text: `${tpl("ready")}${balance}`.trim() })
  }
  if (late) {
    options.push({
      id: "late",
      label: "Vai atrasar",
      text: `${hi} Passando para avisar que o pedido #${info.code} precisa de mais um pouquinho de tempo aqui na ${info.shopName}. Assim que ficar pronto, te aviso. Acompanhe: ${info.link}`,
    })
  }
  if (info.status !== "ready" && info.status !== "delivered") {
    options.push({ id: "moved", label: "Andamento", text: tpl("moved") })
  }
  options.push({ id: "link", label: "Link do pedido", text: tpl("publicLink") })
  options.push({
    id: "thanks",
    label: "Agradecer",
    text: `${hi} Obrigado por escolher a ${info.shopName}! Se puder, conta como foi o serviço do pedido #${info.code}: ${info.link}`,
  })
  return options
}

export function NotifyClientDialog({
  open,
  onOpenChange,
  info,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  info: NotifyClientInfo | null
}) {
  const options = useMemo(() => (info ? buildClientMessages(info) : []), [info])
  const [picked, setPicked] = useState("")
  const [text, setText] = useState("")
  const [improving, setImproving] = useState(false)
  const [aiDone, setAiDone] = useState(false)

  const improve = async () => {
    if (!info?.orderId || !text.trim()) return
    setImproving(true)
    try {
      const res = await improveClientMessageV1(info.orderId, text)
      if (res.locked) {
        toast.message("A IA não está disponível no seu plano agora", { description: "A mensagem pronta continua valendo." })
      } else if (res.ai) {
        setText(res.text)
        setAiDone(true)
      } else {
        toast.message("A IA não mudou a mensagem desta vez")
      }
    } catch (err: any) {
      toast.error(err?.message || "Não deu para melhorar agora")
    } finally {
      setImproving(false)
    }
  }

  useEffect(() => {
    if (!open || !options.length) return
    setPicked(options[0].id)
    setText(options[0].text)
    setAiDone(false)
  }, [open, options])

  if (!info) return null
  const waUrl = info.phone ? buildWaMeUrl(info.phone, text) : ""
  const subject = `Pedido #${info.code} · ${info.shopName}`
  const mailUrl = info.email
    ? `mailto:${encodeURIComponent(info.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`
    : ""

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Mensagem copiada")
    } catch {
      toast.message(text)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle>Avisar {firstName(info.clientName) || "o cliente"}</DialogTitle>
          <DialogDescription>
            Escolha a mensagem, ajuste se quiser e envie. {info.phone ? "" : "Sem telefone no pedido. "}
            {info.email ? "" : "Sem e-mail no pedido."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-1.5">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                setPicked(opt.id)
                setText(opt.text)
                setAiDone(false)
              }}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold transition",
                picked === opt.id
                  ? "border-[var(--wq-brand)] bg-[var(--wq-brand)] text-white"
                  : "border-[var(--wq-border)] text-[var(--wq-text-muted)] hover:text-[var(--wq-text)]"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[140px] rounded-[12px] pb-10 text-sm leading-relaxed"
          />
          {info.orderId ? (
            <button
              type="button"
              onClick={() => void improve()}
              disabled={improving}
              className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-[var(--wq-brand-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--wq-brand)] hover:bg-[var(--wq-brand)] hover:text-white disabled:opacity-60"
            >
              {improving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              {aiDone ? "Reescrever de novo" : "Melhorar com IA"}
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button
            asChild={Boolean(waUrl)}
            type="button"
            disabled={!waUrl}
            className="h-11 rounded-[10px] bg-[#25D366] text-[#073018] hover:bg-[#1ebe5d]"
          >
            {waUrl ? (
              <a href={waUrl} target="_blank" rel="noopener noreferrer" onClick={() => onOpenChange(false)}>
                <MessageCircle className="mr-1.5 h-4 w-4" /> WhatsApp
              </a>
            ) : (
              <span>
                <MessageCircle className="mr-1.5 h-4 w-4" /> WhatsApp
              </span>
            )}
          </Button>
          <Button asChild={Boolean(mailUrl)} type="button" variant="outline" disabled={!mailUrl} className="h-11 rounded-[10px]">
            {mailUrl ? (
              <a href={mailUrl} onClick={() => onOpenChange(false)}>
                <Mail className="mr-1.5 h-4 w-4" /> E-mail
              </a>
            ) : (
              <span>
                <Mail className="mr-1.5 h-4 w-4" /> E-mail
              </span>
            )}
          </Button>
          <Button type="button" variant="outline" className="h-11 rounded-[10px]" onClick={() => void copy()}>
            <Copy className="mr-1.5 h-4 w-4" /> Copiar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
