"use client"

import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) {
    return (
      <Button type="button" variant="outline" size="sm" className="h-9 w-9 rounded-[10px] p-0" aria-label="Tema">
        <Sun className="h-4 w-4" />
      </Button>
    )
  }

  const cycle = () => {
    // Prefer explicit light/dark (skip system — fewer surprises)
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const Icon = theme === "dark" ? Moon : Sun
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={cycle}
      className="h-9 gap-1.5 rounded-[10px] border-[var(--wq-border)] bg-[var(--wq-surface)] text-[var(--wq-text)]"
      aria-label="Alternar tema"
      title={theme === "dark" ? "Tema escuro" : "Tema claro"}
    >
      <Icon className="h-4 w-4" />
      {!compact ? (
        <span className="hidden text-xs sm:inline">{theme === "dark" ? "Escuro" : "Claro"}</span>
      ) : null}
    </Button>
  )
}
