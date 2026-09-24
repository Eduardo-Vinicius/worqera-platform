export type SelectedService = {
  id: string
  name: string
  price: number
  description: string
}

export type PhotoItem = {
  file?: File | null
  preview: string
  uploadedUrl?: string
  isCover?: boolean
}

export type OrderItemDraft = {
  id: string
  /** Index no pedido persistido; null/undefined = par novo ainda não gravado */
  serverItemIndex?: number | null
  sneaker: string
  selectedServices: SelectedService[]
  photos: PhotoItem[]
  notes: string
  /** Sector slug/id path for this pair (partida independente) */
  flowOptionIds: string[]
}

export type CreatePedidoItemPayload = {
  shoeModel: string
  services: Array<{ id?: string; name: string; price: number }>
  notes?: string
  flowOptionIds?: string[]
  departamentosSelecionados?: Array<{ id: string; nome: string }>
}

export type OrderItemPatch = {
  sneaker?: string
  selectedServices?: SelectedService[]
  photos?: PhotoItem[]
  notes?: string
  flowOptionIds?: string[]
}

let draftIdCounter = 0

export function newOrderItemId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  draftIdCounter += 1
  return `item-${draftIdCounter}`
}

export function emptyOrderItemDraft(): OrderItemDraft {
  return {
    id: newOrderItemId(),
    sneaker: "",
    selectedServices: [],
    photos: [],
    notes: "",
    flowOptionIds: ["atendimento"],
  }
}

export function isItemTouched(item: OrderItemDraft): boolean {
  return (
    Boolean(item.sneaker.trim()) ||
    item.selectedServices.length > 0 ||
    item.photos.length > 0 ||
    Boolean(item.notes.trim())
  )
}

export function isItemFilled(item: OrderItemDraft): boolean {
  return Boolean(item.sneaker.trim()) && item.selectedServices.length > 0
}

export function filterFilledItems(items: OrderItemDraft[]): OrderItemDraft[] {
  return items.filter(isItemFilled)
}

export function servicesSum(items: OrderItemDraft[]): number {
  return items.reduce(
    (acc, item) =>
      acc + item.selectedServices.reduce((sum, service) => sum + (Number(service.price) || 0), 0),
    0
  )
}

export function suggestedTotal(
  items: OrderItemDraft[],
  hasWarranty: boolean,
  warrantyPrice: number
): number {
  return servicesSum(items) + (hasWarranty ? Number(warrantyPrice) || 0 : 0)
}

export function mapItemsToCreatePayload(items: OrderItemDraft[]): CreatePedidoItemPayload[] {
  return items.map((item) => ({
    shoeModel: item.sneaker.trim(),
    services: item.selectedServices.map((service) => ({
      id: service.id,
      name: service.name,
      price: service.price,
    })),
    notes: item.notes.trim() || undefined,
    flowOptionIds: item.flowOptionIds?.length ? [...item.flowOptionIds] : ["atendimento"],
  }))
}

export function validateOrderItems(items: OrderItemDraft[]): Record<string, string> {
  const errors: Record<string, string> = {}
  const touched = items.filter(isItemTouched)

  if (touched.length === 0) {
    errors.items = "Informe ao menos um item com modelo e serviços"
    return errors
  }

  if (touched.some((item) => !isItemFilled(item))) {
    errors.items = "Cada item preenchido deve ter modelo e ao menos um serviço"
  }

  const hasInvalidService = touched.some((item) =>
    item.selectedServices.some((service) => service.price <= 0 || Number.isNaN(service.price))
  )
  if (hasInvalidService) {
    errors.services = "Todos os serviços devem ter preços válidos"
  }

  return errors
}

export function serializeItemsForDraft(items: OrderItemDraft[]) {
  return items.map((item) => ({
    id: item.id,
    sneaker: item.sneaker,
    selectedServices: item.selectedServices,
    notes: item.notes,
    flowOptionIds: item.flowOptionIds || ["atendimento"],
  }))
}

function draftFromStored(item: {
  id?: string
  sneaker?: string
  selectedServices?: SelectedService[]
  notes?: string
  flowOptionIds?: string[]
}): OrderItemDraft {
  return {
    id: typeof item?.id === "string" && item.id.length > 0 ? item.id : newOrderItemId(),
    sneaker: typeof item?.sneaker === "string" ? item.sneaker : "",
    selectedServices: Array.isArray(item?.selectedServices) ? item.selectedServices : [],
    photos: [],
    notes: typeof item?.notes === "string" ? item.notes : "",
    flowOptionIds:
      Array.isArray(item?.flowOptionIds) && item.flowOptionIds.length
        ? item.flowOptionIds.map(String)
        : ["atendimento"],
  }
}

export function migrateDraftToItems(draft: {
  items?: Array<{
    id?: string
    sneaker?: string
    selectedServices?: SelectedService[]
    notes?: string
    flowOptionIds?: string[]
  }>
  formData?: { sneaker?: string }
  selectedServices?: SelectedService[]
  selectedFlowOptions?: string[]
} | null | undefined): OrderItemDraft[] {
  if (Array.isArray(draft?.items) && draft.items.length > 0) {
    return draft.items.map((it) => {
      const base = draftFromStored(it)
      if (
        (!it.flowOptionIds || !it.flowOptionIds.length) &&
        Array.isArray(draft.selectedFlowOptions) &&
        draft.selectedFlowOptions.length
      ) {
        return { ...base, flowOptionIds: draft.selectedFlowOptions.map(String) }
      }
      return base
    })
  }

  return [
    draftFromStored({
      sneaker: typeof draft?.formData?.sneaker === "string" ? draft.formData.sneaker : "",
      selectedServices: Array.isArray(draft?.selectedServices) ? draft.selectedServices : [],
      notes: "",
      flowOptionIds: Array.isArray(draft?.selectedFlowOptions)
        ? draft.selectedFlowOptions.map(String)
        : ["atendimento"],
    }),
  ]
}

function photoUrlOf(u: unknown): string | null {
  if (typeof u === "string" && u.trim()) return u.trim()
  if (u && typeof u === "object" && typeof (u as { url?: string }).url === "string") {
    const url = String((u as { url?: string }).url || "").trim()
    return url || null
  }
  return null
}

/** Hidrata drafts a partir do pedido da API (edição). */
export function hydrateDraftsFromOrder(order: {
  items?: Array<{
    _id?: string
    id?: string
    shoeModel?: string
    services?: Array<{ id?: string; name?: string; price?: number }>
    photos?: unknown[]
    notes?: string | null
    plannedSectorIds?: unknown[]
  }>
  shoeModel?: string
  services?: Array<{ id?: string; name?: string; price?: number }>
  photos?: unknown[]
  notes?: string | null
  plannedSectorIds?: unknown[]
} | null | undefined): OrderItemDraft[] {
  const rawItems =
    Array.isArray(order?.items) && order!.items!.length
      ? order!.items!
      : [
          {
            shoeModel: order?.shoeModel || "",
            services: order?.services || [],
            photos: order?.photos || [],
            notes: order?.notes || null,
            plannedSectorIds: order?.plannedSectorIds || [],
          },
        ]

  return rawItems.map((it, index) => {
    const photos: PhotoItem[] = []
    ;(it.photos || []).forEach((p, i) => {
      const url = photoUrlOf(p)
      if (!url) return
      photos.push({
        file: null,
        preview: url,
        uploadedUrl: url,
        isCover: i === 0 || Boolean((p as { isCover?: boolean })?.isCover),
      })
    })
    const flowOptionIds = (it.plannedSectorIds || []).map(String).filter(Boolean)
    return {
      id: String(it._id || it.id || newOrderItemId()),
      serverItemIndex: index,
      sneaker: String(it.shoeModel || ""),
      selectedServices: (it.services || []).map((s) => ({
        id: String(s.id || s.name || ""),
        name: String(s.name || ""),
        price: Number(s.price) || 0,
        description: "",
      })),
      photos,
      notes: String(it.notes || ""),
      flowOptionIds: flowOptionIds.length ? flowOptionIds : ["atendimento"],
    }
  })
}
