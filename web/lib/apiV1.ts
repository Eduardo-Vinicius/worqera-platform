const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001").replace(/\/+$/, "")
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

async function v1Fetch<T = unknown>(path: string, init: RequestInit = {}, retried = false): Promise<T> {
  const headers = new Headers(init.headers || {})
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json")
  }
  const token = getToken()
  if (token) headers.set("Authorization", `Bearer ${token}`)
  const shopId = getShopId()
  if (shopId) headers.set("X-Worqera-Shop", shopId)

  const res = await fetch(`${API_V1}${path}`, { ...init, headers, credentials: "include" })
  const text = await res.text()
  let data: any = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { detail: text }
  }

  if (!res.ok) {
    if (res.status === 401 && !retried && path !== "/auth/refresh" && path !== "/auth/login") {
      const { tryRefreshSession } = await import("./authRefresh")
      const ok = await tryRefreshSession()
      if (ok) return v1Fetch<T>(path, init, true)
    }
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
  accessToken?: string
  refreshToken?: string
  shop?: { id?: string; name?: string; slug?: string }
  user?: { name?: string; email?: string; emailVerified?: boolean }
  membership?: { shopId?: string; role?: string }
  memberships?: Array<{ shopId?: string; role?: string }>
  role?: string
  platformAdmin?: boolean
  emailVerified?: boolean
  emailVerificationRequired?: boolean
}) {
  const token = data.token || data.accessToken
  if (token) {
    localStorage.setItem("token", token)
    const secure = window.location.protocol === "https:" ? "; secure" : ""
    document.cookie = `token=${token}; path=/; max-age=604800; samesite=lax${secure}`
  }
  if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken)
  const shopId =
    data.shop?.id ||
    data.membership?.shopId ||
    data.memberships?.[0]?.shopId
  if (shopId) localStorage.setItem("shopId", String(shopId))
  if (data.shop?.name) localStorage.setItem("shopName", data.shop.name)
  if (data.shop?.slug) localStorage.setItem("shopSlug", String(data.shop.slug))
  if (data.user?.name) localStorage.setItem("userName", data.user.name)
  if (data.user?.email) localStorage.setItem("email", data.user.email)
  const role = data.role || data.membership?.role || data.memberships?.[0]?.role
  if (role) localStorage.setItem("role", String(role))
  if (data.platformAdmin === true) localStorage.setItem("platformAdmin", "1")
  else if (data.platformAdmin === false) localStorage.removeItem("platformAdmin")
  if (data.platformAdmin === true && !shopId) {
    localStorage.setItem("shopName", "Worqera Platform")
    localStorage.setItem("shopDisplayName", "Worqera Platform")
    localStorage.setItem("role", "platform")
  }
  const verified =
    data.emailVerified === true ||
    data.user?.emailVerified === true ||
    data.emailVerificationRequired === false
  const needsVerify =
    data.emailVerificationRequired === true ||
    data.emailVerified === false ||
    data.user?.emailVerified === false
  if (needsVerify && !verified) {
    localStorage.setItem("wq-email-unverified", "1")
  } else if (verified || data.emailVerified === true) {
    localStorage.removeItem("wq-email-unverified")
  }
}

export async function signupV1(input: {
  email: string
  password: string
  name: string
  shopName: string
  shopSlug?: string
  partnerCode?: string
  ref?: string
}) {
  const data = await v1Fetch<any>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(input),
  })
  if (data?.accessToken || data?.token) {
    persistSession(data)
  }
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

export async function resendOrderEmailV1(orderId: string, kind: "created" | "moved" | "ready" = "created") {
  return v1Fetch<{ ok: boolean; emailNotify?: any }>(
    `/orders/${encodeURIComponent(orderId)}/resend-email`,
    {
      method: "POST",
      body: JSON.stringify({ kind }),
    }
  )
}

export async function verifyEmailV1(token: string) {
  return v1Fetch<{ ok: boolean; email?: string }>("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  })
}

export async function resendVerificationV1(email: string) {
  return v1Fetch<{ ok: boolean; alreadyVerified?: boolean }>("/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  })
}

export async function meV1() {
  const data = await v1Fetch<any>("/auth/me")
  if (data?.platformAdmin === true) localStorage.setItem("platformAdmin", "1")
  else localStorage.removeItem("platformAdmin")
  if (data?.emailVerificationRequired === true || data?.emailVerified === false) {
    localStorage.setItem("wq-email-unverified", "1")
  } else if (data?.emailVerified === true || data?.user?.emailVerified === true) {
    localStorage.removeItem("wq-email-unverified")
  }
  const shop = data?.memberships?.[0]?.shop
  if (shop?.id) localStorage.setItem("shopId", String(shop.id))
  if (shop?.name) localStorage.setItem("shopName", String(shop.name))
  if (shop?.branding?.displayName) {
    localStorage.setItem("shopDisplayName", String(shop.branding.displayName))
  } else if (shop?.name) {
    localStorage.setItem("shopDisplayName", String(shop.name))
  }
  if (shop?.slug) localStorage.setItem("shopSlug", String(shop.slug))
  if (shop?.branding) {
    const { syncBrandToStorage } = await import("./shopBrand")
    syncBrandToStorage({
      name: shop.name,
      slug: shop.slug,
      displayName: shop.branding.displayName || shop.name,
      logoUrl: shop.branding.logoUrl || "",
      primaryColor: shop.branding.primaryColor || "",
      accentColor: shop.branding.accentColor || "",
    })
  }
  if (data?.platformAdmin === true && !shop?.id) {
    localStorage.setItem("shopName", "Worqera Platform")
    localStorage.setItem("shopDisplayName", "Worqera Platform")
    if (!localStorage.getItem("role")) localStorage.setItem("role", "platform")
  }
  return data
}

export async function forgotPasswordV1(email: string) {
  return v1Fetch<{ ok: boolean; resetToken?: string }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  })
}

export async function resetPasswordV1(token: string, password: string) {
  return v1Fetch<{ ok: boolean }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  })
}

export async function listShopMembersV1() {
  return v1Fetch<{ members?: any[] } | any[]>("/shops/current/members")
}

export async function addShopMemberV1(body: {
  email: string
  password: string
  name?: string
  role: string
  sectorIds?: string[]
}) {
  return v1Fetch("/shops/current/members", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export async function patchShopMemberV1(
  id: string,
  body: Partial<{ role: string; sectorIds: string[]; active: boolean }>
) {
  return v1Fetch(`/shops/current/members/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}

export async function resetShopMemberPasswordV1(id: string, password: string) {
  return v1Fetch(`/shops/current/members/${encodeURIComponent(id)}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ password }),
  })
}

export async function createShopInviteV1(body: {
  email: string
  role: string
  sectorIds?: string[]
  appBaseUrl?: string
}) {
  return v1Fetch<{
    id: string
    email: string
    role: string
    expiresAt?: string
    url?: string
    devToken?: string
  }>("/shops/current/invites", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

async function publicV1Fetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {})
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json")
  }
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
    throw new ApiV1Error(msg, res.status, data?.code)
  }
  return data as T
}

export async function getInviteV1(token: string) {
  return publicV1Fetch<{
    email: string
    role: string
    shop?: { id?: string; name?: string; slug?: string } | null
  }>(`/invites/${encodeURIComponent(token)}`)
}

export async function acceptInviteV1(
  token: string,
  body: { name: string; password: string }
) {
  return publicV1Fetch<{
    ok: boolean
    email?: string
    shop?: { id?: string; name?: string; slug?: string } | null
  }>(`/invites/${encodeURIComponent(token)}/accept`, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export async function listDelayAlertsV1() {
  return v1Fetch<{
    total: number
    items: Array<{
      id: string
      code?: string
      clientName?: string
      status?: string
      dueAt?: string
      daysLate?: number
      currentSectorId?: string
    }>
  }>("/alerts/delays")
}

export async function getAlertsInboxV1() {
  return v1Fetch<{
    readyCount: number
    reopenedCount: number
    feedbackCount: number
    feedback: Array<{
      id: string
      code: string
      clientName: string
      status?: string
      score?: number
      comment?: string
      tags?: string[]
      createdAt?: string | null
    }>
  }>("/alerts/inbox")
}

export async function listFeedbackV1(opts?: {
  period?: "30d" | "90d" | "all"
  page?: number
  limit?: number
  /** Comma-separated scores, e.g. "1,2,3" */
  score?: string
}) {
  const q = new URLSearchParams()
  if (opts?.period) q.set("period", opts.period)
  if (opts?.page) q.set("page", String(opts.page))
  if (opts?.limit) q.set("limit", String(opts.limit))
  if (opts?.score) q.set("score", opts.score)
  const qs = q.toString()
  return v1Fetch<{
    period: string
    scores?: number[] | null
    page: number
    limit: number
    total: number
    summary: {
      avg: number
      count: number
      distribution: Record<"1" | "2" | "3" | "4" | "5", number> | Record<number, number>
      topTags: Array<{ tag: string; count: number }>
    }
    items: Array<{
      id: string
      code: string
      clientName: string
      status?: string
      score?: number
      comment?: string
      tags?: string[]
      createdAt?: string | null
    }>
  }>(`/alerts/feedback${qs ? `?${qs}` : ""}`)
}

export function feedbackExportCsvUrl(opts?: {
  period?: "30d" | "90d" | "all"
  score?: string
}) {
  const q = new URLSearchParams()
  if (opts?.period) q.set("period", opts.period)
  if (opts?.score) q.set("score", opts.score)
  const qs = q.toString()
  return `/alerts/feedback/export.csv${qs ? `?${qs}` : ""}`
}

export async function sendDelayDigestV1() {
  return v1Fetch<{ ok: boolean; sent: number; total: number }>("/alerts/delays/digest", {
    method: "POST",
    body: JSON.stringify({}),
  })
}

export async function sendWeeklyDigestV1() {
  return v1Fetch<{
    ok: boolean
    sent: number
    deliveredCount?: number
    openCount?: number
    delaysTotal?: number
    revenue?: number
  }>("/alerts/weekly-digest", {
    method: "POST",
    body: JSON.stringify({}),
  })
}

export async function listPlatformShopsV1(params: { q?: string; status?: string } = {}) {
  const qs = new URLSearchParams()
  if (params.q) qs.set("q", params.q)
  if (params.status) qs.set("status", params.status)
  const suffix = qs.toString() ? `?${qs}` : ""
  return v1Fetch<{ shops: any[] }>(`/platform/shops${suffix}`)
}

export async function patchPlatformShopV1(
  id: string,
  body: Partial<{
    status: string
    extendTrialDays: number
    subscriptionStatus: string
    planCode: string
    adminNote: string
  }>
) {
  return v1Fetch(`/platform/shops/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}

export async function getShopCurrentV1() {
  return v1Fetch<any>("/shops/current")
}

export async function patchShopCurrentV1(
  body: Partial<{
    name: string
    slug: string
    onboardingComplete: boolean
    regeneratePartnerCode: boolean
  }> &
    Record<string, unknown>
) {
  return v1Fetch<any>("/shops/current", {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}

export async function uploadShopLogoV1(file: File) {
  const form = new FormData()
  form.append("logo", file)
  const headers = new Headers()
  const token = getToken()
  if (token) headers.set("Authorization", `Bearer ${token}`)
  const shopId = getShopId()
  if (shopId) headers.set("X-Worqera-Shop", shopId)
  // Do not set Content-Type — browser sets multipart boundary
  const res = await fetch(`${API_V1}/shops/current/logo`, {
    method: "POST",
    headers,
    body: form,
    credentials: "include",
  })
  const text = await res.text()
  let data: any = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { detail: text }
  }
  if (!res.ok) {
    throw new ApiV1Error(data?.detail || data?.title || res.statusText, res.status, data?.code)
  }
  return data
}

export async function seedShopCatalogV1() {
  return v1Fetch<{ ok: boolean; seeded: number; existing: number }>(
    "/shops/current/seed-catalog",
    { method: "POST", body: "{}" }
  )
}

export async function applyStarterKitV1(kit: "general" | "footwear" | "laundry" | "repair") {
  return v1Fetch<{
    ok: boolean
    kit: string
    vertical: string
    sectorsCreated: number
    servicesAdded: number
    itemLabel: string
  }>("/shops/current/apply-starter-kit", {
    method: "POST",
    body: JSON.stringify({ kit }),
  })
}

export async function listSectorsV1() {
  return v1Fetch<{ sectors: any[] }>("/sectors")
}

export async function createSectorV1(body: {
  name: string
  color?: string
  order?: number
  isTerminal?: boolean
  notifyEmailOnEnter?: boolean
  showOnPublic?: boolean
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
  return v1Fetch<{
    columns: Array<{ sector: any; orders: any[] }>
    forwardTargets?: Array<{ id: string; name: string; order?: number; isTerminal?: boolean }>
    role?: string
  }>("/kanban")
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

export async function moveKanbanOrderItemV1(
  orderId: string,
  itemId: string,
  body: { toSectorId: string; note?: string; employeeName?: string }
) {
  return v1Fetch(
    `/kanban/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(itemId)}/move`,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  )
}

export async function reopenOrderV1(
  orderId: string,
  body: { sectorId: string; status?: string; note?: string }
) {
  return v1Fetch(`/orders/${encodeURIComponent(orderId)}/reopen`, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export async function addOrderCommentV1(orderId: string, text: string) {
  return v1Fetch(`/orders/${encodeURIComponent(orderId)}/comments`, {
    method: "POST",
    body: JSON.stringify({ text }),
  })
}

export async function deleteOrderV1(orderId: string) {
  return v1Fetch(`/orders/${encodeURIComponent(orderId)}`, { method: "DELETE" })
}

export async function restoreOrderV1(orderId: string) {
  return v1Fetch(`/orders/${encodeURIComponent(orderId)}/restore`, { method: "POST", body: "{}" })
}

/** Permanent delete — order must already be in trash. Owner/admin only. */
export async function purgeOrderV1(orderId: string) {
  return v1Fetch(`/orders/${encodeURIComponent(orderId)}/purge`, { method: "DELETE" })
}

export async function createDemoOrderV1() {
  return v1Fetch<any>("/orders/demo", {
    method: "POST",
    body: JSON.stringify({}),
  })
}

async function v1FetchBlob(path: string, init: RequestInit = {}, retried = false): Promise<Blob> {
  const headers = new Headers(init.headers || {})
  const token = getToken()
  if (token) headers.set("Authorization", `Bearer ${token}`)
  const shopId = getShopId()
  if (shopId) headers.set("X-Worqera-Shop", shopId)

  const res = await fetch(`${API_V1}${path}`, { ...init, headers, credentials: "include" })
  if (!res.ok) {
    if (res.status === 401 && !retried && path !== "/auth/refresh" && path !== "/auth/login") {
      const { tryRefreshSession } = await import("./authRefresh")
      const ok = await tryRefreshSession()
      if (ok) return v1FetchBlob(path, init, true)
    }
    const text = await res.text()
    let data: any = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = { detail: text }
    }
    const msg = data?.detail || data?.title || data?.error || res.statusText
    const code = data?.code
    if (code === "SUBSCRIPTION_INACTIVE" && typeof window !== "undefined") {
      window.location.href = "/billing"
    }
    throw new ApiV1Error(msg, res.status, code)
  }
  return res.blob()
}

export async function exportOrdersCsvV1() {
  return v1FetchBlob("/orders/export.csv")
}

export async function getSubscriptionV1() {
  return v1Fetch<{ subscription: any }>("/billing/subscription")
}

export async function getBillingProductsV1() {
  return v1Fetch<{ products: any[] }>("/billing/products")
}

export async function createCheckoutSessionV1() {
  return v1Fetch<{
    url: string | null
    id?: string
    sessionId?: string
    provider?: string
    configured?: boolean
    mock?: boolean
    message?: string
  }>("/billing/checkout-sessions", {
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

export async function getPublicOrderV1(
  code: string,
  shopSlug?: string,
  token?: string | null
) {
  const t = String(token || "").trim()
  const tokenQs = t ? `t=${encodeURIComponent(t)}` : ""
  if (shopSlug) {
    const qs = tokenQs ? `?${tokenQs}` : ""
    return v1Fetch(
      `/public/shops/${encodeURIComponent(shopSlug)}/orders/${encodeURIComponent(code)}${qs}`
    )
  }
  const parts = [
    shopSlug ? `shop=${encodeURIComponent(shopSlug)}` : "",
    tokenQs,
  ].filter(Boolean)
  const qs = parts.length ? `?${parts.join("&")}` : ""
  return v1Fetch(`/public/orders/${encodeURIComponent(code)}${qs}`)
}

export async function submitPublicFeedbackV1(
  shopSlug: string,
  code: string,
  body: { score: number; comment?: string; tags?: string[]; t?: string; token?: string },
  token?: string | null
) {
  const t = String(token || body.t || body.token || "").trim()
  const payload = { ...body, t: t || undefined }
  return v1Fetch(
    `/public/shops/${encodeURIComponent(shopSlug)}/orders/${encodeURIComponent(code)}/feedback`,
    { method: "POST", body: JSON.stringify(payload) }
  )
}

/** Liveness of API (no auth). Used by SystemOkBadge. */
export async function getApiHealthV1(): Promise<{ ok: boolean; ready?: boolean }> {
  try {
    const base = API_V1.replace(/\/api\/v1$/, "")
    const res = await fetch(`${base}/health/ready`, { cache: "no-store" })
    if (!res.ok) return { ok: false }
    const data = await res.json().catch(() => ({}))
    return { ok: true, ready: Boolean(data?.ready ?? data?.status === "ok") }
  } catch {
    return { ok: false }
  }
}

export async function listServicesV1() {
  return v1Fetch<{ services: Array<{
    _id?: string
    id?: string
    name: string
    defaultPrice?: number
    active?: boolean
    sortOrder?: number
    sectorPathHint?: string[]
  }> }>("/services")
}

export async function createServiceV1(body: {
  name: string
  defaultPrice?: number
  active?: boolean
  sortOrder?: number
  sectorPathHint?: string[]
}) {
  return v1Fetch("/services", { method: "POST", body: JSON.stringify(body) })
}

export async function patchServiceV1(
  id: string,
  body: Partial<{
    name: string
    defaultPrice: number
    active: boolean
    sortOrder: number
    sectorPathHint: string[]
  }>
) {
  return v1Fetch(`/services/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}

export async function deleteServiceV1(id: string) {
  return v1Fetch(`/services/${encodeURIComponent(id)}`, { method: "DELETE" })
}

export function clearSession() {
  try {
    localStorage.removeItem("token")
    localStorage.removeItem("refreshToken")
    localStorage.removeItem("shopId")
    localStorage.removeItem("user")
    localStorage.removeItem("role")
    localStorage.removeItem("shopName")
    localStorage.removeItem("shopDisplayName")
    localStorage.removeItem("userName")
    localStorage.removeItem("email")
    localStorage.removeItem("platformAdmin")
  } catch {}
  document.cookie = "token=; path=/; max-age=0; samesite=lax"
}

/** Clears refresh cookie on API then local session. */
export async function logoutV1() {
  try {
    await v1Fetch("/auth/logout", { method: "POST" })
  } catch {
    // still clear local
  }
  clearSession()
}
