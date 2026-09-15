import {
  LayoutDashboard,
  KanbanSquare,
  ClipboardList,
  Users,
  Search,
  UserCog,
  Layers,
  Wrench,
  CreditCard,
  Building2,
  Wallet,
  BarChart3,
  UsersRound,
  Shield,
  Tv,
  type LucideIcon,
} from "lucide-react"

export type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  /** Shop owner/admin only (financeiro etc.) */
  adminOnly?: boolean
  /** Owner/admin — hide from atendimento/sector */
  ownerAdminOnly?: boolean
  /** Hide from role=sector floor accounts */
  hideForSector?: boolean
  /** Platform Worqera super-admin only */
  platformOnly?: boolean
}

export type NavSection = {
  title: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Principal",
    items: [
      { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard, hideForSector: true },
      { href: "/kanban", label: "Kanban", icon: KanbanSquare },
      { href: "/pedidos", label: "Pedidos", icon: ClipboardList, hideForSector: true },
      { href: "/clientes", label: "Clientes", icon: Users, hideForSector: true },
      { href: "/consultas", label: "Consultas", icon: Search },
    ],
  },
  {
    title: "Empresa",
    items: [
      { href: "/settings/setores", label: "Setores", icon: Layers, ownerAdminOnly: true },
      { href: "/settings/servicos", label: "Serviços", icon: Wrench, ownerAdminOnly: true },
      { href: "/settings/equipe", label: "Equipe", icon: UsersRound, ownerAdminOnly: true },
      { href: "/funcionarios", label: "Funcionários", icon: UserCog, ownerAdminOnly: true },
      { href: "/settings/empresa", label: "Empresa", icon: Building2, ownerAdminOnly: true },
      { href: "/settings/tv", label: "TVs", icon: Tv, ownerAdminOnly: true },
      { href: "/billing", label: "Billing", icon: CreditCard, ownerAdminOnly: true },
    ],
  },
  {
    title: "Admin",
    items: [
      { href: "/admin/financeiro", label: "Financeiro", icon: Wallet, adminOnly: true },
      { href: "/admin/metrics", label: "Métricas", icon: BarChart3, adminOnly: true },
      { href: "/admin/shops", label: "Oficinas", icon: Shield, platformOnly: true },
    ],
  },
]

export function isNavActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard"
  return pathname === href || pathname.startsWith(`${href}/`)
}
