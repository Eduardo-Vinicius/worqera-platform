import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  emptyOrderItemDraft,
  filterFilledItems,
  mapItemsToCreatePayload,
  migrateDraftToItems,
  servicesSum,
  suggestedTotal,
  validateOrderItems,
  type PhotoItem,
} from "./orderItems.ts"

function photoStub(): PhotoItem {
  return { file: {} as File, preview: "blob:test" }
}

function draft(partial: {
  sneaker?: string
  selectedServices?: Array<{ id: string; name: string; price: number; description: string }>
  notes?: string
  photos?: PhotoItem[]
}) {
  return {
    ...emptyOrderItemDraft(),
    ...partial,
  }
}

const limpeza = { id: "limpeza", name: "Limpeza", price: 30, description: "" }

describe("emptyOrderItemDraft", () => {
  it("starts with empty sneaker, services, photos, notes and a stable id", () => {
    const item = emptyOrderItemDraft()
    assert.equal(item.sneaker, "")
    assert.deepEqual(item.selectedServices, [])
    assert.deepEqual(item.photos, [])
    assert.equal(item.notes, "")
    assert.equal(typeof item.id, "string")
    assert.ok(item.id.length > 0)
  })

  it("assigns a unique id per draft", () => {
    const a = emptyOrderItemDraft()
    const b = emptyOrderItemDraft()
    assert.notEqual(a.id, b.id)
  })
})

describe("filterFilledItems", () => {
  it("keeps complete items and drops blank extras", () => {
    const items = [
      draft({ sneaker: "Nike Dunk", selectedServices: [limpeza] }),
      draft({}),
      draft({
        selectedServices: [{ id: "pintura", name: "Pintura", price: 60, description: "" }],
      }),
    ]
    const filled = filterFilledItems(items)
    assert.equal(filled.length, 1)
    assert.equal(filled[0].sneaker, "Nike Dunk")
    assert.equal(filled[0].selectedServices[0].id, "limpeza")
  })

  it("does not treat photo-only or notes-only rows as filled for create", () => {
    const items = [
      draft({ photos: [photoStub()] }),
      draft({ notes: "raspar sola" }),
      draft({}),
    ]
    assert.equal(filterFilledItems(items).length, 0)
  })
})

describe("validateOrderItems", () => {
  it("requires at least one item with modelo and services", () => {
    const errors = validateOrderItems([draft({}), draft({})])
    assert.equal(errors.items, "Informe ao menos um item com modelo e serviços")
  })

  it("rejects a single item with only modelo", () => {
    const errors = validateOrderItems([draft({ sneaker: "Air Max" })])
    assert.equal(errors.items, "Cada item preenchido deve ter modelo e ao menos um serviço")
  })

  it("rejects a filled item missing modelo", () => {
    const errors = validateOrderItems([draft({ selectedServices: [limpeza] })])
    assert.equal(errors.items, "Cada item preenchido deve ter modelo e ao menos um serviço")
  })

  it("rejects photo-only rows instead of silently omitting them", () => {
    const errors = validateOrderItems([
      draft({ photos: [photoStub()] }),
      draft({ sneaker: "Dunk", selectedServices: [limpeza] }),
    ])
    assert.equal(errors.items, "Cada item preenchido deve ter modelo e ao menos um serviço")
  })

  it("rejects notes-only rows instead of silently omitting them", () => {
    const errors = validateOrderItems([draft({ notes: " raspar sola " })])
    assert.equal(errors.items, "Cada item preenchido deve ter modelo e ao menos um serviço")
  })

  it("accepts a complete item and ignores extra blank rows", () => {
    const errors = validateOrderItems([
      draft({ sneaker: "Dunk", selectedServices: [limpeza] }),
      draft({}),
    ])
    assert.equal(errors.items, undefined)
  })

  it("flags invalid service prices on filled items", () => {
    const errors = validateOrderItems([
      draft({
        sneaker: "Dunk",
        selectedServices: [{ id: "x", name: "X", price: 0, description: "" }],
      }),
    ])
    assert.equal(errors.services, "Todos os serviços devem ter preços válidos")
  })
})

describe("mapItemsToCreatePayload", () => {
  it("maps sneaker/services/notes and skips empty notes", () => {
    const payload = mapItemsToCreatePayload([
      draft({
        sneaker: "Dunk Low",
        selectedServices: [{ id: "s1", name: "Limpeza", price: 40, description: "suede" }],
        notes: " raspar sola ",
      }),
      draft({ sneaker: "Jordan 1", notes: "   " }),
    ])
    assert.deepEqual(payload, [
      {
        shoeModel: "Dunk Low",
        services: [{ id: "s1", name: "Limpeza", price: 40 }],
        notes: "raspar sola",
      },
      {
        shoeModel: "Jordan 1",
        services: [],
        notes: undefined,
      },
    ])
  })
})

describe("pricing", () => {
  it("sums services across items plus order-level warranty", () => {
    const items = [
      draft({
        selectedServices: [{ id: "a", name: "A", price: 30, description: "" }],
      }),
      draft({
        selectedServices: [
          { id: "b", name: "B", price: 50, description: "" },
          { id: "c", name: "C", price: 20, description: "" },
        ],
      }),
    ]
    assert.equal(servicesSum(items), 100)
    assert.equal(suggestedTotal(items, false, 15), 100)
    assert.equal(suggestedTotal(items, true, 15), 115)
  })
})

describe("migrateDraftToItems", () => {
  it("reads items[] from v2 drafts and assigns ids", () => {
    const items = migrateDraftToItems({
      items: [{ sneaker: "Pair A", selectedServices: [], notes: "n1" }],
    })
    assert.equal(items.length, 1)
    assert.equal(items[0].sneaker, "Pair A")
    assert.equal(items[0].notes, "n1")
    assert.deepEqual(items[0].photos, [])
    assert.equal(typeof items[0].id, "string")
    assert.ok(items[0].id.length > 0)
  })

  it("preserves draft item ids when present", () => {
    const items = migrateDraftToItems({
      items: [{ id: "kept-id", sneaker: "Pair A", selectedServices: [], notes: "" }],
    })
    assert.equal(items[0].id, "kept-id")
  })

  it("lifts legacy sneaker + selectedServices into items[0]", () => {
    const items = migrateDraftToItems({
      formData: { sneaker: "Legacy Air" },
      selectedServices: [{ id: "limpeza", name: "Limpeza", price: 30, description: "" }],
    })
    assert.equal(items.length, 1)
    assert.equal(items[0].sneaker, "Legacy Air")
    assert.equal(items[0].selectedServices[0].id, "limpeza")
    assert.ok(items[0].id.length > 0)
  })
})
