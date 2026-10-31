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
  Gauge,
  TrendingUp,
  ListChecks,
  Contact,
  Tv,
  Star,
  HandCoins,
  ShoppingBag,
  MessagesSquare,
  UserCheck,
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
  /** Hidden on the platform console until a shop is open */
  needsShop?: boolean
  /** Remote feature flag. Hidden when the platform turns it off. */
  featureKey?: string
  /** Remote service module. Hidden when the platform turns it off. */
  serviceKey?: string
  /** Open in a new tab (TV panels) */
  external?: boolean
  /** Visual emphasis in sidebar (ex.: Plano) */
  emphasize?: boolean
  /** Menu item that stands for a group of pages (tabs in `NAV_TABS`); active on any of them. */
  group?: NavGroup
  /** Other routes that light up this item (pages reached through its tabs). */
  alsoActive?: string[]
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
      { href: "/orcamentos", label: "Orçamentos", icon: HandCoins, hideForSector: true, serviceKey: "orders" },
      { href: "/consultas", label: "Consultas", icon: Search, serviceKey: "consultas" },
    ],
  },
  {
    title: "Clientes",
    items: [
      { href: "/clientes", label: "Clientes e CRM", icon: Users, hideForSector: true, serviceKey: "clients" },
      { href: "/avaliacoes", label: "Avaliações", icon: Star, hideForSector: true, serviceKey: "reviews" },
      { href: "/comunicacao", label: "WhatsApp e e-mail", icon: MessagesSquare, hideForSector: true },
    ],
  },
  {
    title: "Catálogo e estoque",
    items: [
      { href: "/settings/servicos", label: "Serviços", icon: Wrench, hideForSector: true, alsoActive: ["/settings/marcas", "/settings/acessorios"] },
      { href: "/admin/produtos", label: "Produtos e estoque", icon: ShoppingBag, ownerAdminOnly: true, hideForSector: true },
      { href: "/settings/setores", label: "Setores do kanban", icon: Layers, hideForSector: true },
    ],
  },
  {
    title: "Gestão",
    items: [
      { href: "/admin/financeiro", label: "Financeiro", icon: Wallet, ownerAdminOnly: true, serviceKey: "finance" },
      { href: "/admin/metrics", label: "Métricas", icon: BarChart3, ownerAdminOnly: true, serviceKey: "metrics" },
      { href: "/admin/atendimento", label: "Desempenho da equipe", icon: UserCheck, ownerAdminOnly: true, serviceKey: "metrics" },
      { href: "/settings/tv", label: "Telas da loja", icon: Tv, hideForSector: true, serviceKey: "tv" },
    ],
  },
  {
    title: "Configurações",
    items: [
      { href: "/settings/empresa", label: "Empresa", icon: Building2, hideForSector: true },
      { href: "/settings/equipe", label: "Equipe e acessos", icon: UsersRound, ownerAdminOnly: true },
      { href: "/funcionarios", label: "Funcionários", icon: UserCog, ownerAdminOnly: true },
      {
        href: "/billing",
        label: "Plano",
        icon: CreditCard,
        ownerAdminOnly: true,
        emphasize: true,
      },
    ],
  },
  {
    title: "Worqera",
    items: [
      { href: "/admin/plataforma", label: "Visão geral", icon: Activity, platformOnly: true },
      { href: "/admin/metricas", label: "Métricas", icon: Gauge, platformOnly: true },
      { href: "/admin/analises", label: "Análises", icon: TrendingUp, platformOnly: true },
      { href: "/admin/operacao", label: "Operação", icon: ListChecks, platformOnly: true },
      { href: "/admin/shops", label: "Oficinas", icon: Shield, platformOnly: true },
      { href: "/admin/contas", label: "Contas", icon: Contact, platformOnly: true },
      { href: "/admin/plataforma/parametros", label: "Parâmetros", icon: SlidersHorizontal, platformOnly: true },
      { href: "/admin/plataforma/noticias", label: "Notícias", icon: Megaphone, platformOnly: true },
    ],
  },
]

export type NavGroup = "catalogo" | "equipe" | "relatorios"

/** Pages that live under one menu item, shown as tabs at the top of each page (`SectionTabs`). */
export const NAV_TABS: Record<NavGroup, NavItem[]> = {
  catalogo: [
    { href: "/settings/servicos", label: "Serviços", icon: Wrench, hideForSector: true },
    { href: "/admin/produtos", label: "Produtos e estoque", icon: ShoppingBag, ownerAdminOnly: true },
    { href: "/settings/setores", label: "Setores do kanban", icon: Layers, hideForSector: true },
    { href: "/settings/marcas", label: "Marcas", icon: Tag, hideForSector: true },
    { href: "/settings/acessorios", label: "Acessórios", icon: Package, hideForSector: true },
  ],
  equipe: [
    { href: "/settings/equipe", label: "Acessos", icon: UsersRound, ownerAdminOnly: true },
    { href: "/funcionarios", label: "Funcionários", icon: UserCog, ownerAdminOnly: true },
  ],
  relatorios: [
    { href: "/admin/metrics", label: "Métricas", icon: BarChart3, ownerAdminOnly: true, serviceKey: "metrics" },
    { href: "/admin/atendimento", label: "Desempenho da equipe", icon: UserCheck, ownerAdminOnly: true, serviceKey: "metrics" },
  ],
}

export function isNavActive(pathname: string, href: string) {
  if (href === "/dashboard" || href === "/admin/plataforma") return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function isItemActive(pathname: string, item: NavItem) {
  if (item.group) return NAV_TABS[item.group].some((tab) => isNavActive(pathname, tab.href))
  return isNavActive(pathname, item.href) || Boolean(item.alsoActive?.some((href) => isNavActive(pathname, href)))
}
