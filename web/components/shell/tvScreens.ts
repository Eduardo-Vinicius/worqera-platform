import { Monitor, Tv, Wallet, type LucideIcon } from "lucide-react"

export type TvScreen = {
  href: string
  label: string
  hint: string
  icon: LucideIcon
  /** Only owner/admin (shows money). */
  ownerAdminOnly?: boolean
}

/** The shop's TV dashboards. One list for the top bar and the home, so they never drift apart. */
export const TV_SCREENS: TvScreen[] = [
  { href: "/tv", label: "TV Cliente", hint: "Para o balcão: o cliente acha o número do pedido", icon: Tv },
  { href: "/tv-dashboard", label: "TV Oficina", hint: "Para a produção: fila por setor e atrasados", icon: Monitor },
  { href: "/tv-financeiro", label: "TV Financeiro", hint: "Só dono/admin: faturamento do ano e meta", icon: Wallet, ownerAdminOnly: true },
]

export function visibleScreens(role: string) {
  const r = String(role || "").toLowerCase()
  if (r === "sector") return []
  const money = r === "owner" || r === "admin"
  return TV_SCREENS.filter((s) => !s.ownerAdminOnly || money)
}

export function markTvOpened() {
  try {
    localStorage.setItem("wq-tv-opened", "1")
  } catch {
    /* private mode */
  }
}

export async function copyTvLink(href: string) {
  const url = `${window.location.origin}${href}`
  try {
    await navigator.clipboard.writeText(url)
    return url
  } catch {
    return url
  }
}
