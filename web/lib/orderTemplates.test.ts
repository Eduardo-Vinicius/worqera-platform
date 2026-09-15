import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  loadOrderTemplates,
  removeOrderTemplate,
  upsertOrderTemplate,
} from "./orderTemplates.ts"

describe("orderTemplates", () => {
  it("parses stored templates", () => {
    const list = loadOrderTemplates(
      JSON.stringify([
        {
          id: "1",
          name: "Limpeza",
          serviceIds: ["a"],
          flowOptionIds: ["lavagem"],
          accessories: [],
        },
      ])
    )
    assert.equal(list.length, 1)
    assert.equal(list[0].name, "Limpeza")
    assert.deepEqual(list[0].serviceIds, ["a"])
  })

  it("upserts and removes", () => {
    let list = upsertOrderTemplate([], {
      name: "Pintura",
      serviceIds: ["p"],
      flowOptionIds: ["pintura"],
      accessories: ["Cadarços originais"],
    })
    assert.equal(list.length, 1)
    list = upsertOrderTemplate(list, { ...list[0], name: "Pintura full" })
    assert.equal(list[0].name, "Pintura full")
    list = removeOrderTemplate(list, list[0].id)
    assert.equal(list.length, 0)
  })
})
