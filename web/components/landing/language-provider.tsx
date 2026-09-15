"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { type Locale, getTranslation, type translations } from "@/components/landing/i18n"

type LanguageContextType = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: typeof translations.pt
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("pt")

  const value = {
    locale,
    setLocale,
    t: getTranslation(locale),
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
