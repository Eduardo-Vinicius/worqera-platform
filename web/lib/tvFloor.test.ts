import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  HIGH_PRIORITY_THRESHOLD,
  OVERDUE_HOURS_IN_SECTOR,
  detectIncreasedSectors,
  filterHotSectors,
  hoursInSector,
  isHighPriority,
  isHotOrder,
  isOverdue,
  isHotQuery,
  normalizeStats,
} from "./tvFloor.ts"

describe("normalizeStats", () => {
  it("maps v1 array sectors and nested orders", () => {
    const sectors = normalizeStats({
      data: [
        {
          id: "s1",
          name: "Pintura",
          color: "#7C6CF0",
          count: 1,
          orders: [
            {
              id: "o1",
              code: "WQ-1",
              clientName: "Ana",
              dueAt: "2020-01-01",
              priority: 1,
              sectorHistory: [{ enteredAt: "2020-01-01T00:00:00.000Z", leftAt: null }],
            },
          ],
        },
      ],
    })
    assert.equal(sectors.length, 1)
    assert.equal(sectors[0].id, "s1")
    assert.equal(sectors[0].name, "Pintura")
    assert.equal(sectors[0].count, 1)
    assert.equal(sectors[0].orders[0].code, "WQ-1")
  })

  it("maps legacy PT record keyed by sector id", () => {
    const sectors = normalizeStats({
      s2: {
        nome: "Costura",
        cor: "#0D9488",
        quantidade: 2,
        pedidos: [{ id: "p1", codigo: "C-9", cliente: "Bia", tempoNoSetor: 30 }],
      },
    })
    assert.equal(sectors[0].name, "Costura")
    assert.equal(sectors[0].count, 2)
    assert.equal(sectors[0].orders[0].hoursInSector, 30)
  })
})

describe("overdue and hot", () => {
  const now = Date.parse("2026-09-14T12:00:00.000Z")

  it("marks dueAt in the past as overdue", () => {
    assert.equal(isOverdue({ dueAt: "2026-09-13T12:00:00.000Z" }, now), true)
    assert.equal(isOverdue({ dueAt: "2026-09-15T12:00:00.000Z" }, now), false)
  })

  it("marks 24h+ in sector as overdue", () => {
    assert.equal(hoursInSector({ tempoNoSetor: 24 }), 24)
    assert.equal(isOverdue({ hoursInSector: OVERDUE_HOURS_IN_SECTOR }, now), true)
    assert.equal(isOverdue({ hoursInSector: 3 }, now), false)
  })

  it("treats Alta (1) as high priority", () => {
    assert.equal(isHighPriority(HIGH_PRIORITY_THRESHOLD), true)
    assert.equal(isHighPriority(2), false)
    assert.equal(isHighPriority(null), false)
  })

  it("hot keeps overdue or Alta; missing priority is overdue only", () => {
    assert.equal(isHotOrder({ dueAt: "2026-09-13", priority: 2 }, now), true)
    assert.equal(isHotOrder({ dueAt: "2026-09-15", priority: 1 }, now), true)
    assert.equal(isHotOrder({ dueAt: "2026-09-15", priority: 2 }, now), false)
    assert.equal(isHotOrder({ dueAt: "2026-09-15" }, now), false)
    assert.equal(isHotOrder({ dueAt: "2026-09-13" }, now), true)
  })

  it("hot mode drops non-hot rows and empty sectors", () => {
    const filtered = filterHotSectors(
      [
        {
          id: "s1",
          name: "Pintura",
          color: "#fff",
          count: 2,
          orders: [
            { id: "a", code: "A", hoursInSector: 1, dueAt: "2026-09-15", priority: 2 },
            { id: "b", code: "B", hoursInSector: 1, dueAt: "2026-09-13", priority: 2 },
          ],
        },
        {
          id: "s2",
          name: "Lavagem",
          color: "#fff",
          count: 1,
          orders: [{ id: "c", code: "C", hoursInSector: 1, dueAt: "2026-09-15", priority: 2 }],
        },
      ],
      true,
      now
    )
    assert.equal(filtered.length, 1)
    assert.equal(filtered[0].id, "s1")
    assert.equal(filtered[0].orders.map((o) => o.code).join(), "B")
    assert.equal(filtered[0].count, 1)
  })
})

describe("flash and query", () => {
  it("detects sectors whose total increased", () => {
    assert.deepEqual(detectIncreasedSectors({ a: 1, b: 2 }, { a: 2, b: 2, c: 1 }), ["a", "c"])
  })

  it("reads ?hot=1 from search params", () => {
    assert.equal(isHotQuery({ get: (k: string) => (k === "hot" ? "1" : null) }), true)
    assert.equal(isHotQuery({ get: () => "0" }), false)
  })
})
