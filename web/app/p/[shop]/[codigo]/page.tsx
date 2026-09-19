"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { getPublicOrderV1, submitPublicFeedbackV1 } from "@/lib/apiV1"
import { hexToRgba, normalizeHex, resolveBrandColors } from "@/lib/shopBrand"
import { cn } from "@/lib/utils"

const STATUS_LABEL: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  ready: "Pronto",
  delivered: "Entregue",
  canceled: "Cancelado",
}

const SCORE_LABELS = ["", "Ruim", "Regular", "Bom", "Ótimo", "Perfeito"] as const

const FEEDBACK_TAGS = [
  { id: "qualidade", label: "Qualidade do serviço" },
  { id: "acabamento", label: "Acabamento / visual" },
  { id: "prazo", label: "Prazo" },
  { id: "atendimento", label: "Atendimento" },
] as const

function PublicOrderByShopInner() {
  const params = useParams()
  const searchParams = useSearchParams()
  const shop = String(params?.shop || "")
  const code = String(params?.codigo || "")
  const token = String(searchParams?.get("t") || searchParams?.get("token") || "")
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState("")
  const [score, setScore] = useState(0)
  const [tags, setTags] = useState<string[]>([])
  const [comment, setComment] = useState("")
  const [sending, setSending] = useState(false)
  const [fbMsg, setFbMsg] = useState("")

  useEffect(() => {
    if (!code || !shop) return
    if (!token) {
      setError("Link incompleto — use o QR ou o link enviado pela oficina.")
      return
    }
    getPublicOrderV1(code, shop, token)
      .then(setData)
      .catch((e) => setError(e.message || "Pedido não encontrado"))
  }, [code, shop, token])

  const sectorName = data?.currentSector?.name || data?.sectorName
  const sectorColor = normalizeHex(data?.currentSector?.color) || ""
  const shopName = data?.shop?.name
  const logoUrl = data?.shop?.logoUrl || ""
  const phone = data?.shop?.phone || ""

  const colors = useMemo(
    () =>
      resolveBrandColors({
        primaryColor: data?.shop?.primaryColor,
        accentColor: data?.shop?.accentColor,
      }),
    [data?.shop?.primaryColor, data?.shop?.accentColor]
  )

  const statusKey = String(data?.status || "").toLowerCase()
  const statusLabel = STATUS_LABEL[statusKey] || data?.status

  const toggleTag = (id: string) => {
    setTags((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))
  }

  const sendFeedback = async () => {
    if (!score) {
      setFbMsg("Escolha uma nota de 1 a 5")
      return
    }
    setSending(true)
    setFbMsg("")
    try {
      await submitPublicFeedbackV1(shop, code, { score, comment, tags }, token)
      setData((d: any) => ({
        ...d,
        canFeedback: false,
        feedback: { score, comment, tags, createdAt: new Date().toISOString() },
      }))
      setFbMsg("Obrigado! Sua opinião ajuda a oficina a melhorar.")
    } catch (e: any) {
      setFbMsg(e?.message || "Não foi possível enviar")
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className="flex min-h-[100dvh] items-stretch justify-center p-0 text-[var(--wq-text)] sm:items-center sm:p-4"
      style={{
        background: `linear-gradient(165deg, ${hexToRgba(colors.primary, 0.12)} 0%, #F8FAFC 42%, #F1F5F9 100%)`,
      }}
    >
      <div className="flex w-full max-w-md flex-col overflow-hidden bg-white shadow-sm sm:rounded-2xl sm:border sm:border-[var(--wq-border)]">
        <header
          className="flex items-center gap-3 px-5 py-4 text-white sm:px-6"
          style={{ background: colors.primary }}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="h-11 w-11 rounded-xl bg-white object-contain p-1 shadow-sm"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 text-lg font-bold">
              {(shopName || "W").slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-base font-semibold tracking-tight">
              {shopName || "Worqera"}
            </p>
            <p className="text-xs text-white/80">Acompanhar pedido</p>
          </div>
        </header>

        <div className="flex flex-1 flex-col px-5 py-6 sm:px-6">
          {error && (
            <div className="space-y-2">
              <p className="text-sm text-[var(--wq-danger)]">{error}</p>
              <p className="text-xs text-[var(--wq-text-muted)]">
                Use o link completo da etiqueta ou do WhatsApp:{" "}
                <code className="font-mono">/p/oficina/código?t=…</code>
              </p>
            </div>
          )}
          {!error && !data && (
            <p className="text-sm text-[var(--wq-text-muted)]">Buscando…</p>
          )}
          {data && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--wq-text-muted)]">
                  Pedido
                </p>
                <p className="mt-1 break-all font-mono text-4xl font-semibold tracking-tight sm:text-5xl">
                  {data.code || code}
                </p>
                {data.clientName ? (
                  <p className="mt-2 text-base text-[var(--wq-text-muted)]">{data.clientName}</p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                {sectorName && (
                  <Badge
                    className="rounded-full border-0 px-3 py-1 text-sm"
                    style={{
                      background: sectorColor
                        ? hexToRgba(sectorColor, 0.18)
                        : colors.soft,
                      color: sectorColor || colors.primary,
                    }}
                  >
                    {sectorName}
                  </Badge>
                )}
                {statusLabel && (
                  <Badge
                    variant="outline"
                    className="rounded-full border-[var(--wq-border)] px-3 py-1 capitalize"
                  >
                    {statusLabel}
                  </Badge>
                )}
              </div>

              {data.shoeModel ? (
                <p className="text-sm text-[var(--wq-text-muted)]">{data.shoeModel}</p>
              ) : null}

              {data.dueAt ? (
                <p className="text-xs text-[var(--wq-text-muted)]">
                  Previsão{" "}
                  {new Date(data.dueAt).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                  })}
                </p>
              ) : null}

              {phone ? (
                <a
                  href={`https://wa.me/${String(phone).replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 flex w-full items-center justify-center rounded-[12px] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95 active:scale-[0.99]"
                  style={{ background: colors.accent }}
                >
                  Falar no WhatsApp
                </a>
              ) : null}

              {data.canFeedback ? (
                <div
                  id="avaliar"
                  className="scroll-mt-6 rounded-xl border border-[var(--wq-border)] bg-[var(--wq-paper)] p-4"
                >
                  <p className="text-sm font-semibold">Como ficou o serviço?</p>
                  <p className="mt-1 text-xs text-[var(--wq-text-muted)]">
                    Nota rápida — ajuda a oficina a melhorar o próximo pedido
                  </p>
                  <div className="mt-3 flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setScore(n)}
                        className="flex h-11 w-11 flex-col items-center justify-center rounded-full border text-sm font-semibold transition"
                        style={{
                          borderColor: score === n ? colors.primary : "var(--wq-border)",
                          background: score === n ? colors.soft : "#fff",
                          color: score === n ? colors.primary : "inherit",
                        }}
                        title={SCORE_LABELS[n]}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  {score > 0 ? (
                    <p className="mt-1.5 text-xs font-medium" style={{ color: colors.primary }}>
                      {SCORE_LABELS[score]}
                    </p>
                  ) : null}

                  <p className="mt-4 text-xs font-medium text-[var(--wq-text-muted)]">
                    O que mais pesou? (opcional)
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {FEEDBACK_TAGS.map((t) => {
                      const on = tags.includes(t.id)
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => toggleTag(t.id)}
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-xs transition",
                            on
                              ? "border-transparent text-white"
                              : "border-[var(--wq-border)] bg-white text-[var(--wq-text-muted)]"
                          )}
                          style={on ? { background: colors.primary } : undefined}
                        >
                          {t.label}
                        </button>
                      )
                    })}
                  </div>

                  <textarea
                    className="mt-3 w-full rounded-[10px] border border-[var(--wq-border)] bg-white px-3 py-2 text-sm"
                    rows={2}
                    placeholder="Algo que a gente deveria saber? (opcional)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={sending}
                    onClick={sendFeedback}
                    className="mt-2 w-full rounded-[10px] px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                    style={{ background: colors.primary }}
                  >
                    {sending ? "Enviando…" : "Enviar avaliação"}
                  </button>
                  {fbMsg ? (
                    <p className="mt-2 text-xs text-[var(--wq-text-muted)]">{fbMsg}</p>
                  ) : null}
                </div>
              ) : null}

              {data.feedback?.score ? (
                <div className="rounded-xl border border-[var(--wq-border)] bg-[var(--wq-paper)] px-4 py-3 text-center text-sm">
                  <p className="font-medium">
                    Você avaliou: {data.feedback.score}/5
                    {SCORE_LABELS[data.feedback.score]
                      ? ` · ${SCORE_LABELS[data.feedback.score]}`
                      : ""}
                  </p>
                  {Array.isArray(data.feedback.tags) && data.feedback.tags.length > 0 ? (
                    <p className="mt-1 text-xs text-[var(--wq-text-muted)]">
                      {data.feedback.tags.join(" · ")}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>

        <footer className="border-t border-[var(--wq-border)] px-5 py-3 text-center text-[10px] text-[var(--wq-text-muted)] sm:px-6">
          Powered by Worqera
        </footer>
      </div>
    </div>
  )
}

export default function PublicOrderByShopPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center text-sm text-[var(--wq-text-muted)]">
          Carregando…
        </div>
      }
    >
      <PublicOrderByShopInner />
    </Suspense>
  )
}
