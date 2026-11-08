/** The Worqera WhatsApp, used by every "talk to us" link on the marketing site. */
export const WHATSAPP_NUMBER = "5511985591053"

export const waLink = (text?: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}${text ? `?text=${encodeURIComponent(text)}` : ""}`

export const WA_MESSAGES = {
  general: { pt: "Olá! Gostaria de saber mais sobre a Worqera.", en: "Hi! I'd like to know more about Worqera." },
  meet: { pt: "Olá! Quero conhecer a Worqera.", en: "Hi! I want to get to know Worqera." },
  setup: { pt: "Olá! Quero a implantação da Worqera na minha empresa.", en: "Hi! I want Worqera setup for my company." },
  doubt: { pt: "Olá! Fiquei com uma dúvida sobre a Worqera.", en: "Hi! I have a question about Worqera." },
}

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://worqera.com").replace(/\/$/, "")
