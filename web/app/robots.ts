import type { MetadataRoute } from "next"
import { SITE_URL } from "@/components/landing/contact"

/** Marketing pages are crawlable; the logged-in app and private links are not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/kanban",
        "/pedidos",
        "/clientes",
        "/orcamentos",
        "/comunicacao",
        "/consultas",
        "/avaliacoes",
        "/funcionarios",
        "/settings",
        "/billing",
        "/admin",
        "/onboarding",
        "/status",
        "/tv",
        "/tv-dashboard",
        "/tv-financeiro",
        "/p/",
        "/invite/",
        "/reset-password",
        "/verify-email",
        "/forgot-password",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
