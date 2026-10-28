"use client"

import { useEffect, useState } from "react"
import QRCode from "qrcode"

/** QR in the corner: Google review when the shop has the link, otherwise the shop's WhatsApp. */
export function TvShopQr({ reviewUrl, phone }: { reviewUrl: string; phone: string }) {
  const digits = phone.replace(/\D/g, "")
  const target = /^https:\/\//i.test(reviewUrl)
    ? { url: reviewUrl, title: "Gostou? Avalie a gente", hint: "Aponte a câmera" }
    : digits.length >= 10
      ? { url: `https://wa.me/${digits.length <= 11 ? `55${digits}` : digits}`, title: "Fale com a gente", hint: "WhatsApp da loja" }
      : null
  const [svg, setSvg] = useState("")

  useEffect(() => {
    if (!target) return
    QRCode.toString(target.url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0A0A12", light: "#FFFFFF" } })
      .then(setSvg)
      .catch(() => setSvg(""))
  }, [target?.url])

  if (!target || !svg) return null
  return (
    <div className="flex shrink-0 items-center gap-[1.4vmin] rounded-[1.4vmin] bg-white px-[1.4vmin] py-[1.2vmin] text-[#0A0A12]">
      {/* SVG keeps the QR sharp on any TV size. */}
      <div className="h-[10vmin] w-[10vmin] [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="max-w-[18vmin]">
        <p className="font-bold leading-tight" style={{ fontSize: "var(--tv-small)" }}>
          {target.title}
        </p>
        <p className="mt-[0.4vmin] font-medium text-[#55556A]" style={{ fontSize: "var(--tv-tiny)" }}>
          {target.hint}
        </p>
      </div>
    </div>
  )
}
