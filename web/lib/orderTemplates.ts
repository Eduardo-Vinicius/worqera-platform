/** Local order templates for "pedido rápido" (TOP-07). */

export type OrderTemplate = {
  id: string
  name: string
  serviceIds: string[]
  flowOptionIds: string[]
  accessories: string[]
  hasWarranty?: boolean
}

export const ORDER_TEMPLATES_KEY = "order-templates-v1"

export function loadOrderTemplates(raw?: string | null): OrderTemplate[] {
  if (raw == null && typeof window !== "undefined") {
    raw = localStorage.getItem(ORDER_TEMPLATES_KEY)
  }
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((t: any) => ({
        id: String(t.id || ""),
        name: String(t.name || "").trim(),
        serviceIds: Array.isArray(t.serviceIds) ? t.serviceIds.map(String) : [],
        flowOptionIds: Array.isArray(t.flowOptionIds) ? t.flowOptionIds.map(String) : [],
        accessories: Array.isArray(t.accessories) ? t.accessories.map(String) : [],
        hasWarranty: Boolean(t.hasWarranty),
      }))
      .filter((t) => t.id && t.name)
  } catch {
    return []
  }
}

export function saveOrderTemplates(templates: OrderTemplate[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(ORDER_TEMPLATES_KEY, JSON.stringify(templates))
}

export function upsertOrderTemplate(
  templates: OrderTemplate[],
  template: Omit<OrderTemplate, "id"> & { id?: string }
): OrderTemplate[] {
  const id = template.id || `tpl_${Date.now()}`
  const next: OrderTemplate = {
    id,
    name: template.name.trim(),
    serviceIds: template.serviceIds,
    flowOptionIds: template.flowOptionIds,
    accessories: template.accessories,
    hasWarranty: template.hasWarranty,
  }
  const idx = templates.findIndex((t) => t.id === id)
  if (idx >= 0) {
    const copy = [...templates]
    copy[idx] = next
    return copy
  }
  return [...templates, next]
}

export function removeOrderTemplate(templates: OrderTemplate[], id: string): OrderTemplate[] {
  return templates.filter((t) => t.id !== id)
}
