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
  Monitor,
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
  /** Open in a new tab (TV panels) */
  external?: boolean
  /** Visual emphasis in sidebar (ex.: Plano) */
  emphasize?: boolean
}

export type NavSection = {
  title: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Operação",
    items: [
      { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard, hideForSector: true },
      { href: "/kanban", label: "Kanban", icon: KanbanSquare },
      { href: "/pedidos", label: "Pedidos", icon: ClipboardList, hideForSector: true },
      { href: "/clientes", label: "Clientes", icon: Users, hideForSector: true },
      { href: "/consultas", label: "Consultas", icon: Search },
      { href: "/avaliacoes", label: "Avaliações", icon: Star, hideForSector: true },
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
    ],
  },
  {
    title: "Gestão",
    items: [
      {
        href: "/billing",
        label: "Plano",
        icon: CreditCard,
        ownerAdminOnly: true,
        emphasize: true,
      },
      { href: "/admin/financeiro", label: "Financeiro", icon: Wallet, ownerAdminOnly: true },
      {
        href: "/tv-financeiro",
        label: "TV Financeiro",
        icon: Monitor,
        ownerAdminOnly: true,
        external: true,
      },
      { href: "/admin/metrics", label: "Métricas", icon: BarChart3, ownerAdminOnly: true },
      { href: "/admin/shops", label: "Oficinas", icon: Shield, platformOnly: true },
    ],
  },
]

export function isNavActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard"
  return pathname === href || pathname.startsWith(`${href}/`)
}
