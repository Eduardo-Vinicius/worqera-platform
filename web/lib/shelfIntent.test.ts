import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { shelfModeFromHash, shelfModeFromHref } from "./shelfIntent.ts"

describe("shelf intent", () => {
  it("reads the shelf mode from the hash", () => {
    assert.equal(shelfModeFromHash("#prateleira"), "all")
    assert.equal(shelfModeFromHash("#prateleira-parados"), "stale")
    assert.equal(shelfModeFromHash("#prateleira-conferir"), "check")
    assert.equal(shelfModeFromHash("#outra"), null)
    assert.equal(shelfModeFromHash(""), null)
  })

  it("recognizes brief links that point to the shelf", () => {
    assert.equal(shelfModeFromHref("/dashboard#prateleira-conferir"), "check")
    assert.equal(shelfModeFromHref("/dashboard#prateleira"), "all")
    assert.equal(shelfModeFromHref("/kanban?focus=ready"), null)
  })
})
