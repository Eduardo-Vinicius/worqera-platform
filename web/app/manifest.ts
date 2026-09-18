import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Worqera",
    short_name: "Worqera",
    description: "Gestão de pedidos e kanban para oficinas de serviço",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f7f5fb",
    theme_color: "#6d28d9",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  }
}
