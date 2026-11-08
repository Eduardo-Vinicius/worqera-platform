"use client"

import dynamic from "next/dynamic"
import { LanguageProvider } from "@/components/landing/language-provider"
import { MarketingShell } from "@/components/landing/marketing-shell"
import { HeroSection } from "@/components/landing/hero-section"
import { NumbersSection } from "@/components/landing/numbers-section"
import { TradesMarquee } from "@/components/landing/trades-marquee"
import { PointsSection } from "@/components/landing/points-section"
import { PricingSection } from "@/components/landing/pricing-section"
import { FaqSection } from "@/components/landing/faq-section"
import { CtaSection } from "@/components/landing/cta-section"

const HowSection = dynamic(() => import("@/components/landing/how-section").then((mod) => mod.HowSection))
const BentoSection = dynamic(() => import("@/components/landing/bento-section").then((mod) => mod.BentoSection))
const ClientsSection = dynamic(() => import("@/components/landing/clients-section").then((mod) => mod.ClientsSection))

export function LandingPage() {
  return (
    <LanguageProvider>
      <MarketingShell>
        <HeroSection />
        <NumbersSection />
        <TradesMarquee />
        <PointsSection />
        <HowSection />
        <BentoSection />
        <ClientsSection />
        <PricingSection />
        <FaqSection />
        <CtaSection />
      </MarketingShell>
    </LanguageProvider>
  )
}
