import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { kanbanFocusHref, parseFocus, readQueueFocus, replaceFocusSearch } from "./queueFocus.ts"

describe("queueFocus URL", () => {
  it("parses the four recortes and ignores junk", () => {
    assert.equal(parseFocus("late"), "late")
    assert.equal(parseFocus("due-tomorrow"), "due-tomorrow")
    assert.equal(parseFocus("nope"), null)
  })

  it("reads focus from the query and maps ?late=1 to late", () => {
    assert.equal(readQueueFocus("?focus=due-today"), "due-today")
    assert.equal(readQueueFocus("?late=1"), "late")
    assert.equal(readQueueFocus("?focus=ready&late=1"), "ready")
    assert.equal(readQueueFocus(""), null)
  })

  it("builds and replaces the kanban query without leftover late=1", () => {
    assert.equal(kanbanFocusHref("due-tomorrow"), "/kanban?focus=due-tomorrow")
    assert.equal(kanbanFocusHref(null), "/kanban")
    assert.equal(replaceFocusSearch("?late=1&q=joao", "ready"), "?q=joao&focus=ready")
    assert.equal(replaceFocusSearch("?focus=late", null), "")
  })
})
