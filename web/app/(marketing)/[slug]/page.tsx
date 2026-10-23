import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { LanguageProvider } from "@/components/landing/language-provider"
import { TradeLanding } from "@/components/landing/trade-page"
import { getTradePage, isTradeSlug, TRADE_SLUGS } from "@/components/landing/trades-data"

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return TRADE_SLUGS.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  if (!isTradeSlug(slug)) return {}
  const page = getTradePage(slug, "pt")
  return {
    title: `Worqera para ${page.trade}`,
    description: page.lead,
  }
}

export default async function TradeRoute({ params }: Props) {
  const { slug } = await params
  if (!isTradeSlug(slug)) notFound()
  return (
    <LanguageProvider>
      <TradeLanding slug={slug} />
    </LanguageProvider>
  )
}
