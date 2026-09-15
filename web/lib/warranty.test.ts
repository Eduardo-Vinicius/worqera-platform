import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  isWarrantyActive,
  isWarrantyExpiringSoon,
  normalizeWarranty,
  warrantyEndDate,
} from "./warranty.ts"

describe("warrantyEndDate", () => {
  it("adds three months by default", () => {
    assert.equal(warrantyEndDate(new Date("2026-01-15T12:00:00Z")), "2026-04-15")
  })

  it("supports custom months", () => {
    assert.equal(warrantyEndDate(new Date("2026-01-15T12:00:00Z"), 1), "2026-02-15")
  })
})

describe("normalizeWarranty", () => {
  it("returns inactive shape when falsy", () => {
    assert.deepEqual(normalizeWarranty(null), {
      ativa: false,
      preco: 0,
      duracao: "",
      data: "",
    })
  })

  it("maps English keys and fills end date when active without date", () => {
    const w = normalizeWarranty(
      { active: true, price: 40, duration: "3 meses" },
      new Date("2026-01-15T12:00:00Z")
    )
    assert.equal(w.ativa, true)
    assert.equal(w.preco, 40)
    assert.equal(w.data, "2026-04-15")
  })
})

describe("filters", () => {
  it("detects active warranty", () => {
    assert.equal(isWarrantyActive({ ativa: true }), true)
    assert.equal(isWarrantyActive({ active: true }), true)
    assert.equal(isWarrantyActive({ ativa: false }), false)
  })

  it("detects expiring within 30 days", () => {
    const now = new Date("2026-03-01T12:00:00Z")
    assert.equal(
      isWarrantyExpiringSoon({ ativa: true, data: "2026-03-20" }, 30, now),
      true
    )
    assert.equal(
      isWarrantyExpiringSoon({ ativa: true, data: "2026-06-01" }, 30, now),
      false
    )
    assert.equal(
      isWarrantyExpiringSoon({ ativa: true, data: "2026-02-01" }, 30, now),
      false
    )
  })
})
