import { OG_SIZE, ogImage } from "@/components/landing/og-card"

export const alt = "Worqera — do balcão à entrega, cada pedido no lugar certo"
export const size = OG_SIZE
export const contentType = "image/png"

export default function Image() {
  return ogImage({
    kicker: "Sistema de pedidos para quem tem fila: oficina, loja, assistência, produção",
    title: "Do balcão à entrega, cada pedido no lugar certo.",
  })
}
