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
  return {
    title: `${feature.name} — Worqera`,
    description: feature.lead,
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
