import {
  LayoutDashboard,
  KanbanSquare,
  ClipboardList,
  Users,
  Search,
  UserCog,
  Layers,
  Wrench,
  Package,
  Tag,
  CreditCard,
  Building2,
  Wallet,
  BarChart3,
  UsersRound,
  Shield,
  Activity,
  SlidersHorizontal,
  Megaphone,
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
  /** Remote feature flag. Hidden when the platform turns it off. */
  featureKey?: string
  /** Remote service module. Hidden when the platform turns it off. */
  serviceKey?: string
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
      { href: "/kanban", label: "Kanban", icon: KanbanSquare, serviceKey: "kanban" },
      { href: "/pedidos", label: "Pedidos", icon: ClipboardList, hideForSector: true, serviceKey: "orders" },
      { href: "/clientes", label: "Clientes", icon: Users, hideForSector: true, serviceKey: "clients" },
      { href: "/consultas", label: "Consultas", icon: Search, serviceKey: "consultas" },
      { href: "/avaliacoes", label: "Avaliações", icon: Star, hideForSector: true, serviceKey: "reviews" },
    ],
  },
  {
    title: "Configuração",
    items: [
      { href: "/settings/empresa", label: "Empresa", icon: Building2, ownerAdminOnly: true },
      { href: "/settings/setores", label: "Setores", icon: Layers, ownerAdminOnly: true },
      { href: "/settings/servicos", label: "Serviços", icon: Wrench, ownerAdminOnly: true },
      { href: "/settings/marcas", label: "Marcas", icon: Tag, ownerAdminOnly: true },
      { href: "/settings/acessorios", label: "Acessórios", icon: Package, ownerAdminOnly: true },
      { href: "/settings/equipe", label: "Equipe", icon: UsersRound, ownerAdminOnly: true },
      { href: "/funcionarios", label: "Funcionários", icon: UserCog, ownerAdminOnly: true },
      { href: "/settings/tv", label: "TVs", icon: Tv, ownerAdminOnly: true, serviceKey: "tv" },
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
      { href: "/admin/financeiro", label: "Financeiro", icon: Wallet, ownerAdminOnly: true, serviceKey: "finance" },
      {
        href: "/tv-financeiro",
        label: "TV Financeiro",
        icon: Monitor,
        ownerAdminOnly: true,
        external: true,
        serviceKey: "finance",
      },
      { href: "/admin/metrics", label: "Métricas", icon: BarChart3, ownerAdminOnly: true, serviceKey: "metrics" },
      { href: "/admin/shops", label: "Oficinas", icon: Shield, platformOnly: true },
      { href: "/admin/plataforma", label: "Portal", icon: Activity, platformOnly: true },
      { href: "/admin/plataforma/parametros", label: "Parâmetros", icon: SlidersHorizontal, platformOnly: true },
      { href: "/admin/plataforma/noticias", label: "Notícias", icon: Megaphone, platformOnly: true },
    ],
  },
]

export function isNavActive(pathname: string, href: string) {
  if (href === "/dashboard" || href === "/admin/plataforma") return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}
