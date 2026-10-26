"use client"

import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Bot, Loader2, Mail, MessageCircle, MessagesSquare, ShieldCheck, Smartphone, Zap } from "lucide-react"
import { toast } from "sonner"
import { AppHeader } from "@/components/shell/AppHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { WhatsAppCloudCard } from "@/components/whatsapp/WhatsAppCloudCard"
import { AntiBanGuide } from "@/components/comunicacao/AntiBanGuide"
import { getShopCurrentV1, getWhatsAppV1, patchShopCurrentV1, type WhatsAppCloudStatus } from "@/lib/apiV1"
import { DEFAULT_WA_TEMPLATES, fillWaTemplate } from "@/lib/whatsapp"
import { cn } from "@/lib/utils"

type Tab = "whatsapp" | "email" | "modelos" | "automacoes" | "seguranca"

const TABS: Array<{ id: Tab; label: string; icon: typeof MessageCircle }> = [
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { id: "email", label: "E-mail", icon: Mail },
  { id: "modelos", label: "Modelos", icon: MessagesSquare },
  { id: "automacoes", label: "Automações", icon: Zap },
  { id: "seguranca", label: "Sem bloqueio", icon: ShieldCheck },
]

const TEMPLATE_FIELDS: Array<{ key: keyof typeof DEFAULT_WA_TEMPLATES; label: string; hint: string }> = [
  { key: "created", label: "Pedido criado", hint: "Sai quando o pedido entra" },
  { key: "moved", label: "Mudou de etapa", hint: "Quando o pedido avança de setor" },
  { key: "ready", label: "Pronto para retirar", hint: "O aviso mais importante" },
  { key: "publicLink", label: "Link do pedido", hint: "Para mandar a consulta a qualquer hora" },
]

const SAMPLE = { code: "0412", client: "Ana", link: "worqera.com/p/o/abc", sector: "Restauração", shop: "sua loja" }

type WaEvents = { created: boolean; moved: boolean; ready: boolean }

type Form = {
  waEnabled: boolean
  waPhone: string
  emailEnabled: boolean
  templates: Record<keyof typeof DEFAULT_WA_TEMPLATES, string>
  events: WaEvents
}

const EVENT_FIELDS: Array<{ key: keyof WaEvents; label: string; hint: string; risk: "low" | "mid" | "high" }> = [
  { key: "ready", label: "Pedido pronto", hint: "A mensagem que o cliente quer receber.", risk: "low" },
  { key: "created", label: "Pedido criado", hint: "Útil quando o cliente não deixou e-mail.", risk: "mid" },
  { key: "moved", label: "Cada mudança de setor", hint: "Gera muitas mensagens por pedido. Prefira o link e o e-mail.", risk: "high" },
]

function Panel({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-5 sm:p-6">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">{title}</h2>
        {hint ? <p className="mt-1 text-sm text-[var(--wq-text-muted)]">{hint}</p> : null}
      </div>
      {children}
    </section>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn("relative h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-[var(--wq-action)]" : "bg-[var(--wq-border)]")}
      >
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
      </button>
      {label}
    </label>
  )
}

export default function ComunicacaoPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-[var(--wq-text-muted)]">Carregando…</p>}>
      <ComunicacaoInner />
    </Suspense>
  )
}

function ComunicacaoInner() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const tab = (TABS.find((t) => t.id === params.get("tab"))?.id || "whatsapp") as Tab
  const [form, setForm] = useState<Form | null>(null)
  const [saved, setSaved] = useState<Form | null>(null)
  const [wa, setWa] = useState<WhatsAppCloudStatus | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getShopCurrentV1()
      .then((res: any) => {
        const doc = res?.shop || res
        const w = doc?.notifications?.whatsapp || {}
        const tpl = w.templates || {}
        const next: Form = {
          waEnabled: Boolean(w.enabled),
          waPhone: w.shopPhoneE164 || doc?.branding?.phone || "",
          emailEnabled: doc?.notifications?.email?.enabled !== false,
          templates: {
            created: tpl.created || DEFAULT_WA_TEMPLATES.created,
            moved: tpl.moved || DEFAULT_WA_TEMPLATES.moved,
            ready: tpl.ready || DEFAULT_WA_TEMPLATES.ready,
            publicLink: tpl.publicLink || DEFAULT_WA_TEMPLATES.publicLink,
          },
          events: {
            created: w.events?.created !== false,
            moved: w.events?.moved === true,
            ready: w.events?.ready !== false,
          },
        }
        setForm(next)
        setSaved(next)
      })
      .catch((err) => toast.error(err?.message || "Não carregou a comunicação"))
    getWhatsAppV1()
      .then(setWa)
      .catch(() => setWa(null))
  }, [])

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved])

  const setTab = (next: Tab) => router.replace(`${pathname}?tab=${next}`, { scroll: false })

  const save = async () => {
    if (!form) return
    setSaving(true)
    try {
      await patchShopCurrentV1({
        notifications: {
          email: { enabled: form.emailEnabled },
          whatsapp: { enabled: form.waEnabled, shopPhoneE164: form.waPhone.trim(), templates: form.templates, events: form.events },
        },
      })
      setSaved(form)
      toast.success("Comunicação salva")
    } catch (err: any) {
      toast.error(err?.message || "Não salvou")
    } finally {
      setSaving(false)
    }
  }

  const official = wa?.configured && wa.business && wa.status === "connected"
  const automations = form
    ? [
        {
          title: "Pedido pronto → WhatsApp automático",
          detail: "Avisa o cliente sozinho quando o pedido chega no setor final.",
          state: !wa?.configured ? "soon" : official && wa?.autoReady && wa?.canSend ? "on" : "off",
          go: "whatsapp" as Tab,
        },
        {
          title: "Retomada de orçamento → WhatsApp",
          detail: "Até 2 mensagens para quem não fechou, no dia de retorno.",
          state: !wa?.configured ? "soon" : official && wa?.canSend ? "on" : "off",
          go: "whatsapp" as Tab,
        },
        {
          title: "Pedido criado → e-mail com o laudo em PDF",
          detail: "Quando o cliente tem e-mail e o pedido tem valor.",
          state: form.emailEnabled ? "on" : "off",
          go: "email" as Tab,
        },
        {
          title: "Pedido pronto → e-mail com pedido de avaliação",
          detail: "Leva para a página do pedido, com nota e convite ao Google.",
          state: form.emailEnabled ? "on" : "off",
          go: "email" as Tab,
        },
        {
          title: "WhatsApp com texto pronto (um toque)",
          detail: "Botão Avisar no pedido e no kanban abre o WhatsApp da loja já escrito.",
          state: form.waEnabled ? "on" : "off",
          go: "whatsapp" as Tab,
        },
        {
          title: "Cliente respondeu PARAR → não envia mais",
          detail: "Vale para o WhatsApp oficial.",
          state: wa?.configured ? "on" : "soon",
          go: "seguranca" as Tab,
        },
      ]
    : []

  return (
    <div className="-mx-2.5 -mt-3 sm:-mx-5 sm:-mt-5 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-6">
      <AppHeader
        title="Comunicação"
        subtitle="WhatsApp, e-mail e as mensagens que a loja manda para o cliente"
        actions={
          dirty ? (
            <Button
              type="button"
              size="sm"
              disabled={saving}
              onClick={() => void save()}
              className="h-9 rounded-[10px] bg-[var(--wq-action)] text-white hover:bg-[var(--wq-action)]/90"
            >
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          ) : null
        }
      />

      <div className="mx-auto w-full max-w-[1100px] space-y-4 px-2.5 py-4 sm:px-5 md:px-6 lg:px-8">
        <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {TABS.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-[10px] border px-3 py-2 text-sm font-semibold transition",
                  tab === t.id
                    ? "border-[var(--wq-brand)] bg-[var(--wq-brand)] text-white"
                    : "border-[var(--wq-border)] bg-[var(--wq-surface)] text-[var(--wq-text)] hover:border-[var(--wq-brand)]/40"
                )}
              >
                <Icon className="h-4 w-4" /> {t.label}
              </button>
            )
          })}
        </nav>

        {!form ? (
          <p className="flex items-center gap-2 text-sm text-[var(--wq-text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </p>
        ) : tab === "whatsapp" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <WhatsAppCloudCard />
            <Panel
              title="Pelo celular da loja"
              hint="Funciona hoje, em todos os planos: o botão Avisar abre o WhatsApp da loja com a mensagem pronta. Você só toca em enviar."
            >
              <div className="flex items-start gap-3 rounded-xl bg-[var(--wq-paper)] p-3 text-sm text-[var(--wq-text-muted)]">
                <Smartphone className="mt-0.5 h-4 w-4 shrink-0" />
                Sem risco de bloqueio: é você mandando do seu WhatsApp, uma mensagem por vez.
              </div>
              <Toggle
                checked={form.waEnabled}
                onChange={(v) => setForm((f) => (f ? { ...f, waEnabled: v } : f))}
                label="Mostrar WhatsApp com texto pronto nos pedidos"
              />
              <div className="space-y-1.5">
                <Label htmlFor="wa-phone">Telefone da loja</Label>
                <Input
                  id="wa-phone"
                  value={form.waPhone}
                  onChange={(e) => setForm((f) => (f ? { ...f, waPhone: e.target.value } : f))}
                  placeholder="(11) 98888-7777"
                  className="rounded-[10px]"
                />
                <p className="text-xs text-[var(--wq-text-muted)]">Usado quando o pedido não tem telefone do cliente.</p>
              </div>
              <Button type="button" variant="outline" className="rounded-[10px]" onClick={() => setTab("modelos")}>
                Editar as mensagens
              </Button>
            </Panel>
            <div className="lg:col-span-2">
              <Panel
                title="Proteção do número"
                hint="O WhatsApp bloqueia número que manda muita mensagem parecida. Escolha quando a Worqera sugere mandar — menos mensagens, número mais seguro."
              >
                <ul className="divide-y divide-[var(--wq-border)] overflow-hidden rounded-xl border border-[var(--wq-border)]">
                  {EVENT_FIELDS.map((ev) => (
                    <li key={ev.key} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 text-sm font-semibold text-[var(--wq-text)]">
                          {ev.label}
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              ev.risk === "low"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : ev.risk === "mid"
                                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                  : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                            )}
                          >
                            {ev.risk === "low" ? "Seguro" : ev.risk === "mid" ? "Moderado" : "Alto volume"}
                          </span>
                        </p>
                        <p className="text-xs text-[var(--wq-text-muted)]">{ev.hint}</p>
                      </div>
                      <Toggle
                        checked={form.events[ev.key]}
                        onChange={(v) => setForm((f) => (f ? { ...f, events: { ...f.events, [ev.key]: v } } : f))}
                        label=""
                      />
                    </li>
                  ))}
                </ul>
                <div className="grid gap-2 text-sm text-[var(--wq-text-muted)] sm:grid-cols-2">
                  <p className="rounded-xl bg-[var(--wq-paper)] px-3 py-2">
                    <strong className="text-[var(--wq-text)]">No balcão:</strong> peça para o cliente salvar o contato da loja. Quem tem o
                    número salvo quase nunca denuncia.
                  </p>
                  <p className="rounded-xl bg-[var(--wq-paper)] px-3 py-2">
                    <strong className="text-[var(--wq-text)]">Andamento:</strong> o QR da etiqueta e o e-mail mostram a etapa sem gastar
                    mensagem.
                  </p>
                </div>
                <button type="button" onClick={() => setTab("seguranca")} className="text-sm font-medium text-[var(--wq-brand)] hover:underline">
                  Ver o guia completo para não cair o número →
                </button>
              </Panel>
            </div>
          </div>
        ) : tab === "email" ? (
          <Panel title="E-mail ao cliente" hint="Sai pelo endereço da Worqera com o nome da sua loja como remetente.">
            <Toggle
              checked={form.emailEnabled}
              onChange={(v) => setForm((f) => (f ? { ...f, emailEnabled: v } : f))}
              label="Enviar e-mails de status para o cliente"
            />
            <ul className="space-y-2 text-sm text-[var(--wq-text-muted)]">
              <li>
                <strong className="text-[var(--wq-text)]">Pedido criado:</strong> laudo em PDF e link para acompanhar.
              </li>
              <li>
                <strong className="text-[var(--wq-text)]">Mudou de etapa:</strong> só nos setores marcados em{" "}
                <Link href="/settings/setores" className="underline">
                  Setores
                </Link>
                .
              </li>
              <li>
                <strong className="text-[var(--wq-text)]">Pronto:</strong> aviso de retirada e pedido de avaliação.
              </li>
            </ul>
            <p className="rounded-xl bg-[var(--wq-paper)] px-3 py-2 text-xs text-[var(--wq-text-muted)]">
              O nome que aparece como remetente fica em{" "}
              <Link href="/settings/empresa" className="underline">
                Empresa
              </Link>
              . Precisa do e-mail no cadastro do cliente.
            </p>
          </Panel>
        ) : tab === "modelos" ? (
          <Panel
            title="Mensagens do WhatsApp"
            hint="Use as variáveis entre chaves. A prévia ao lado mostra como o cliente lê."
          >
            <p className="flex flex-wrap gap-1.5 text-xs">
              {["{{client}}", "{{code}}", "{{link}}", "{{sector}}", "{{shop}}"].map((v) => (
                <code key={v} className="rounded-md bg-[var(--wq-paper)] px-1.5 py-0.5 font-mono text-[var(--wq-text)]">
                  {v}
                </code>
              ))}
            </p>
            <div className="space-y-4">
              {TEMPLATE_FIELDS.map((t) => (
                <div key={t.key} className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={`tpl-${t.key}`}>
                      {t.label} <span className="font-normal text-[var(--wq-text-muted)]">· {t.hint}</span>
                    </Label>
                    <Textarea
                      id={`tpl-${t.key}`}
                      value={form.templates[t.key]}
                      onChange={(e) =>
                        setForm((f) => (f ? { ...f, templates: { ...f.templates, [t.key]: e.target.value } } : f))
                      }
                      className="min-h-[84px] rounded-[10px] text-sm"
                    />
                  </div>
                  <div className="rounded-2xl bg-[#e7ffdb] p-3 text-sm text-[#0b141a] dark:bg-emerald-950/40 dark:text-emerald-100">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-800/70 dark:text-emerald-300/70">Prévia</p>
                    {fillWaTemplate(form.templates[t.key], SAMPLE)}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        ) : tab === "automacoes" ? (
          <Panel title="O que sai sozinho" hint="Tudo que a Worqera manda para o cliente, e o que está ligado agora.">
            <ul className="divide-y divide-[var(--wq-border)] overflow-hidden rounded-xl border border-[var(--wq-border)]">
              {automations.map((a) => (
                <li key={a.title} className="flex items-center gap-3 px-4 py-3">
                  <Bot className="h-4 w-4 shrink-0 text-[var(--wq-brand)]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--wq-text)]">{a.title}</p>
                    <p className="text-xs text-[var(--wq-text-muted)]">{a.detail}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTab(a.go)}
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                      a.state === "on"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : a.state === "soon"
                          ? "bg-[var(--wq-brand-soft)] text-[var(--wq-brand-text)]"
                          : "bg-[var(--wq-paper)] text-[var(--wq-text-muted)]"
                    )}
                  >
                    {a.state === "on" ? "Ligado" : a.state === "soon" ? "Em breve" : "Desligado"}
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        ) : (
          <AntiBanGuide />
        )}
      </div>
    </div>
  )
}
