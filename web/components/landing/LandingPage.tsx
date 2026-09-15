"use client"

import "./landing.css"
import { LanguageProvider } from "@/components/landing/language-provider"
import { Header } from "@/components/landing/header"
import { HeroSection } from "@/components/landing/hero-section"
import { AboutSection } from "@/components/landing/about-section"
import { ProblemSection } from "@/components/landing/problem-section"
import { SolutionSection } from "@/components/landing/solution-section"
import { RoiSection } from "@/components/landing/roi-section"
import { ClientsSection } from "@/components/landing/clients-section"
import { HowItWorksSection } from "@/components/landing/how-it-works-section"
import { PricingSection } from "@/components/landing/pricing-section"
import { GuaranteeSection } from "@/components/landing/guarantee-section"
import { SecuritySection } from "@/components/landing/security-section"
import { FaqSection } from "@/components/landing/faq-section"
import { FinalCtaSection } from "@/components/landing/final-cta-section"
import { Footer } from "@/components/landing/footer"

export function LandingPage() {
  return (
    <LanguageProvider>
      <div className="lp min-h-screen overflow-x-hidden bg-background text-foreground antialiased">
        <Header />
        <main>
          <HeroSection />
          <AboutSection />
          <ProblemSection />
          <SolutionSection />
          <RoiSection />
          <ClientsSection />
          <HowItWorksSection />
          <PricingSection />
          <GuaranteeSection />
          <SecuritySection />
          <FaqSection />
          <FinalCtaSection />
        </main>
        <Footer />
      </div>
    </LanguageProvider>
  )
}
