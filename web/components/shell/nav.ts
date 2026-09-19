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
  Star,
  type LucideIcon,
} from "lucide-react"

export type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  /** Shop owner only (financeiro / métricas) */
  ownerOnly?: boolean
  /** Owner/admin — hide from atendimento/sector */
  ownerAdminOnly?: boolean
  /** Hide from role=sector accounts */
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
    title: "Operação",
    items: [
      { href: "/kanban", label: "Kanban", icon: KanbanSquare },
      { href: "/pedidos", label: "Pedidos", icon: ClipboardList, hideForSector: true },
      { href: "/clientes", label: "Clientes", icon: Users, hideForSector: true },
      { href: "/consultas", label: "Consultas", icon: Search },
      { href: "/avaliacoes", label: "Avaliações", icon: Star, hideForSector: true },
      { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard, hideForSector: true },
    ],
  },
  {
    title: "Configuração",
    items: [
      { href: "/settings/empresa", label: "Empresa", icon: Building2, ownerAdminOnly: true },
      { href: "/settings/setores", label: "Setores", icon: Layers, ownerAdminOnly: true },
      { href: "/settings/servicos", label: "Serviços", icon: Wrench, ownerAdminOnly: true },
      { href: "/settings/equipe", label: "Equipe", icon: UsersRound, ownerAdminOnly: true },
      { href: "/funcionarios", label: "Funcionários", icon: UserCog, ownerAdminOnly: true },
      { href: "/settings/tv", label: "TVs", icon: Tv, ownerAdminOnly: true },
      { href: "/billing", label: "Plano", icon: CreditCard, ownerAdminOnly: true },
    ],
  },
  {
    title: "Gestão",
    items: [
      { href: "/admin/financeiro", label: "Financeiro", icon: Wallet, ownerOnly: true },
      { href: "/admin/metrics", label: "Métricas", icon: BarChart3, ownerOnly: true },
      { href: "/admin/shops", label: "Oficinas", icon: Shield, platformOnly: true },
    ],
  },
]

export function isNavActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard"
  return pathname === href || pathname.startsWith(`${href}/`)
}
