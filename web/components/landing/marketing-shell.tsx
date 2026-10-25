"use client"

import "./landing.css"
import { useEffect, useState, type ReactNode } from "react"
import { Header } from "@/components/landing/header"
import { Footer, WhatsAppFab } from "@/components/landing/footer"

/** Header, footer, theme and WhatsApp button shared by the inner marketing pages. */
export function MarketingShell({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(localStorage.getItem("wq-lp-theme") === "dark")
  }, [])

  const toggleTheme = () => {
    setDark((current) => {
      const next = !current
      localStorage.setItem("wq-lp-theme", next ? "dark" : "light")
      return next
    })
  }

  return (
    <div className={dark ? "lp lp-dark min-h-screen overflow-x-hidden antialiased" : "lp min-h-screen overflow-x-hidden antialiased"}>
      <Header dark={dark} onToggleTheme={toggleTheme} />
      <main className="pt-14 sm:pt-16">{children}</main>
      <Footer />
      <WhatsAppFab />
    </div>
  )
}
