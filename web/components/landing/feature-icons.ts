import {
  HandCoins,
  KanbanSquare,
  LineChart,
  MessageCircle,
  Package,
  QrCode,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react"
import type { FeatureSlug } from "@/components/landing/features-data"

export const FEATURE_ICONS: Record<FeatureSlug, LucideIcon> = {
  kanban: KanbanSquare,
  orcamentos: HandCoins,
  whatsapp: MessageCircle,
  cliente: QrCode,
  financeiro: LineChart,
  ia: Sparkles,
  equipe: Users,
  produtos: Package,
}
