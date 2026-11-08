"use client"

import { createContext, useCallback, useContext, useSyncExternalStore, type ReactNode } from "react"
import { LazyMotion, MotionConfig, domMax } from "motion/react"
import { cn } from "@/lib/utils"

export const LP_THEME_KEY = "wq-lp-theme"

type LpTheme = { dark: boolean; toggleTheme: () => void }

const LpThemeContext = createContext<LpTheme>({ dark: false, toggleTheme: () => {} })

/** The theme lives on `<html data-lp-theme>`, set before paint by `LpThemeScript`. */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-lp-theme"] })
  return () => observer.disconnect()
}

const readDark = () => document.documentElement.dataset.lpTheme === "dark"

/** Light/dark of the marketing site. */
export function useLpTheme() {
  return useContext(LpThemeContext)
}

/** Root of every marketing page: theme, motion features and the `.lp` scope. */
export function LpRoot({ children, className }: { children: ReactNode; className?: string }) {
  const dark = useSyncExternalStore(subscribe, readDark, () => false)

  const toggleTheme = useCallback(() => {
    const next = !readDark()
    try {
      localStorage.setItem(LP_THEME_KEY, next ? "dark" : "light")
    } catch {}
    if (next) document.documentElement.dataset.lpTheme = "dark"
    else delete document.documentElement.dataset.lpTheme
  }, [])

  return (
    <LpThemeContext.Provider value={{ dark, toggleTheme }}>
      <LazyMotion features={domMax} strict>
        <MotionConfig reducedMotion="user">
          <div className={cn("lp min-h-screen overflow-x-clip antialiased", dark && "lp-dark", className)}>{children}</div>
        </MotionConfig>
      </LazyMotion>
    </LpThemeContext.Provider>
  )
}
