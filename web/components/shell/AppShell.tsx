"use client"

import { useEffect, useState, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import { meV1 } from "@/lib/apiV1"
import { AppSidebar } from "./AppSidebar"
import { TrialBanner } from "./TrialBanner"
import { DelayAlertsBanner } from "./DelayAlertsBanner"
import { cn } from "@/lib/utils"

function isFullBleed(pathname: string) {
  return (
    pathname.startsWith("/kanban") ||
    pathname.startsWith("/admin/financeiro") ||
    pathname.startsWith("/admin/metrics")
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || ""
  const fullBleed = isFullBleed(pathname)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const me = await meV1()
        if (!cancelled) {
          const slug = me?.memberships?.[0]?.shop?.slug
          if (slug) localStorage.setItem("shopSlug", String(slug))
          const { applyBrandCssVars, readBrandFromStorage } = await import("@/lib/shopBrand")
          applyBrandCssVars(readBrandFromStorage())
          window.dispatchEvent(new Event("wq-session-updated"))
        }
      } catch {
        // ignore
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const syncBrand = async () => {
      const { applyBrandCssVars, readBrandFromStorage } = await import("@/lib/shopBrand")
      applyBrandCssVars(readBrandFromStorage())
    }
    syncBrand()
    window.addEventListener("wq-session-updated", syncBrand)
    return () => window.removeEventListener("wq-session-updated", syncBrand)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (pathname.startsWith("/onboarding")) return
    try {
      if (localStorage.getItem("wq-needs-onboarding") === "1") {
        window.location.href = "/onboarding"
      }
    } catch {}
  }, [pathname])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden"
    else document.body.style.overflow = ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [mobileOpen])

  return (
    <div className="flex min-h-[100dvh] bg-[var(--wq-paper)] text-[var(--wq-text)]">
      <div className="hidden md:flex">
        <AppSidebar />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[var(--wq-ink)]/50 backdrop-blur-[2px]"
            aria-label="Fechar menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(300px,90vw)] pt-[env(safe-area-inset-top)] shadow-2xl">
            <AppSidebar mobile onNavigate={() => setMobileOpen(false)} />
          </div>
          <button
            type="button"
            className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] rounded-xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-2 shadow"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 md:static">
          <div className="flex items-center gap-3 border-b border-[var(--wq-border)] bg-[var(--wq-paper)] px-3 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] sm:px-4 md:hidden">
            <button
              type="button"
              className="shrink-0 rounded-xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-2"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="min-w-0 truncate font-[family-name:var(--font-display)] text-base sm:text-lg">
              {process.env.NEXT_PUBLIC_APP_NAME || "Worqera"}
            </span>
          </div>
          <TrialBanner />
          <DelayAlertsBanner />
        </div>
        <main className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
          <div
            className={cn(
              "w-full min-w-0 flex-1",
              fullBleed
                ? "max-w-none px-0 py-0"
                : "mx-auto max-w-[1320px] px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-6 md:px-8 md:py-7"
            )}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
