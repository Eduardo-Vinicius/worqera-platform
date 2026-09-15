import { describe, expect, it } from "vitest"
import {
  buildWaMeUrl,
  fillWaTemplate,
  toWhatsAppE164Digits,
} from "./whatsapp"

describe("whatsapp helpers", () => {
  it("prefixes BR country code", () => {
    expect(toWhatsAppE164Digits("(11) 98888-7777")).toBe("11988887777".replace(/^/, "55"))
  })

  it("fills templates", () => {
    expect(
      fillWaTemplate("Pedido {{code}} de {{client}}", { code: "0001", client: "Ana" })
    ).toBe("Pedido 0001 de Ana")
  })

  it("builds wa.me url", () => {
    const url = buildWaMeUrl("11999990000", "Oi")
    expect(url).toContain("https://wa.me/5511999990000")
    expect(url).toContain("text=")
  })
})
