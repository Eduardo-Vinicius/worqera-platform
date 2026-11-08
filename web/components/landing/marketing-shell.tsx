"use client"

import "./landing.css"
import type { ReactNode } from "react"
import { AnnounceBar } from "@/components/landing/announce-bar"
import { Header } from "@/components/landing/header"
import { Footer, WhatsAppFab } from "@/components/landing/footer"
import { ScrollProgress } from "@/components/landing/fx/scroll-progress"
import { LpRoot } from "@/components/landing/use-lp-theme"

/** Theme, header, footer and WhatsApp button shared by every marketing page. */
export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <LpRoot>
      <ScrollProgress />
      <AnnounceBar />
      <Header />
      <main>{children}</main>
      <Footer />
      <WhatsAppFab />
    </LpRoot>
  )
}
