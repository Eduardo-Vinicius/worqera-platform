import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { shelfKanbanHref, shelfModeFromHash } from "./shelfIntent.ts"

describe("shelf intent", () => {
  it("reads the shelf mode from the hash", () => {
    assert.equal(shelfModeFromHash("#prateleira"), "all")
    assert.equal(shelfModeFromHash("#prateleira-parados"), "stale")
    assert.equal(shelfModeFromHash("#prateleira-conferir"), "check")
    assert.equal(shelfModeFromHash("#outra"), null)
    assert.equal(shelfModeFromHash(""), null)
  })

  it("each shelf filter opens the same recorte in the kanban", () => {
    assert.equal(shelfKanbanHref("all"), "/kanban?focus=ready")
    assert.equal(shelfKanbanHref("stale"), "/kanban?focus=ready-stale")
    assert.equal(shelfKanbanHref("check"), "/kanban?focus=ready-check")
  })
})
