const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001").replace(/\/+$/, "")
const API_V1 = `${API_BASE}/api/v1`

let refreshInflight: Promise<boolean> | null = null

function persistAccessToken(token: string) {
  if (typeof window === "undefined") return
  localStorage.setItem("token", token)
  const secure = window.location.protocol === "https:" ? "; secure" : ""
  document.cookie = `token=${token}; path=/; max-age=604800; samesite=lax${secure}`
}

/** Exchange refreshToken (cookie HttpOnly and/or localStorage) for a new access token. */
export async function tryRefreshSession(): Promise<boolean> {
  if (typeof window === "undefined") return false
  if (refreshInflight) return refreshInflight

  refreshInflight = (async () => {
    const refreshToken = localStorage.getItem("refreshToken")
    try {
      const res = await fetch(`${API_V1}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(refreshToken ? { refreshToken } : {}),
      })
      if (!res.ok) return false
      const data = await res.json().catch(() => ({}))
      const token = data.token || data.accessToken
      if (!token) return false
      persistAccessToken(String(token))
      if (data.refreshToken) localStorage.setItem("refreshToken", String(data.refreshToken))
      return true
    } catch {
      return false
    } finally {
      refreshInflight = null
    }
  })()

  return refreshInflight
}

/** fetch() that retries once after a successful refresh on HTTP 401. */
export async function fetchWithAuthRetry(
  input: RequestInfo | URL,
  init: RequestInit = {},
  rebuildHeaders?: () => HeadersInit
): Promise<Response> {
  const first = await fetch(input, { ...init, credentials: init.credentials || "include" })
  if (first.status !== 401) return first
  const ok = await tryRefreshSession()
  if (!ok) return first
  const headers = new Headers(rebuildHeaders ? rebuildHeaders() : init.headers || {})
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  if (token) headers.set("Authorization", `Bearer ${token}`)
  return fetch(input, { ...init, headers, credentials: init.credentials || "include" })
}
