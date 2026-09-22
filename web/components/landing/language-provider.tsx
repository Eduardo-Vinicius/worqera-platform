"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { type Locale, getTranslation } from "@/components/landing/i18n"

type Translation = ReturnType<typeof getTranslation>

type LanguageContextType = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Translation
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("pt")

  return (
    <LanguageContext.Provider
      value={{
        locale,
        setLocale,
        t: getTranslation(locale),
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
