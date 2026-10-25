import type { Metadata } from "next"
import { LanguageProvider } from "@/components/landing/language-provider"
import { FeaturesIndex } from "@/components/landing/features-index"

export const metadata: Metadata = {
  title: "Recursos da Worqera — fila, CRM de orçamentos, WhatsApp, financeiro e IA",
  description:
    "Kanban por setores, consulta do cliente, CRM de orçamentos, WhatsApp, financeiro, produtos e IA. Tudo o que a Worqera faz, e em qual plano.",
}

export default function FeaturesRoute() {
  return (
    <LanguageProvider>
      <FeaturesIndex />
    </LanguageProvider>
  )
}
