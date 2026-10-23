import localFont from "next/font/local"
import type { ReactNode } from "react"

const instrument = localFont({
  src: [
    { path: "../../fonts/instrument-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../../fonts/instrument-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../../fonts/instrument-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../../fonts/instrument-sans-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-lp-display",
})

const plex = localFont({
  src: [
    { path: "../../fonts/ibm-plex-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../../fonts/ibm-plex-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../../fonts/ibm-plex-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  display: "swap",
  variable: "--font-lp-body",
})

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <div className={`${instrument.variable} ${plex.variable}`}>{children}</div>
}
