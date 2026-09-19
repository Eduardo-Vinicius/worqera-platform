/**
 * Per-shop item noun (multi-vertical). Defaults stay neutral — not sneaker-only.
 */

export type ShopVertical = "general" | "footwear" | "laundry" | "repair" | "custom"

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
}

export function resolveItemNoun(shop?: {
  vertical?: string
  branding?: { itemLabel?: string; itemLabelPlural?: string }
} | null): ItemNoun {
  const verticalRaw = String(shop?.vertical || "general").toLowerCase()
  const vertical = (
    ["general", "footwear", "laundry", "repair", "custom"].includes(verticalRaw)
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
