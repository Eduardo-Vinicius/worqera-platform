"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import QRCode from "qrcode"
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  KanbanSquare,
  Loader2,
  Mail,
  MessageCircle,
  Plus,
  Printer,
  Tag,
} from "lucide-react"
import { toast } from "sonner"
import { AppHeader } from "@/components/shell/AppHeader"
import { Button } from "@/components/ui/button"
import {
  downloadBlobAsFile,
  generateOrderPDFService,
  getPedidoService,
  listPedidoPdfsService,
} from "@/lib/apiService"
import { getShopCurrentV1, resendOrderEmailV1 } from "@/lib/apiV1"
import { deepenHex, normalizeHex, readBrandFromStorage, resolveBrandColors } from "@/lib/shopBrand"
import { buildOrderWaFromShop } from "@/lib/orderWhatsApp"
import { ENABLE_WA_ME } from "@/lib/featureFlags"
import { buildPublicOrderUrl } from "@/lib/publicOrderLink"

type OrderDoc = {
  id?: string
  code?: string
  publicToken?: string | null
  clientName?: string
  clientPhone?: string
  clientEmail?: string | null
  client?: { name?: string; nomeCompleto?: string; phone?: string; telefone?: string; email?: string }
  shoeModel?: string
  items?: Array<{ shoeModel?: string }>
}

export default function PedidoSucessoPage() {
  const params = useParams()
  const id = String(params?.id || "")

  const [order, setOrder] = useState<OrderDoc | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrDataUrl, setQrDataUrl] = useState("")
  const [publicUrl, setPublicUrl] = useState("")
  const [waUrl, setWaUrl] = useState("")
  const [ink, setInk] = useState("#0F172A")
  const [shopDoc, setShopDoc] = useState<any>(null)
  const [brandName, setBrandName] = useState("Worqera")

  const [pdfBlobUrl, setPdfBlobUrl] = useState("")
  const [pdfFileName, setPdfFileName] = useState("laudo.pdf")
  const [pdfStatus, setPdfStatus] = useState<"loading" | "ready" | "error">("loading")
  const [pdfError, setPdfError] = useState("")
  const [emailNotify, setEmailNotify] = useState<any>(null)
  const [resendingEmail, setResendingEmail] = useState(false)
  const blobRef = useRef<Blob | null>(null)
  const objectUrlRef = useRef("")

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = ""
    }
  }, [])

  const setBlobPreview = useCallback(
    (blob: Blob, fileName?: string) => {
      revokeObjectUrl()
      blobRef.current = blob
      const url = URL.createObjectURL(blob)
      objectUrlRef.current = url
      setPdfBlobUrl(url)
      if (fileName) setPdfFileName(fileName)
      setPdfStatus("ready")
      setPdfError("")
    },
    [revokeObjectUrl]
  )

  useEffect(() => {
    return () => revokeObjectUrl()
  }, [revokeObjectUrl])

  useEffect(() => {
    const stored = readBrandFromStorage()
    if (stored.displayName) setBrandName(stored.displayName)
    const colors = resolveBrandColors(stored)
    setInk(deepenHex(colors.primary))
    ;(async () => {
      try {
        const shop = await getShopCurrentV1()
        const doc = shop?.shop || shop
        setShopDoc(doc)
        setBrandName(doc?.branding?.displayName || doc?.name || "Worqera")
        const c = resolveBrandColors(doc?.branding)
        setInk(deepenHex(c.primary))
      } catch {
        // keep storage
      }
    })()
  }, [])

  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        const data = await getPedidoService(id)
        setOrder(data)
      } catch (err: any) {
        toast.error(err?.message || "Erro ao carregar pedido")
      } finally {
        setLoading(false)
      }
    })()
    try {
      const raw = sessionStorage.getItem(`wq-email-notify:${id}`)
      if (raw) setEmailNotify(JSON.parse(raw))
    } catch {}
  }, [id])

  useEffect(() => {
    if (!order?.code || typeof window === "undefined") return
    const slug =
      shopDoc?.slug ||
      (typeof localStorage !== "undefined" ? localStorage.getItem("shopSlug") : "") ||
      ""
    const url = buildPublicOrderUrl(
      window.location.origin,
      slug,
      order.code,
      order.publicToken
    )
    setPublicUrl(url)
    if (!url) return
    const dark = normalizeHex(ink) || "#0F172A"
    let cancelled = false
    ;(async () => {
      try {
        const dataUrl = await QRCode.toDataURL(url, {
          margin: 1,
          width: 320,
          color: { dark, light: "#FFFFFF" },
        })
        if (!cancelled) setQrDataUrl(dataUrl)
      } catch {
        toast.error("Não foi possível gerar o QR Code")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [order, ink, shopDoc])

  useEffect(() => {
    if (!order?.code || !shopDoc) {
      setWaUrl("")
      return
    }
    const phone =
      order.clientPhone || order.client?.phone || order.client?.telefone || ""
    const built = buildOrderWaFromShop({
      shop: shopDoc,
      phone,
      code: order.code,
      publicToken: order.publicToken,
      clientName:
        order.clientName || order.client?.nomeCompleto || order.client?.name || "",
      templateKey: "created",
    })
    setWaUrl(built?.url || "")
  }, [order, shopDoc])

  useEffect(() => {
    if (!id) return
    let cancelled = false

    const ensurePdf = async () => {
      setPdfStatus("loading")
      setPdfError("")
      try {
        for (let attempt = 0; attempt < 6; attempt++) {
          if (cancelled) return
          const list = await listPedidoPdfsService(id).catch(() => [])
          const first = Array.isArray(list) && list.length ? list[0] : null
          if (first?.url) {
            const res = await fetch(first.url, { cache: "no-store" })
            if (!res.ok) throw new Error("Não foi possível abrir o laudo salvo")
            const blob = await res.blob()
            if (cancelled) return
            setBlobPreview(blob, first.fileName || first.nome || `laudo-${id}.pdf`)
            return
          }
          await new Promise((r) => setTimeout(r, 700))
        }
        if (cancelled) return
        const blob = await generateOrderPDFService(id)
        if (cancelled) return
        const code = order?.code || id
        setBlobPreview(blob, `laudo-${code}.pdf`)
      } catch (err: any) {
        if (cancelled) return
        setPdfStatus("error")
        setPdfError(err?.message || "Erro ao preparar o laudo")
      }
    }

    ensurePdf()
    return () => {
      cancelled = true
    }
  }, [id, order?.code, setBlobPreview])

  const clientName =
    order?.clientName || order?.client?.nomeCompleto || order?.client?.name || "Cliente"
  const clientEmail = String(
    order?.clientEmail || order?.client?.email || ""
  ).trim()
  const code = order?.code || "—"

  const copyLink = async () => {
    if (!publicUrl) {
      toast.error("Link público indisponível")
      return
    }
    try {
      await navigator.clipboard.writeText(publicUrl)
      toast.success("Link copiado")
    } catch {
      toast.error("Não foi possível copiar")
    }
  }

  const downloadPdf = () => {
    if (!blobRef.current) {
      toast.error("Laudo ainda não está pronto")
      return
    }
    downloadBlobAsFile(blobRef.current, pdfFileName)
    toast.success("Download iniciado")
  }

  const printPdf = () => {
    if (!pdfBlobUrl) {
      toast.error("Laudo ainda não está pronto")
      return
    }
    const w = window.open(pdfBlobUrl, "_blank", "noopener,noreferrer")
    if (!w) {
      toast.error("Permita pop-ups para imprimir o laudo")
      return
    }
    const tryPrint = () => {
      try {
        w.focus()
        w.print()
      } catch {
        // browser may block until load
      }
    }
    setTimeout(tryPrint, 600)
  }

  const openMailto = () => {
    if (!clientEmail) {
      toast.error("Cliente sem e-mail cadastrado")
      return
    }
    const subject = encodeURIComponent(`Pedido #${code} — ${brandName}`)
    const body = encodeURIComponent(
      [
        `Olá${clientName && clientName !== "Cliente" ? `, ${clientName}` : ""}!`,
        "",
        `Segue o acompanhamento do pedido #${code} em ${brandName}.`,
        publicUrl ? `Link: ${publicUrl}` : "",
        "",
        "Anexe o laudo PDF baixado nesta tela, se ainda não tiver recebido por e-mail automático.",
      ]
        .filter(Boolean)
        .join("\n")
    )
    window.location.href = `mailto:${encodeURIComponent(clientEmail)}?subject=${subject}&body=${body}`
  }

  const emailStatusLabel = (() => {
    if (!clientEmail) return "Cliente sem e-mail — não há envio automático."
    if (!emailNotify) return "Status do envio ainda não chegou — use Reenviar e-mail se precisar."
    if (emailNotify.ok && emailNotify.provider === "console") {
      return "SMTP não entregou de verdade (modo console). Veja o log da API: [mailer:dev]."
    }
    if (emailNotify.ok) {
      return `E-mail enviado (${emailNotify.provider || "smtp"}${
        emailNotify.attachments ? ", com PDF" : ""
      }).`
    }
    if (emailNotify.skipped) {
      const map: Record<string, string> = {
        "no-email": "Cliente sem e-mail no pedido.",
        "email-disabled": "E-mail desligado em Empresa → notificações.",
        missing: "Dados incompletos para enviar.",
      }
      return `Não enviou: ${map[emailNotify.reason] || emailNotify.reason || "ignorado"}.`
    }
    return `Falha no envio: ${emailNotify.error || "erro desconhecido"}. Confira o log da API ([mailer] / [orderNotify]).`
  })()

  const resendEmail = async () => {
    if (!id) return
    setResendingEmail(true)
    try {
      const result = await resendOrderEmailV1(id, "created")
      const notify = result?.emailNotify || result
      setEmailNotify(notify)
      try {
        sessionStorage.setItem(`wq-email-notify:${id}`, JSON.stringify(notify || null))
      } catch {}
      if (notify?.ok && notify?.provider !== "console") {
        toast.success("E-mail reenviado")
      } else if (notify?.ok && notify?.provider === "console") {
        toast.message("Logado no console da API", {
          description: "SMTP não está entregando — veja [mailer:dev] no terminal.",
        })
      } else {
        toast.error(notify?.error || notify?.reason || "Não enviou")
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao reenviar e-mail")
    } finally {
      setResendingEmail(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-8 text-[var(--wq-text-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Preparando pós-cadastro…
      </div>
    )
  }

  if (!order) {
    return (
      <div className="p-8">
        <p className="text-[var(--wq-danger)]">Pedido não encontrado.</p>
        <Button asChild className="mt-4">
          <Link href="/pedidos/novo">Novo pedido</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="-mx-3 -mt-4 sm:-mx-5 sm:-mt-6 md:-mx-8 md:-mt-7">
      <AppHeader
        title="Pedido criado"
        subtitle="Laudo, QR e envio — tudo num lugar"
        showHealth={false}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="rounded-[10px]">
              <Link href="/kanban">
                <KanbanSquare className="mr-1.5 h-4 w-4" />
                Kanban
              </Link>
            </Button>
            <Button asChild size="sm" className="rounded-[10px] bg-[var(--wq-action)] text-white hover:bg-[var(--wq-action)]/90">
              <Link href="/pedidos/novo">
                <Plus className="mr-1.5 h-4 w-4" />
                Novo pedido
              </Link>
            </Button>
          </div>
        }
      />

      <div className="mx-auto max-w-[1100px] space-y-5 px-5 py-6 md:px-8">
        <div className="rounded-2xl border border-[var(--wq-border)] bg-white p-5 md:p-6">
          <div className="flex flex-wrap items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-7 w-7 shrink-0 text-[var(--wq-success)]" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-[var(--wq-text-muted)]">{brandName}</p>
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--wq-text)] md:text-3xl">
                Pedido #{code}
              </h1>
              <p className="mt-1 text-sm text-[var(--wq-text-muted)]">
                {clientName}
                {clientEmail ? ` · ${clientEmail}` : " · sem e-mail"}
              </p>
              {clientEmail ? (
                <p className="mt-2 text-sm text-[var(--wq-text-muted)]">{emailStatusLabel}</p>
              ) : (
                <p className="mt-2 text-sm text-amber-700">
                  Cliente sem e-mail — imprima o laudo ou compartilhe o QR/link.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border border-[var(--wq-border)] bg-white p-5 md:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Tag className="h-4 w-4 text-[var(--wq-text-muted)]" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--wq-text-muted)]">
                QR · consulta pública
              </h2>
            </div>
            <div className="flex flex-col items-center gap-4">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt={`QR do pedido ${code}`}
                  className="h-[220px] w-[220px] rounded-xl border border-[var(--wq-border)] bg-white p-2"
                />
              ) : (
                <div className="flex h-[220px] w-[220px] items-center justify-center rounded-xl border border-dashed border-[var(--wq-border)] text-sm text-[var(--wq-text-muted)]">
                  Gerando QR…
                </div>
              )}
              {publicUrl ? (
                <p className="max-w-full break-all text-center text-xs text-[var(--wq-text-muted)]">
                  {publicUrl}
                </p>
              ) : null}
              <div className="flex w-full flex-wrap justify-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="rounded-[10px] bg-[var(--wq-action)] text-white hover:bg-[var(--wq-action)]/90"
                  asChild
                >
                  <Link href={`/pedidos/${id}/etiqueta?print=1`}>
                    <Printer className="mr-1.5 h-4 w-4" />
                    Imprimir etiqueta
                  </Link>
                </Button>
                <Button type="button" variant="outline" size="sm" className="rounded-[10px]" onClick={copyLink}>
                  <Copy className="mr-1.5 h-4 w-4" />
                  Copiar link
                </Button>
                {publicUrl ? (
                  <Button type="button" variant="outline" size="sm" className="rounded-[10px]" asChild>
                    <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-1.5 h-4 w-4" />
                      Abrir
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--wq-border)] bg-white p-5 md:p-6">
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-[var(--wq-text-muted)]" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--wq-text-muted)]">
                Laudo PDF
              </h2>
            </div>

            {pdfStatus === "loading" ? (
              <div className="flex h-[280px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--wq-border)] bg-[var(--wq-paper)] text-sm text-[var(--wq-text-muted)]">
                <Loader2 className="h-5 w-5 animate-spin" />
                Preparando laudo…
              </div>
            ) : pdfStatus === "error" ? (
              <div className="flex h-[280px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 text-center text-sm text-amber-900">
                <p>{pdfError || "Não foi possível carregar o laudo."}</p>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-[10px]"
                  onClick={async () => {
                    setPdfStatus("loading")
                    try {
                      const blob = await generateOrderPDFService(id)
                      setBlobPreview(blob, `laudo-${code}.pdf`)
                    } catch (err: any) {
                      setPdfStatus("error")
                      setPdfError(err?.message || "Erro ao gerar laudo")
                    }
                  }}
                >
                  Tentar de novo
                </Button>
              </div>
            ) : (
              <iframe
                title={`Laudo pedido ${code}`}
                src={pdfBlobUrl}
                className="h-[280px] w-full rounded-xl border border-[var(--wq-border)] bg-white"
              />
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="rounded-[10px] bg-[var(--wq-action)] text-white hover:bg-[var(--wq-action)]/90"
                disabled={pdfStatus !== "ready"}
                onClick={printPdf}
              >
                <Printer className="mr-1.5 h-4 w-4" />
                Imprimir laudo
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-[10px]"
                disabled={pdfStatus !== "ready"}
                onClick={downloadPdf}
              >
                Baixar PDF
              </Button>
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-[var(--wq-border)] bg-white p-5 md:p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--wq-text-muted)]">
            Enviar agora
          </h2>
          <div className="flex flex-wrap gap-2">
            {ENABLE_WA_ME && waUrl ? (
              <Button
                type="button"
                size="sm"
                className="rounded-[10px] bg-[var(--wq-success)] text-white hover:bg-[var(--wq-success)]/90"
                onClick={() => window.open(waUrl, "_blank", "noopener,noreferrer")}
              >
                <MessageCircle className="mr-1.5 h-4 w-4" />
                WhatsApp ao cliente
              </Button>
            ) : null}
            {ENABLE_WA_ME && !waUrl ? (
              <Button type="button" variant="outline" size="sm" className="rounded-[10px]" disabled>
                <MessageCircle className="mr-1.5 h-4 w-4" />
                WhatsApp (sem telefone)
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-[10px]"
              disabled={!clientEmail || resendingEmail}
              onClick={resendEmail}
            >
              <Mail className="mr-1.5 h-4 w-4" />
              {resendingEmail ? "Reenviando…" : clientEmail ? "Reenviar e-mail" : "Sem e-mail"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-[10px]"
              disabled={!clientEmail}
              onClick={openMailto}
            >
              Abrir e-mail (rascunho)
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-[10px]">
              <Link href={`/consultas/pedidos?q=${encodeURIComponent(code)}&tab=ativos`}>
                Ver pedido
              </Link>
            </Button>
          </div>
          <p className="mt-3 text-xs text-[var(--wq-text-muted)]">
            Dica rápida: imprima o laudo + etiqueta; o cliente acompanha pelo QR.
          </p>
        </section>
      </div>
    </div>
  )
}
