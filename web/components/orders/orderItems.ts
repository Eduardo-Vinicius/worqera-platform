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
  brand: string
  selectedServices: SelectedService[]
  photos: PhotoItem[]
  notes: string
  /** Sector slug/id path for this pair (partida independente) */
  flowOptionIds: string[]
  origin?: "brought" | "stock"
  productId?: string
  variantId?: string
  quantity?: number
  unitPrice?: number
  /** Shop product picked off the shelf: starts in the final sector, no production. */
  ready?: boolean
}

export type CreatePedidoItemPayload = {
  shoeModel: string
  brand?: string
  services: Array<{ id?: string; name: string; price: number; note?: string }>
  notes?: string
  flowOptionIds?: string[]
  departamentosSelecionados?: Array<{ id: string; nome: string }>
  origin?: "brought" | "stock"
  productId?: string
  variantId?: string
  quantity?: number
  unitPrice?: number
  ready?: boolean
}

export type OrderItemPatch = {
  sneaker?: string
  brand?: string
  selectedServices?: SelectedService[]
  photos?: PhotoItem[]
  notes?: string
  flowOptionIds?: string[]
  origin?: "brought" | "stock"
  productId?: string
  variantId?: string
  quantity?: number
  unitPrice?: number
  ready?: boolean
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
    brand: "",
    selectedServices: [],
    photos: [],
    notes: "",
    flowOptionIds: ["atendimento"],
  }
}

export function isItemTouched(item: OrderItemDraft): boolean {
  return (
    Boolean(item.sneaker.trim()) ||
    Boolean(item.brand.trim()) ||
    item.selectedServices.length > 0 ||
    item.photos.length > 0 ||
    Boolean(item.notes.trim()) ||
    Boolean(item.productId)
  )
}

export function isItemFilled(item: OrderItemDraft): boolean {
  if (item.origin === "stock" && item.productId) return true
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
  const stock = items.reduce((acc, item) => {
    if (item.origin !== "stock" || !item.productId) return acc
    return acc + (Number(item.unitPrice) || 0) * Math.max(1, Number(item.quantity) || 1)
  }, 0)
  return servicesSum(items) + stock + (hasWarranty ? Number(warrantyPrice) || 0 : 0)
}

export function mapItemsToCreatePayload(items: OrderItemDraft[]): CreatePedidoItemPayload[] {
  return items.map((item) => ({
    shoeModel: item.sneaker.trim(),
    brand: item.brand.trim() || undefined,
    services: item.selectedServices.map((service) => ({
      id: service.id,
      name: service.name,
      price: service.price,
      note: service.description.trim() || undefined,
    })),
    notes: item.notes.trim() || undefined,
    flowOptionIds: item.flowOptionIds?.length ? [...item.flowOptionIds] : ["atendimento"],
    ...(item.origin === "stock" && item.productId
      ? {
          origin: "stock" as const,
          productId: item.productId,
          variantId: item.variantId || undefined,
          quantity: Math.max(1, Number(item.quantity) || 1),
          unitPrice: Number(item.unitPrice) || 0,
          ready: item.ready !== false,
        }
      : item.origin === "brought"
        ? { origin: "brought" as const }
        : {}),
  }))
}

/** Index of every item the customer brought (the shop products live in their own list). */
export function clientItemIndexes(items: OrderItemDraft[]): number[] {
  return items.map((item, index) => (item.origin === "stock" ? -1 : index)).filter((index) => index >= 0)
}

export function stockItemIndexes(items: OrderItemDraft[]): number[] {
  return items.map((item, index) => (item.origin === "stock" ? index : -1)).filter((index) => index >= 0)
}

export function stockLineDraft(fields: { productId: string; variantId?: string; label: string; unitPrice: number }): OrderItemDraft {
  return {
    ...emptyOrderItemDraft(),
    origin: "stock",
    productId: fields.productId,
    variantId: fields.variantId || "",
    sneaker: fields.label,
    quantity: 1,
    unitPrice: fields.unitPrice,
    ready: true,
    flowOptionIds: [],
  }
}

export function validateOrderItems(items: OrderItemDraft[]): Record<string, string> {
  const errors: Record<string, string> = {}
  const touched = items.filter(isItemTouched)

  if (touched.length === 0) {
    errors.items = "Informe ao menos um item com modelo e serviços"
    return errors
  }

  const incomplete = touched.find((item) => !isItemFilled(item))
  if (incomplete) {
    errors.items =
      incomplete.origin === "stock"
        ? "Escolha o produto da loja no item"
        : "Cada item preenchido deve ter modelo e ao menos um serviço"
  }

  return errors
}

export type CreateReviewPair = {
  label: string
  model: string
  services: string
  photoCount: number
}

/** Resumo do que vai ser criado. Foto em falta não bloqueia. */
export function summarizeCreateReview(items: OrderItemDraft[]) {
  const filled = filterFilledItems(items)
  const brought = filled.filter((item) => item.origin !== "stock")
  const pairs: CreateReviewPair[] = brought.map((item, index) => ({
    label: brought.length > 1 ? `Item ${index + 1}` : "Item",
    model: [item.brand.trim(), item.sneaker.trim()].filter(Boolean).join(" · "),
    services: item.selectedServices.map((service) => service.name).filter(Boolean).join(", "),
    photoCount: item.photos.length,
  }))
  const products = filled
    .filter((item) => item.origin === "stock")
    .map((item) => {
      const qty = Math.max(1, Number(item.quantity) || 1)
      return { label: item.sneaker, quantity: qty, total: qty * (Number(item.unitPrice) || 0) }
    })
  return {
    pairs,
    products,
    missingPhoto: pairs.some((pair) => pair.photoCount === 0),
  }
}

export function serializeItemsForDraft(items: OrderItemDraft[]) {
  return items.map((item) => ({
    id: item.id,
    sneaker: item.sneaker,
    brand: item.brand,
    selectedServices: item.selectedServices,
    notes: item.notes,
    flowOptionIds: item.flowOptionIds || ["atendimento"],
    ...(item.origin === "stock" && item.productId
      ? {
          origin: "stock" as const,
          productId: item.productId,
          variantId: item.variantId || "",
          quantity: Math.max(1, Number(item.quantity) || 1),
          unitPrice: Number(item.unitPrice) || 0,
          ready: item.ready !== false,
        }
      : {}),
  }))
}

function draftFromStored(item: {
  id?: string
  sneaker?: string
  brand?: string
  selectedServices?: SelectedService[]
  notes?: string
  flowOptionIds?: string[]
  origin?: string
  productId?: string
  variantId?: string
  quantity?: number
  unitPrice?: number
  ready?: boolean
}): OrderItemDraft {
  if (item?.origin === "stock" && typeof item.productId === "string" && item.productId) {
    return {
      ...stockLineDraft({
        productId: item.productId,
        variantId: typeof item.variantId === "string" ? item.variantId : "",
        label: typeof item.sneaker === "string" ? item.sneaker : "",
        unitPrice: Number(item.unitPrice) || 0,
      }),
      id: typeof item.id === "string" && item.id.length > 0 ? item.id : newOrderItemId(),
      quantity: Math.max(1, Number(item.quantity) || 1),
      ready: item.ready !== false,
    }
  }
  return {
    id: typeof item?.id === "string" && item.id.length > 0 ? item.id : newOrderItemId(),
    sneaker: typeof item?.sneaker === "string" ? item.sneaker : "",
    brand: typeof item?.brand === "string" ? item.brand : "",
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
  items?: Array<Parameters<typeof draftFromStored>[0]>
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
    brand?: string
    services?: Array<{ id?: string; name?: string; price?: number; note?: string; description?: string }>
    photos?: unknown[]
    notes?: string | null
    plannedSectorIds?: unknown[]
    origin?: string
    productId?: string
    variantId?: string
    quantity?: number
    unitPrice?: number
  }>
  shoeModel?: string
  services?: Array<{ id?: string; name?: string; price?: number; note?: string; description?: string }>
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
      brand: String(it.brand || ""),
      selectedServices: (it.services || []).map((s) => ({
        id: String(s.id || s.name || ""),
        name: String(s.name || ""),
        price: Number(s.price) || 0,
        description: String(s.note || s.description || ""),
      })),
      photos,
      notes: String(it.notes || ""),
      flowOptionIds: flowOptionIds.length ? flowOptionIds : ["atendimento"],
      origin: it.origin === "stock" ? "stock" : "brought",
      productId: it.productId ? String(it.productId) : "",
      variantId: it.variantId ? String(it.variantId) : "",
      quantity: Math.max(1, Number(it.quantity) || 1),
      unitPrice: Number(it.unitPrice) || 0,
    }
  })
}
