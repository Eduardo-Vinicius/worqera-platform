"use client"

import "./landing.css"
import { LanguageProvider } from "@/components/landing/language-provider"
import { Header } from "@/components/landing/header"
import { HeroSection } from "@/components/landing/hero-section"
import { LoopSection } from "@/components/landing/loop-section"
import { TradesSection } from "@/components/landing/trades-section"
import { PracticeSection } from "@/components/landing/practice-section"
import { ClientsSection } from "@/components/landing/clients-section"
import { PricingSection } from "@/components/landing/pricing-section"
import { FaqSection } from "@/components/landing/faq-section"
import { Footer } from "@/components/landing/footer"

function LandingInner() {
  return (
    <div className="lp min-h-screen overflow-x-hidden antialiased">
      <Header />
      <main>
        <HeroSection />
        <LoopSection />
        <TradesSection />
        <PracticeSection />
        <ClientsSection />
        <PricingSection />
        <FaqSection />
      </main>
      <Footer />
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
