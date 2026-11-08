import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { LanguageProvider } from "@/components/landing/language-provider"
import { FeatureLanding } from "@/components/landing/feature-page"
import { FEATURE_SLUGS, getFeature, isFeatureSlug } from "@/components/landing/features-data"

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return FEATURE_SLUGS.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  if (!isFeatureSlug(slug)) return {}
  const feature = getFeature(slug, "pt")
  const title = `${feature.name} — Worqera`
  return {
    title,
    description: feature.lead,
    alternates: { canonical: `/recursos/${slug}` },
    openGraph: { type: "website", locale: "pt_BR", siteName: "Worqera", url: `/recursos/${slug}`, title, description: feature.lead },
    twitter: { card: "summary_large_image", title, description: feature.lead },
  }
}

export default async function FeatureRoute({ params }: Props) {
  const { slug } = await params
  if (!isFeatureSlug(slug)) notFound()
  return (
    <LanguageProvider>
      <FeatureLanding slug={slug} />
    </LanguageProvider>
  )
}
