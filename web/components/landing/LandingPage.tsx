"use client"

import { useEffect, useState } from "react"
import "./landing.css"
import { LanguageProvider } from "@/components/landing/language-provider"
import { Header } from "@/components/landing/header"
import { HeroSection } from "@/components/landing/hero-section"
import { SystemSection } from "@/components/landing/system-section"
import { ProofSection } from "@/components/landing/proof-section"
import { ClientsSection } from "@/components/landing/clients-section"
import { TradesSection } from "@/components/landing/trades-section"
import { WhySection } from "@/components/landing/why-section"
import { DayReel } from "@/components/landing/day-reel"
import { LoopSection } from "@/components/landing/loop-section"
import { PracticeSection } from "@/components/landing/practice-section"
import { PricingSection } from "@/components/landing/pricing-section"
import { FaqSection } from "@/components/landing/faq-section"
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
        <SystemSection />
        <ProofSection />
        <ClientsSection />
        <TradesSection />
        <WhySection />
        <LoopSection />
        <DayReel />
        <PracticeSection />
        <PricingSection />
        <FaqSection />
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
