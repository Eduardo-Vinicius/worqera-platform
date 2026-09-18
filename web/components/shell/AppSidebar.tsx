"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut } from "lucide-react"
import { NAV_SECTIONS, isNavActive } from "./nav"
import { cn } from "@/lib/utils"
import { WorqeraLogo } from "@/components/brand/WorqeraLogo"

function clearSession() {
  try {
    localStorage.removeItem("token")
    localStorage.removeItem("refreshToken")
    localStorage.removeItem("shopId")
    localStorage.removeItem("user")
    localStorage.removeItem("role")
    localStorage.removeItem("shopName")
    localStorage.removeItem("userName")
    localStorage.removeItem("email")
    localStorage.removeItem("platformAdmin")
  } catch {}
  document.cookie = "token=; Max-Age=0; path=/"
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

  return (
    <aside
      className={cn(
        "flex w-[246px] shrink-0 flex-col bg-[var(--wq-ink)] text-[var(--wq-on-ink)]",
        mobile && "h-full w-full max-w-none"
      )}
    >
      <div className="border-b border-white/10 px-4 pb-4 pt-5 sm:px-5 sm:pb-5 sm:pt-6">
        <Link
          href={isSector ? "/kanban" : "/dashboard"}
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-3"
        >
          {logoUrl ? (
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
              {shopName}
            </div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
              {appName}
            </div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV_SECTIONS.map((section) => {
          const items = section.items.filter((item) => {
            if (item.platformOnly) return platformAdmin
            if (item.ownerOnly && !isOwner) return false
            if (item.ownerAdminOnly && !isOwnerAdmin) return false
            if (item.hideForSector && isSector) return false
            return true
          })
          if (!items.length) return null
          return (
            <div key={section.title}>
              <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {section.title}
              </div>
              <ul className="space-y-1">
                {items.map((item) => {
                  const active = isNavActive(pathname, item.href)
                  const Icon = item.icon
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center gap-2.5 rounded-[11px] px-3 py-2.5 text-[13.5px] font-medium transition-colors",
                          active
                            ? "bg-[var(--wq-brand-soft)] text-white"
                            : "text-slate-300 hover:bg-white/5 hover:text-white"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.7} />
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-full bg-[var(--wq-ink-2)] flex items-center justify-center text-sm font-semibold text-[var(--wq-brand)]">
            {String(userName).slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-white truncate">{userName}</div>
            <div className="text-xs text-slate-400 truncate">{shopName}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={clearSession}
          className="flex w-full items-center gap-2 rounded-[11px] px-3 py-2 text-[13px] text-slate-300 hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.7} />
          Sair
        </button>
      </div>
    </aside>
  )
}
