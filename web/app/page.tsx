import localFont from "next/font/local"
import { LandingPage } from "@/components/landing/LandingPage"

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

export const metadata = {
  title: "Worqera — A fila, os avisos e o cliente",
  description:
    "Sistema da operação: kanban por setores, avisos para a equipe e o cliente, e o histórico que vira relacionamento. Teste grátis 7 dias.",
}

export default function HomePage() {
  return (
    <div className={`${instrument.variable} ${plex.variable}`}>
      <LandingPage />
    </div>
  )
}
