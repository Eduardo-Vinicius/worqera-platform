"use client"

import { useEffect, useState } from "react"
import "./landing.css"
import { LanguageProvider } from "@/components/landing/language-provider"
import { Header } from "@/components/landing/header"
import { HeroSection } from "@/components/landing/hero-section"
import { PointsSection } from "@/components/landing/points-section"
import { ClientsSection } from "@/components/landing/clients-section"
import { PricingSection } from "@/components/landing/pricing-section"
import { FaqSection } from "@/components/landing/faq-section"
import { CtaSection } from "@/components/landing/cta-section"
import { Footer, WhatsAppFab } from "@/components/landing/footer"

function LandingInner() {
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
      <main>
        <HeroSection />
        <PointsSection />
        <ClientsSection />
        <PricingSection />
        <FaqSection />
        <CtaSection />
      </main>
      <Footer />
      <WhatsAppFab />
    </div>
  )
}

export function LandingPage() {
  return (
    <LanguageProvider>
      <LandingInner />
    </LanguageProvider>
  )
}
