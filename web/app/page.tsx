import type { Metadata } from "next"
import localFont from "next/font/local"
import { LandingPage } from "@/components/landing/LandingPage"
import { LandingJsonLd } from "@/components/landing/json-ld"
import { LpThemeScript } from "@/components/landing/theme-script"
import { PLANS, formatBRL } from "@/lib/plans"

/** Self-hosted — evita download do Google Fonts no `docker build` (rede/SSL). */
const instrument = localFont({
  src: [
    { path: "../fonts/instrument-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/instrument-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/instrument-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../fonts/instrument-sans-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-lp-display",
})

const plex = localFont({
  src: [
    { path: "../fonts/ibm-plex-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/ibm-plex-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/ibm-plex-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  display: "swap",
  variable: "--font-lp-body",
})

const TITLE = "Worqera — Sistema de pedidos com kanban por setor, cliente avisado e financeiro"
const DESCRIPTION =
  `Do balcão à entrega, cada pedido no lugar certo. Kanban por setores, consulta do cliente por QR, CRM de orçamentos, WhatsApp, financeiro e IA. Planos a partir de ${formatBRL(Math.min(...PLANS.map((plan) => plan.monthly)))}/mês, 7 dias grátis sem cartão.`

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Worqera",
    url: "/",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
}

export default function HomePage() {
  return (
    <div className={`${instrument.variable} ${plex.variable}`}>
      <LpThemeScript />
      <LandingJsonLd />
      <LandingPage />
    </div>
  )
}
