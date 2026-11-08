import { SITE_URL, WHATSAPP_NUMBER } from "@/components/landing/contact"
import { translations } from "@/components/landing/i18n"
import { PLANS } from "@/lib/plans"

/** Structured data for search engines: the product with its plan prices, the company and the FAQ. */
export function LandingJsonLd() {
  const faq = translations.pt.faq.items
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Worqera",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, iOS, Android",
      url: SITE_URL,
      description:
        "Sistema de pedidos com kanban por setores, consulta do cliente por QR, CRM de orçamentos, WhatsApp, financeiro e IA. Teste 7 dias grátis.",
      offers: PLANS.map((plan) => ({
        "@type": "Offer",
        name: `Worqera ${plan.name}`,
        price: plan.monthly,
        priceCurrency: "BRL",
        url: `${SITE_URL}/signup?plan=${plan.name.toLowerCase()}`,
        description: plan.value,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Worqera",
      url: SITE_URL,
      logo: `${SITE_URL}/worqera-logo.png`,
      contactPoint: {
        "@type": "ContactPoint",
        telephone: `+${WHATSAPP_NUMBER}`,
        contactType: "sales",
        areaServed: "BR",
        availableLanguage: ["Portuguese", "English"],
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
  ]
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />
}
