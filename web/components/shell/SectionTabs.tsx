"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { NAV_TABS, isNavActive, type NavGroup } from "./nav"
import { featureOn, serviceOn } from "@/lib/runtimeFlags"
import { cn } from "@/lib/utils"

/** Tabs at the top of the pages grouped under one menu item (Catálogo, Equipe, Relatórios). */
export function SectionTabs({ group, className }: { group: NavGroup; className?: string }) {
  const pathname = usePathname()
  const [role, setRole] = useState<string | null>(null)
  const [visiting, setVisiting] = useState(false)

  useEffect(() => {
    setRole(String(localStorage.getItem("role") || "").toLowerCase())
    setVisiting(localStorage.getItem("platformAdmin") === "1" && Boolean(localStorage.getItem("shopId")))
  }, [])

  if (role === null) return null
  const ownerAdmin = role === "owner" || role === "admin" || visiting
  const tabs = NAV_TABS[group].filter((tab) => {
    if (tab.ownerAdminOnly && !ownerAdmin) return false
    if (tab.hideForSector && role === "sector") return false
    if (tab.featureKey && !featureOn(tab.featureKey)) return false
    if (tab.serviceKey && !serviceOn(tab.serviceKey)) return false
    return true
  })
  if (tabs.length < 2) return null

  return (
    <nav
      aria-label="Seções"
      className={cn(
        "-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      {tabs.map((tab) => {
        const active = isNavActive(pathname, tab.href)
        const Icon = tab.icon
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-[10px] border px-3 py-1.5 text-sm font-medium transition",
              active
                ? "border-[var(--wq-brand)] bg-[var(--wq-brand)] text-white"
                : "border-[var(--wq-border)] bg-[var(--wq-surface)] text-[var(--wq-text-muted)] hover:text-[var(--wq-text)]"
            )}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
