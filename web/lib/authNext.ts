/** Pages where coming back after login makes no sense (or would loop). */
const NO_RETURN = ["/", "/dashboard", "/login", "/signup", "/forgot-password", "/reset-password"]

/** Only same-site paths: "/x?y". Never another host, never back to the auth pages. */
export function safeNextPath(raw: string | null | undefined): string | null {
  const value = String(raw || "").trim()
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null
  const path = value.split(/[?#]/)[0]
  if (NO_RETURN.includes(path) || path.startsWith("/verify-email")) return null
  return value
}

/** Login URL that brings the user back to the page they opened (deep links, e-mails, WhatsApp). */
export function loginUrlFor(pathname: string, search = ""): string {
  const next = safeNextPath(`${pathname}${search || ""}`)
  return next ? `/login?next=${encodeURIComponent(next)}` : "/login"
}

type LoginError = { status?: number; code?: string; message?: string } | Error | null | undefined

/** What the person sees when login fails: Portuguese, no developer jargon. */
export function loginErrorMessage(err: LoginError): string {
  const e = (err || {}) as { status?: number; code?: string; message?: string }
  const message = String(e.message || "")
  if (e.code === "NETWORK" || /failed to fetch|networkerror|load failed|network request failed/i.test(message)) {
    return "Sem conexão com o servidor. Confira a internet e tente de novo."
  }
  if (e.status === 401 || e.code === "UNAUTHORIZED") return "E-mail ou senha incorretos."
  if (e.status === 429 || e.code === "RATE_LIMITED") {
    const seconds = Number(message.match(/(\d+)\s*s\b/)?.[1] || 0)
    const minutes = Math.max(1, Math.ceil(seconds / 60))
    return `Muitas tentativas. Tente de novo em ${minutes} ${minutes === 1 ? "minuto" : "minutos"}.`
  }
  if (!e.status || e.status >= 500) return "Não foi possível entrar agora. Tente de novo em instantes."
  return message || "Não foi possível entrar. Confira os dados e tente de novo."
}
