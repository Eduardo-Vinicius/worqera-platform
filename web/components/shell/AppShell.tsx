"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ClipboardList,
  KanbanSquare,
  LayoutDashboard,
  Menu,
  Plus,
  Wallet,
  X,
} from "lucide-react"
import { meV1, resendVerificationV1 } from "@/lib/apiV1"
import { AppSidebar } from "./AppSidebar"
import { TrialBanner } from "./TrialBanner"
import { DelayAlertsBanner } from "./DelayAlertsBanner"
import { QuickOrderJump } from "./QuickOrderJump"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

function isFullBleed(pathname: string) {
  return pathname.startsWith("/kanban")
}

function EmailUnverifiedBanner() {
  const [show, setShow] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const sync = () => {
      try {
        const unverified = localStorage.getItem("wq-email-unverified") === "1"
        const dismissed = localStorage.getItem("wq-email-unverified-dismissed") === "1"
        setShow(unverified && !dismissed)
      } catch {
        setShow(false)
      }
    }
    sync()
    window.addEventListener("wq-session-updated", sync)
    return () => window.removeEventListener("wq-session-updated", sync)
  }, [])

  if (!show) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 sm:px-4">
      <p className="min-w-0">
        Seu e-mail ainda não foi confirmado — você pode usar o app normalmente.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-amber-100 disabled:opacity-60"
          disabled={sending}
          onClick={async () => {
            const email = localStorage.getItem("email") || ""
            if (!email) {
              toast.error("E-mail da sessão não encontrado")
              return
            }
            setSending(true)
            try {
              await resendVerificationV1(email)
              toast.success("Link de confirmação reenviado")
            } catch (err: any) {
              toast.error(err?.message || "Não foi possível reenviar")
            } finally {
              setSending(false)
            }
          }}
        >
          {sending ? "Enviando…" : "Reenviar link"}
        </button>
        <Link
          href={`/verify-email?pending=1&email=${encodeURIComponent(
            typeof window !== "undefined" ? localStorage.getItem("email") || "" : ""
          )}`}
          className="rounded-lg px-2.5 py-1 text-xs font-medium underline-offset-2 hover:underline"
        >
          Ver página
        </Link>
        <button
          type="button"
          className="rounded-lg px-2 py-1 text-xs text-amber-800/80 hover:bg-amber-100"
          aria-label="Dispensar aviso"
          onClick={() => {
            setShow(false)
            try {
              localStorage.setItem("wq-email-unverified-dismissed", "1")
            } catch {}
          }}
        >
          Dispensar
        </button>
      </div>
    </div>
  )
}

function MobileBottomNav({ hidden }: { hidden?: boolean }) {
  const pathname = usePathname() || ""
  const [role, setRole] = useState("")

  useEffect(() => {
    setRole(String(localStorage.getItem("role") || "").toLowerCase())
  }, [pathname])

  if (hidden) return null
  if (pathname.startsWith("/pedidos/novo")) return null
  if (pathname.startsWith("/pedidos/") && pathname.includes("/sucesso")) return null

  const isSector = role === "sector"
  const canFinance = role === "owner" || role === "admin"

  const items = [
    { href: "/kanban", label: "Kanban", icon: KanbanSquare },
    !isSector ? { href: "/pedidos", label: "Pedidos", icon: ClipboardList } : null,
    !isSector ? { href: "/pedidos/novo", label: "Novo", icon: Plus, primary: true } : null,
    !isSector ? { href: "/dashboard", label: "Início", icon: LayoutDashboard } : null,
    canFinance ? { href: "/admin/financeiro", label: "Finanças", icon: Wallet } : null,
  ].filter(Boolean) as Array<{
    href: string
    label: string
    icon: typeof KanbanSquare
    primary?: boolean
  }>

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--wq-border)] bg-[color-mix(in_srgb,var(--wq-surface)_94%,transparent)] pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      aria-label="Atalhos móveis"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around gap-0.5 px-1 py-1.5">
        {items.map((item) => {
          const Icon = item.icon
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-medium",
                item.primary
                  ? "bg-[var(--wq-action)] text-white"
                  : active
                    ? "text-[var(--wq-brand)]"
                    : "text-[var(--wq-text-muted)]"
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={1.75} />
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || ""
  const fullBleed = isFullBleed(pathname)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [platformConsole, setPlatformConsole] = useState(false)

  useEffect(() => {
    try {
      const isPlatform = localStorage.getItem("platformAdmin") === "1"
      const noShop = !localStorage.getItem("shopId")
      setPlatformConsole(isPlatform && (noShop || pathname.startsWith("/admin/shops")))
    } catch {
      setPlatformConsole(pathname.startsWith("/admin/shops"))
    }
  }, [pathname])

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
          const isPlatform = me?.platformAdmin === true
          const noShop = !(me?.memberships?.[0]?.shop?.id || localStorage.getItem("shopId"))
          setPlatformConsole(Boolean(isPlatform && (noShop || pathname.startsWith("/admin/shops"))))
        }
      } catch {
        // ignore
      }
    })()
    return () => {
      cancelled = true
    }
  }, [pathname])

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
    if (pathname.startsWith("/admin/shops")) return
    // Allow settings while onboarding so "editar setores" doesn't loop back
    if (pathname.startsWith("/settings")) return
    if (pathname.startsWith("/verify-email")) return
    try {
      if (localStorage.getItem("platformAdmin") === "1") return
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

  const showMobileDock = !platformConsole

  return (
    <div className="flex min-h-[100dvh] bg-[var(--wq-paper)] text-[var(--wq-text)]">
      <div className="hidden h-[100dvh] shrink-0 md:sticky md:top-0 md:flex">
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
          <div className="absolute inset-y-0 left-0 flex w-[min(320px,92vw)] pt-[env(safe-area-inset-top)] shadow-2xl">
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
          {platformConsole ? null : <EmailUnverifiedBanner />}
          {platformConsole ? null : <TrialBanner />}
          {platformConsole ? null : <DelayAlertsBanner />}
        </div>
        <main className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
          <div
            className={cn(
              "w-full min-w-0 flex-1",
              fullBleed
                ? "max-w-none px-0 py-0 pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-0"
                : "mx-auto max-w-[1600px] px-2.5 py-3 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-5 sm:py-5 md:px-6 md:py-6 md:pb-6 lg:px-8"
            )}
          >
            {children}
          </div>
        </main>
      </div>
      {showMobileDock ? <MobileBottomNav /> : null}
      {platformConsole ? null : <QuickOrderJump />}
    </div>
  )
}
