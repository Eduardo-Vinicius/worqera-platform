import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { shouldIgnoreKanbanShortcut } from "./kanbanShortcuts.ts"

describe("shouldIgnoreKanbanShortcut", () => {
  it("ignores typing targets", () => {
    assert.equal(shouldIgnoreKanbanShortcut({ tagName: "INPUT" }), true)
    assert.equal(shouldIgnoreKanbanShortcut({ tagName: "TEXTAREA" }), true)
    assert.equal(shouldIgnoreKanbanShortcut({ tagName: "SELECT" }), true)
    assert.equal(
      shouldIgnoreKanbanShortcut({ tagName: "DIV", isContentEditable: true }),
      true
    )
  })

  it("allows board shortcuts on body", () => {
    assert.equal(shouldIgnoreKanbanShortcut({ tagName: "BODY" }), false)
    assert.equal(shouldIgnoreKanbanShortcut({ tagName: "DIV" }), false)
  })
})
