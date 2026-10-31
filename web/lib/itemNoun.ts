/**
 * Per-shop item noun (multi-vertical). Defaults stay neutral — not sneaker-only.
 */

export type ShopVertical = "general" | "footwear" | "laundry" | "repair" | "auto" | "carpentry" | "printing" | "production" | "custom"

/** receive = o cliente deixa um item e busca depois. produce = a empresa produz/instala (nada chega do cliente). */
export type ShopWorkflow = "receive" | "produce"

export type ItemNoun = {
  singular: string
  plural: string
  vertical: ShopVertical
}

export const VERTICAL_PRESETS: Record<
  Exclude<ShopVertical, "custom">,
  { label: string; singular: string; plural: string }
> = {
  general: { label: "Geral / serviços", singular: "peça", plural: "peças" },
  footwear: { label: "Calçados / tênis", singular: "tênis", plural: "tênis" },
  laundry: { label: "Lavanderia", singular: "roupa", plural: "roupas" },
  repair: { label: "Assistência / reparo", singular: "equipamento", plural: "equipamentos" },
  auto: { label: "Oficina / estética automotiva", singular: "veículo", plural: "veículos" },
  carpentry: { label: "Marcenaria / móveis planejados", singular: "móvel", plural: "móveis" },
  printing: { label: "Gráfica / personalizados", singular: "produto", plural: "produtos" },
  production: { label: "Produção sob encomenda", singular: "item", plural: "itens" },
}

/** Business types offered at signup and in Empresa. `kit` = API starter kit key. */
export const BUSINESS_TYPES: Array<{ kit: Exclude<ShopVertical, "custom">; label: string; hint: string; workflow: ShopWorkflow }> = [
  { kit: "footwear", label: "Lavanderia de tênis / sapataria", hint: "O cliente deixa o par e busca pronto", workflow: "receive" },
  { kit: "laundry", label: "Lavanderia / costura", hint: "Roupas que chegam e voltam prontas", workflow: "receive" },
  { kit: "repair", label: "Assistência técnica", hint: "Celular, eletrônico, equipamento", workflow: "receive" },
  { kit: "auto", label: "Oficina / estética automotiva", hint: "O carro entra, faz o serviço e sai", workflow: "receive" },
  { kit: "carpentry", label: "Marcenaria / móveis planejados", hint: "Orçamento, projeto, produção e instalação", workflow: "produce" },
  { kit: "printing", label: "Gráfica / personalizados", hint: "Arte, aprovação, produção e entrega", workflow: "produce" },
  { kit: "production", label: "Produção sob encomenda", hint: "Você produz e entrega para o cliente", workflow: "produce" },
  { kit: "general", label: "Outro tipo de serviço", hint: "Começa genérico e você ajusta", workflow: "receive" },
]

export function resolveItemNoun(shop?: {
  vertical?: string
  branding?: { itemLabel?: string; itemLabelPlural?: string }
} | null): ItemNoun {
  const verticalRaw = String(shop?.vertical || "general").toLowerCase()
  const vertical = (
    ["general", "footwear", "laundry", "repair", "auto", "carpentry", "printing", "production", "custom"].includes(verticalRaw)
      ? verticalRaw
      : "general"
  ) as ShopVertical

  const preset =
    vertical !== "custom"
      ? VERTICAL_PRESETS[vertical]
      : VERTICAL_PRESETS.general

  const singular =
    String(shop?.branding?.itemLabel || "").trim() || preset.singular
  const plural =
    String(shop?.branding?.itemLabelPlural || "").trim() ||
    (singular === preset.singular ? preset.plural : `${singular}s`)

  return { singular, plural, vertical }
}

export function capitalizeNoun(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}
