"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut } from "lucide-react"
import { NAV_SECTIONS, isNavActive } from "./nav"
import { cn } from "@/lib/utils"
import { WorqeraLogo } from "@/components/brand/WorqeraLogo"
import { logoutV1 } from "@/lib/apiV1"

async function handleLogout() {
  await logoutV1()
  window.location.href = "/login"
}

export function AppSidebar({
  mobile = false,
  onNavigate,
}: {
  mobile?: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const [role, setRole] = useState("")
  const [shopName, setShopName] = useState("Oficina")
  const [logoUrl, setLogoUrl] = useState("")
  const [userName, setUserName] = useState("Usuário")
  const [platformAdmin, setPlatformAdmin] = useState(false)
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Worqera"

  useEffect(() => {
    const sync = () => {
      setRole(String(localStorage.getItem("role") || "").toLowerCase())
      setShopName(
        localStorage.getItem("shopDisplayName") ||
          localStorage.getItem("shopName") ||
          "Oficina"
      )
      setLogoUrl(localStorage.getItem("shopLogoUrl") || "")
      setUserName(
        localStorage.getItem("userName") || localStorage.getItem("email") || "Usuário"
      )
      setPlatformAdmin(localStorage.getItem("platformAdmin") === "1")
    }
    sync()
    window.addEventListener("wq-session-updated", sync)
    return () => window.removeEventListener("wq-session-updated", sync)
  }, [])

  const isOwner = role === "owner"
  const isOwnerAdmin = role === "admin" || role === "owner"
  const isSector = role === "sector"
  const isPlatformOnly = platformAdmin && (role === "platform" || !role)

  return (
    <aside
      className={cn(
        "flex h-[100dvh] w-[246px] shrink-0 flex-col bg-[var(--wq-ink)] text-[var(--wq-on-ink)]",
        mobile && "h-full w-full max-w-none"
      )}
    >
      <div className="shrink-0 border-b border-white/10 px-4 pb-4 pt-5 sm:px-5 sm:pb-5 sm:pt-6">
        <Link
          href={isPlatformOnly ? "/admin/shops" : isSector ? "/kanban" : "/dashboard"}
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-3"
        >
          {logoUrl && !isPlatformOnly ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="h-9 w-9 shrink-0 rounded-lg bg-white object-contain p-0.5"
            />
          ) : (
            <WorqeraLogo className="h-9 w-9 shrink-0" title={appName} />
          )}
          <div className="min-w-0">
            <div className="truncate font-[family-name:var(--font-display)] text-base tracking-wide text-white sm:text-lg">
              {isPlatformOnly ? "Worqera Platform" : shopName}
            </div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
              {isPlatformOnly ? "Console" : appName}
            </div>
          </div>
        </Link>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-3">
        {NAV_SECTIONS.map((section, sectionIndex) => {
          const items = section.items.filter((item) => {
            if (isPlatformOnly) return Boolean(item.platformOnly)
            if (item.platformOnly) return platformAdmin
            if (item.ownerOnly && !isOwner) return false
            if (item.ownerAdminOnly && !isOwnerAdmin) return false
            if (item.hideForSector && isSector) return false
            return true
          })
          if (!items.length) return null
          return (
            <div
              key={section.title}
              className={cn(
                "space-y-1 py-3",
                sectionIndex > 0 && "border-t border-white/10"
              )}
            >
              <div className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {isPlatformOnly ? "Plataforma" : section.title}
              </div>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active = !item.external && isNavActive(pathname, item.href)
                  const Icon = item.icon
                  const emphasize = Boolean(item.emphasize)
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        target={item.external ? "_blank" : undefined}
                        rel={item.external ? "noopener noreferrer" : undefined}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center gap-2.5 rounded-[11px] px-3 py-2.5 text-[13.5px] font-medium transition-colors",
                          mobile && "min-h-11 py-3 text-[15px]",
                          active
                            ? "bg-[var(--wq-brand-soft)] text-white"
                            : emphasize
                              ? "border border-[var(--wq-brand)]/35 bg-[var(--wq-brand)]/15 text-white hover:bg-[var(--wq-brand)]/25"
                              : "text-slate-300 hover:bg-white/5 hover:text-white"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0 opacity-90",
                            mobile && "h-5 w-5",
                            emphasize && !active && "text-[var(--wq-brand)]"
                          )}
                          strokeWidth={1.7}
                        />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {emphasize ? (
                          <span
                            className={cn(
                              "rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                              active
                                ? "bg-white/20 text-white"
                                : "bg-[var(--wq-brand)] text-white"
                            )}
                          >
                            SaaS
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>

      <div className="shrink-0 border-t border-white/10 bg-[var(--wq-ink)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
        <div className="mb-2 flex items-center gap-3 sm:mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--wq-ink-2)] text-sm font-semibold text-[var(--wq-brand)]">
            {String(userName).slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-white">{userName}</div>
            <div className="truncate text-xs text-slate-400">{shopName}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="flex min-h-11 w-full items-center gap-2 rounded-[11px] px-3 py-2.5 text-[13px] text-slate-300 hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.7} />
          Sair
        </button>
      </div>
    </aside>
  )
}
