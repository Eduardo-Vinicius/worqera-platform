import type { MetadataRoute } from "next"
import { SITE_URL } from "@/components/landing/contact"
import { FEATURE_SLUGS } from "@/components/landing/features-data"
import { TRADE_SLUGS } from "@/components/landing/trades-data"

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const entry = (path: string, priority: number, changeFrequency: "weekly" | "monthly" | "yearly" = "monthly") => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  })
  return [
    entry("/", 1, "weekly"),
    entry("/recursos", 0.8),
    ...FEATURE_SLUGS.map((slug) => entry(`/recursos/${slug}`, 0.7)),
    ...TRADE_SLUGS.map((slug) => entry(`/${slug}`, 0.8)),
    entry("/signup", 0.6),
    entry("/privacidade", 0.2, "yearly"),
  ]
}
