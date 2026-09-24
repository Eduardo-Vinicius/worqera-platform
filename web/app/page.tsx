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
  title: "Worqera — A fila do seu negócio, sob controle",
  description:
    "Kanban por setores e consulta pública por código. Calçados, automotivo, lavanderia, atelier — o mesmo loop. Teste grátis 7 dias.",
}

export default function HomePage() {
  return (
    <div className={`${instrument.variable} ${plex.variable}`}>
      <LandingPage />
    </div>
  )
}
