"use client"

import "./landing.css"
import { LanguageProvider, useLanguage } from "@/components/landing/language-provider"
import { Header } from "@/components/landing/header"
import { HeroSection } from "@/components/landing/hero-section"
import { SolutionSection } from "@/components/landing/solution-section"
import { ClientsSection } from "@/components/landing/clients-section"
import { HowItWorksSection } from "@/components/landing/how-it-works-section"
import { PricingSection } from "@/components/landing/pricing-section"
import { SecuritySection } from "@/components/landing/security-section"
import { FaqSection } from "@/components/landing/faq-section"
import { FinalCtaSection } from "@/components/landing/final-cta-section"
import { Footer } from "@/components/landing/footer"

function LandingInner() {
  const { theme } = useLanguage()

  return (
    <div
      data-theme={theme}
      className="lp min-h-screen overflow-x-hidden bg-background text-foreground antialiased"
    >
      <Header />
      <main>
        <HeroSection />
        <SolutionSection />
        <HowItWorksSection />
        <ClientsSection />
        <PricingSection />
        <SecuritySection />
        <FaqSection />
        <FinalCtaSection />
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
