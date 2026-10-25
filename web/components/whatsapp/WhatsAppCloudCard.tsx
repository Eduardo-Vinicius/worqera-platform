"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Loader2, MessageCircle, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  connectWhatsAppV1,
  disconnectWhatsAppV1,
  getWhatsAppV1,
  patchWhatsAppV1,
  type WhatsAppCloudStatus,
} from "@/lib/apiV1"
import { cn } from "@/lib/utils"

declare global {
  interface Window {
    FB?: any
    fbAsyncInit?: () => void
  }
}

function loadFacebookSdk(appId: string, version: string) {
  return new Promise<void>((resolve, reject) => {
    if (window.FB) {
      resolve()
      return
    }
    window.fbAsyncInit = () => {
      window.FB.init({ appId, autoLogAppEvents: true, xfbml: false, version })
      resolve()
    }
    const script = document.createElement("script")
    script.src = "https://connect.facebook.net/pt_BR/sdk.js"
    script.async = true
    script.defer = true
    script.crossOrigin = "anonymous"
    script.onerror = () => reject(new Error("Não carregou o login da Meta"))
    document.body.appendChild(script)
  })
}

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 }).format(n || 0)

function Meter({ label, used, pack, cap }: { label: string; used: number; pack: number; cap: number }) {
  const pct = Math.min(100, Math.round((used / Math.max(1, pack)) * 100))
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-[var(--wq-text-muted)]">
          {used} / {pack}
          {used > pack ? ` · teto ${cap}` : ""}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--wq-paper)]">
        <div
          className={cn("h-full rounded-full", pct >= 100 ? "bg-rose-500" : pct >= 80 ? "bg-amber-400" : "bg-[var(--wq-action)]")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

/** Empresa → WhatsApp oficial. Dormant until the Worqera Meta app is configured. */
export function WhatsAppCloudCard() {
  const [st, setSt] = useState<WhatsAppCloudStatus | null>(null)
  const [busy, setBusy] = useState("")
  const [canEdit, setCanEdit] = useState(false)
  const signup = useRef<{ wabaId?: string; phoneNumberId?: string; coexistence?: boolean }>({})

  const load = useCallback(() => {
    getWhatsAppV1()
      .then(setSt)
      .catch(() => setSt(null))
  }, [])

  useEffect(() => {
    const role = String(localStorage.getItem("role") || "").toLowerCase()
    setCanEdit(role === "owner" || role === "admin")
    load()
  }, [load])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!String(event.origin).endsWith("facebook.com")) return
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data
        if (data?.type !== "WA_EMBEDDED_SIGNUP") return
        if (data.event === "FINISH" || data.event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING") {
          signup.current = {
            wabaId: data.data?.waba_id,
            phoneNumberId: data.data?.phone_number_id,
            coexistence: data.event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
          }
        }
      } catch {
        /* other facebook messages */
      }
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [])

  const connect = async (coexistence: boolean) => {
    if (!st?.signup) return
    setBusy("connect")
    try {
      await loadFacebookSdk(st.signup.appId, st.signup.graphVersion)
      signup.current = {}
      const code = await new Promise<string>((resolve, reject) => {
        window.FB.login(
          (response: any) => {
            const c = response?.authResponse?.code
            if (c) resolve(String(c))
            else reject(new Error("Cadastro na Meta não concluído"))
          },
          {
            config_id: st.signup!.configId,
            response_type: "code",
            override_default_response_type: true,
            extras: {
              setup: {},
              sessionInfoVersion: "3",
              ...(coexistence ? { featureType: "whatsapp_business_app_onboarding" } : {}),
            },
          }
        )
      })
      await new Promise((r) => setTimeout(r, 800))
      const ids = signup.current
      if (!ids.wabaId || !ids.phoneNumberId) throw new Error("A Meta não informou o número. Tente de novo.")
      setSt(await connectWhatsAppV1({ code, wabaId: ids.wabaId, phoneNumberId: ids.phoneNumberId, coexistence: ids.coexistence }))
      toast.success("Número conectado. A Worqera ativa o pagamento e os modelos em seguida.")
    } catch (err: any) {
      toast.error(err?.message || "Não conectou")
    } finally {
      setBusy("")
    }
  }

  const toggle = async (key: "autoReady" | "consentAtCounter", value: boolean) => {
    setBusy(key)
    try {
      setSt(await patchWhatsAppV1({ [key]: value }))
    } catch (err: any) {
      toast.error(err?.message || "Não salvou")
    } finally {
      setBusy("")
    }
  }

  if (!st) return null

  return (
    <section className="space-y-4 rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--wq-text-muted)]">
            <MessageCircle className="h-4 w-4 text-[#25D366]" /> WhatsApp oficial
          </h2>
          <p className="mt-1 text-sm text-[var(--wq-text-muted)]">
            Aviso de pedido pronto e retomada de orçamento saem sozinhos, pelo número da loja.
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
            st.status === "connected" && st.canSend
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
              : st.status === "paused"
                ? "bg-rose-50 text-rose-700"
                : "bg-[var(--wq-paper)] text-[var(--wq-text-muted)]"
          )}
        >
          {!st.configured
            ? "Em breve"
            : st.status === "connected"
              ? st.canSend
                ? "Ativo"
                : "Conectado"
              : st.status === "paused"
                ? "Pausado"
                : "Desligado"}
        </span>
      </div>

      {!st.configured ? (
        <p className="rounded-xl bg-[var(--wq-paper)] px-4 py-3 text-sm text-[var(--wq-text-muted)]">
          A Worqera está liberando o WhatsApp oficial com a Meta. Até lá, o botão WhatsApp abre o aplicativo da loja com o texto
          pronto.
        </p>
      ) : !st.business ? (
        <p className="rounded-xl bg-[var(--wq-paper)] px-4 py-3 text-sm text-[var(--wq-text-muted)]">
          Faz parte do Business, com pacote de 1.000 avisos e 100 retomadas por mês.{" "}
          <Link href="/billing" className="font-medium text-[var(--wq-brand)] underline">
            Ver plano
          </Link>
        </p>
      ) : st.status === "off" ? (
        <div className="space-y-3">
          <ul className="space-y-1 text-sm text-[var(--wq-text-muted)]">
            <li>• Incluído no Business: 1.000 avisos e 100 retomadas por mês.</li>
            <li>
              • Passou do pacote: {brl(st.overagePrices.utility)} por aviso e {brl(st.overagePrices.marketing)} por retomada,
              no mês seguinte.
            </li>
            <li>• A loja pode continuar usando o WhatsApp Business no celular.</li>
          </ul>
          {canEdit ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                className="rounded-[10px] bg-[#25D366] text-[#073018] hover:bg-[#1ebe5d]"
                disabled={busy === "connect"}
                onClick={() => void connect(true)}
              >
                {busy === "connect" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Usar o WhatsApp Business do celular
              </Button>
              <Button type="button" variant="outline" className="rounded-[10px]" disabled={busy === "connect"} onClick={() => void connect(false)}>
                Conectar outro número
              </Button>
            </div>
          ) : (
            <p className="text-xs text-[var(--wq-text-muted)]">Só o dono ou o admin conecta o número.</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold">{st.displayPhone || "Número conectado"}</span>
            {st.verifiedName ? <span className="text-[var(--wq-text-muted)]">· {st.verifiedName}</span> : null}
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                st.paymentOk ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
              )}
            >
              <ShieldCheck className="h-3 w-3" />
              {st.paymentOk ? "Pagamento: Worqera" : "Aguardando a Worqera ativar o pagamento"}
            </span>
          </div>

          {st.blockedText && st.status === "connected" ? (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">{st.blockedText}</p>
          ) : null}
          {st.status === "paused" ? (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">{st.pausedReason || "Envio pausado"}</p>
          ) : null}

          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={st.consentAtCounter}
              disabled={!canEdit || busy === "consentAtCounter"}
              onChange={(e) => void toggle("consentAtCounter", e.target.checked)}
            />
            <span>
              <span className="font-medium">A loja pede autorização ao cliente no balcão</span>
              <span className="block text-xs text-[var(--wq-text-muted)]">
                Obrigatório pela Meta. Quem responder PARAR deixa de receber.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={st.autoReady}
              disabled={!canEdit || busy === "autoReady"}
              onChange={(e) => void toggle("autoReady", e.target.checked)}
            />
            <span>
              <span className="font-medium">Avisar sozinho quando o pedido ficar pronto</span>
              <span className="block text-xs text-[var(--wq-text-muted)]">
                Sai quando todos os itens chegam no setor final, com o link de consulta e avaliação.
              </span>
            </span>
          </label>

          {st.usage ? (
            <div className="space-y-3 rounded-xl border border-[var(--wq-border)] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--wq-text-muted)]">Este mês</p>
              <Meter label="Avisos (pronto)" used={st.usage.counts.utility} pack={st.usage.pack.utility} cap={st.usage.cap.utility} />
              <Meter label="Retomadas de orçamento" used={st.usage.counts.marketing} pack={st.usage.pack.marketing} cap={st.usage.cap.marketing} />
              {st.usage.overageBrl > 0 ? (
                <p className="text-sm text-amber-800">Excedente até agora: {brl(st.usage.overageBrl)} (cobrado no mês seguinte)</p>
              ) : (
                <p className="text-xs text-[var(--wq-text-muted)]">Dentro do pacote do Business.</p>
              )}
            </div>
          ) : null}

          {st.overage ? (
            <p className="text-sm text-[var(--wq-text-muted)]">
              Excedente de {st.overage.month}: {brl(st.overage.amountBrl)}
              {st.overage.paidAt ? " · pago" : " · em aberto"}
            </p>
          ) : null}

          {canEdit ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-[10px] text-[var(--wq-text-muted)]"
              disabled={busy === "disconnect"}
              onClick={async () => {
                if (!window.confirm("Desconectar o WhatsApp oficial? Os avisos automáticos param.")) return
                setBusy("disconnect")
                try {
                  setSt(await disconnectWhatsAppV1())
                } finally {
                  setBusy("")
                }
              }}
            >
              Desconectar
            </Button>
          ) : null}
        </div>
      )}
    </section>
  )
}
