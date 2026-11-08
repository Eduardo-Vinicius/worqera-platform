import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { loginErrorMessage, loginUrlFor, safeNextPath } from "./authNext.ts"

describe("safeNextPath", () => {
  it("keeps an in-app path with its query", () => {
    assert.equal(safeNextPath("/kanban?focus=late"), "/kanban?focus=late")
    assert.equal(safeNextPath("/excluir-conta"), "/excluir-conta")
  })

  it("refuses anything that could leave the site or loop", () => {
    assert.equal(safeNextPath("https://evil.com"), null)
    assert.equal(safeNextPath("//evil.com/x"), null)
    assert.equal(safeNextPath("/\\evil.com"), null)
    assert.equal(safeNextPath("/login?next=/x"), null)
    assert.equal(safeNextPath("/signup"), null)
    assert.equal(safeNextPath(""), null)
    assert.equal(safeNextPath(null), null)
    assert.equal(safeNextPath("kanban"), null)
  })
})

describe("loginUrlFor", () => {
  it("carries the page the user wanted", () => {
    assert.equal(loginUrlFor("/kanban", "?focus=late"), "/login?next=%2Fkanban%3Ffocus%3Dlate")
  })

  it("plain login for the home and auth pages", () => {
    assert.equal(loginUrlFor("/", ""), "/login")
    assert.equal(loginUrlFor("/dashboard", ""), "/login")
    assert.equal(loginUrlFor("/login", "?next=/x"), "/login")
  })
})

describe("loginErrorMessage", () => {
  it("wrong e-mail or password in Portuguese", () => {
    assert.equal(loginErrorMessage({ status: 401, code: "UNAUTHORIZED", message: "Invalid credentials" }), "E-mail ou senha incorretos.")
  })

  it("too many attempts says when to try again", () => {
    assert.equal(
      loginErrorMessage({ status: 429, code: "RATE_LIMITED", message: "Rate limit exceeded. Retry in 840s" }),
      "Muitas tentativas. Tente de novo em 14 minutos."
    )
    assert.equal(
      loginErrorMessage({ status: 429, code: "RATE_LIMITED", message: "Retry in 30s" }),
      "Muitas tentativas. Tente de novo em 1 minuto."
    )
  })

  it("no connection never shows developer instructions", () => {
    const msg = loginErrorMessage(new TypeError("Failed to fetch"))
    assert.equal(msg, "Sem conexão com o servidor. Confira a internet e tente de novo.")
    assert.equal(
      loginErrorMessage({ status: 0, code: "NETWORK", message: "qualquer" }),
      "Sem conexão com o servidor. Confira a internet e tente de novo."
    )
  })

  it("keeps a message the API already wrote in Portuguese", () => {
    assert.equal(loginErrorMessage({ status: 403, message: "Conta suspensa. Fale com o suporte." }), "Conta suspensa. Fale com o suporte.")
  })

  it("server error is generic", () => {
    assert.equal(loginErrorMessage({ status: 500, message: "Internal" }), "Não foi possível entrar agora. Tente de novo em instantes.")
  })
})
