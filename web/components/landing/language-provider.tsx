"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { type Locale, getTranslation } from "@/components/landing/i18n"

export type LpTheme = "light" | "dark"

type Translation = ReturnType<typeof getTranslation>

type LanguageContextType = {
  locale: Locale
  setLocale: (locale: Locale) => void
  theme: LpTheme
  setTheme: (theme: LpTheme) => void
  toggleTheme: () => void
  t: Translation
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const THEME_KEY = "wq-lp-theme"

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("pt")
  const [theme, setThemeState] = useState<LpTheme>("light")

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY)
      if (saved === "dark" || saved === "light") setThemeState(saved)
    } catch {
      // ignore
    }
  }, [])

  const setTheme = (next: LpTheme) => {
    setThemeState(next)
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      // ignore
    }
  }

  const value: LanguageContextType = {
    locale,
    setLocale,
    theme,
    setTheme,
    toggleTheme: () => setTheme(theme === "light" ? "dark" : "light"),
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
