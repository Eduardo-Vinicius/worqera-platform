import { Instrument_Sans, IBM_Plex_Sans } from "next/font/google"
import { LandingPage } from "@/components/landing/LandingPage"

const instrument = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lp-display",
})

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-lp-body",
})

export const metadata = {
  title: "Worqera — A fila da sua oficina, sob controle",
  description:
    "Kanban por setores e consulta pública por código. Do tênis à lavanderia — o mesmo loop. Teste grátis 7 dias.",
}

export default function HomePage() {
  return (
    <div className={`${instrument.variable} ${plex.variable}`}>
      <LandingPage />
    </div>
  )
}
