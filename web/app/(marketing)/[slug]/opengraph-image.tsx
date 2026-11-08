import { OG_SIZE, ogImage } from "@/components/landing/og-card"
import { getTradePage, isTradeSlug, TRADE_SLUGS } from "@/components/landing/trades-data"

export const alt = "Worqera por ramo"
export const size = OG_SIZE
export const contentType = "image/png"

export function generateStaticParams() {
  return TRADE_SLUGS.map((slug) => ({ slug }))
}

export default async function Image({ params }: { params: Promise<{ slug: string }> | { slug: string } }) {
  const { slug } = await params
  if (!isTradeSlug(slug)) return ogImage({ kicker: "Worqera", title: "Do balcão à entrega, cada pedido no lugar certo." })
  const page = getTradePage(slug, "pt")
  return ogImage({ kicker: `Worqera para ${page.trade.toLowerCase()}`, title: page.headline })
}
