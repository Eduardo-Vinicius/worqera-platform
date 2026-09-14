const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/+$/, "")
export const API_V1 = `${API_BASE}/api/v1`

function getToken() {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

function getShopId() {
  if (typeof window === "undefined") return null
  return localStorage.getItem("shopId")
}

export class ApiV1Error extends Error {
  status: number
  code?: string
  constructor(message: string, status: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function v1Fetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {})
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json")
  }
  const token = getToken()
  if (token) headers.set("Authorization", `Bearer ${token}`)
  const shopId = getShopId()
  if (shopId) headers.set("X-Worqera-Shop", shopId)

  const res = await fetch(`${API_V1}${path}`, { ...init, headers })
  const text = await res.text()
  let data: any = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { detail: text }
  }

  if (!res.ok) {
    const msg = data?.detail || data?.title || data?.error || res.statusText
    const code = data?.code
    if (code === "SUBSCRIPTION_INACTIVE" && typeof window !== "undefined") {
      window.location.href = "/billing"
    }
    throw new ApiV1Error(msg, res.status, code)
  }
  return data as T
}

function persistSession(data: {
  token?: string
  refreshToken?: string
  shop?: { id?: string }
  membership?: { shopId?: string }
}) {
  if (data.token) {
    localStorage.setItem("token", data.token)
    const secure = window.location.protocol === "https:" ? "; secure" : ""
    document.cookie = `token=${data.token}; path=/; max-age=604800; samesite=lax${secure}`
  }
  if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken)
  const shopId = data.shop?.id || data.membership?.shopId
  if (shopId) localStorage.setItem("shopId", shopId)
}

export async function signupV1(input: {
  email: string
  password: string
  name: string
  shopName: string
}) {
  const data = await v1Fetch<any>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(input),
  })
  persistSession(data)
  return data
}

export async function loginV1(email: string, password: string) {
  const data = await v1Fetch<any>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
  persistSession(data)
  return data
}

export async function meV1() {
  return v1Fetch<any>("/auth/me")
}

export async function listSectorsV1() {
  return v1Fetch<{ sectors: any[] }>("/sectors")
}

export async function createSectorV1(body: {
  name: string
  color?: string
  order?: number
  isTerminal?: boolean
}) {
  return v1Fetch("/sectors", { method: "POST", body: JSON.stringify(body) })
}

export async function updateSectorV1(id: string, body: Record<string, unknown>) {
  return v1Fetch(`/sectors/${id}`, { method: "PATCH", body: JSON.stringify(body) })
}

export async function reorderSectorsV1(items: { id: string; order: number }[]) {
  return v1Fetch("/sectors/reorder", { method: "POST", body: JSON.stringify({ items }) })
}

export async function getKanbanV1() {
  return v1Fetch<{ columns: Array<{ sector: any; orders: any[] }> }>("/kanban")
}

export async function moveKanbanOrderV1(
  orderId: string,
  body: { toSectorId: string; note?: string; employeeName?: string }
) {
  return v1Fetch(`/kanban/orders/${orderId}/move`, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export async function getSubscriptionV1() {
  return v1Fetch<{ subscription: any }>("/billing/subscription")
}

export async function getBillingProductsV1() {
  return v1Fetch<{ products: any[] }>("/billing/products")
}

export async function createCheckoutSessionV1() {
  return v1Fetch<{ url: string; sessionId?: string }>("/billing/checkout-sessions", {
    method: "POST",
    body: JSON.stringify({}),
  })
}

export async function completeCheckoutDevV1() {
  return v1Fetch("/billing/dev/complete-checkout", {
    method: "POST",
    body: JSON.stringify({}),
  })
}

export async function getPublicOrderV1(code: string) {
  return v1Fetch(`/public/orders/${encodeURIComponent(code)}`)
}

export function clearSession() {
  localStorage.removeItem("token")
  localStorage.removeItem("refreshToken")
  localStorage.removeItem("shopId")
  document.cookie = "token=; path=/; max-age=0; samesite=lax"
}
