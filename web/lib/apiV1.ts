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
      const { tryRefreshSession, consumeRefreshDenied } = await import("./authRefresh")
      const ok = await tryRefreshSession()
      if (ok) return v1Fetch<T>(path, init, true)
      if (consumeRefreshDenied()) endSession()
    }
    const msg = data?.detail || data?.title || data?.error || res.statusText
    const code = data?.code
    if (
      code === "SUBSCRIPTION_INACTIVE" &&
      typeof window !== "undefined" &&
      window.location.pathname !== "/billing"
    ) {
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
  clearSession()
  void import("./authRefresh").then((mod) => mod.clearRefreshBlock())
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
  if (data.platformAdmin === true && !shopId && localStorage.getItem("wq-visit-shop") !== "1") {
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
  planCode?: string
  partnerCode?: string
  ref?: string
  /** Business type: starter kit key (footwear, carpentry…). */
  kit?: string
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

/** Confirms by link token or by e-mail + 6-digit code. Opens the session when it works. */
export async function verifyEmailV1(input: { token: string } | { email: string; code: string }) {
  const data = await v1Fetch<any>("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify(input),
  })
  if (data?.accessToken || data?.token) persistSession(data)
  return data as { ok: boolean; email?: string; platformAdmin?: boolean }
}

export async function resendVerificationV1(email: string) {
  return v1Fetch<{
    ok: boolean
    alreadyVerified?: boolean
    throttled?: boolean
    retryIn?: number
    devCode?: string
  }>("/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  })
}

export type ShelfItem = {
  id: string
  code: string
  clientName: string
  clientPhone: string
  readySince: string
  days: number
  stale: boolean
  toCollect: number
  total: number
  reminders: number
  lastReminderAt: string | null
  whatsapp: { text: string; url: string } | null
  /** Someone flagged it "Conferir": maybe it already left the shop. */
  check: { flaggedAt: string; byName: string } | null
  /** Ready for a week or more. */
  maybeGone: boolean
}

export type Shelf = {
  staleDays: number
  checkDays: number
  summary: { count: number; toCollect: number; staleCount: number; staleToCollect: number; oldestDays: number; checkCount: number }
  items: ShelfItem[]
}

export type ReceivableItem = {
  id: string
  code: string
  clientName: string
  phone: string
  value: number
  days: number
  stage: "delivered" | "ready"
  level: "ready" | "soft" | "firm" | "late"
  text: string
  waUrl: string
}

export type Receivables = {
  total: number
  atRisk: number
  buckets: { delivered: number; deliveredCount: number; ready: number; readyCount: number; open: number; openCount: number }
  aging: { upTo7: number; upTo30: number; over30: number }
  items: ReceivableItem[]
  headline: string
  plan: string[]
  ai: boolean
}

export async function getReceivablesV1(refresh = false) {
  return v1Fetch<{ receivables: Receivables; business: boolean; aiQuota: AiQuota | null }>(
    `/ai/receivables${refresh ? "?refresh=1" : ""}`
  )
}

export type ClientInsight = {
  numbers: {
    name: string
    visits: number
    delivered: number
    openNow: number
    spent: number
    avgTicket: number
    owed: number
    firstAt: string | null
    lastAt: string | null
    daysSinceLast: number | null
    avgGap: number | null
    topServices: Array<{ name: string; count: number }>
    avgScore: number | null
    quotes: { open: number; won: number; lost: number }
    tags: string[]
  }
  summary: string
  next: string
  ai: boolean
}

export async function getClientInsightV1(clientId: string) {
  return v1Fetch<{ insight: ClientInsight; business: boolean; aiQuota: AiQuota | null }>(
    `/ai/clients/${encodeURIComponent(clientId)}/insight`
  )
}

export async function improveClientMessageV1(orderId: string, text: string) {
  return v1Fetch<{ text: string; ai: boolean; locked?: boolean; aiQuota: AiQuota | null }>(
    `/ai/orders/${encodeURIComponent(orderId)}/message`,
    { method: "POST", body: JSON.stringify({ text }) }
  )
}

export type Attendant = { id: string; name: string; cargo?: string }

/** Funcionários ativos marcados "Atende no balcão" — a lista do "Aberto por". */
export async function listAttendantsV1() {
  const res = await v1Fetch<{ employees: Array<{ id?: string; _id?: string; name: string; cargo?: string }> }>(
    "/employees?active=true&attends=true"
  )
  return (res.employees || []).map((e) => ({ id: String(e.id || e._id || ""), name: e.name, cargo: e.cargo || "" }))
}

export async function listActiveEmployeesV1() {
  const res = await v1Fetch<{ employees: Array<{ id?: string; _id?: string; name: string; attends?: boolean }> }>(
    "/employees?active=true"
  )
  return (res.employees || []).map((e) => ({ id: String(e.id || e._id || ""), name: e.name, attends: e.attends === true }))
}

export async function createAttendantV1(name: string) {
  const e = await v1Fetch<{ id?: string; _id?: string; name: string }>("/employees", {
    method: "POST",
    body: JSON.stringify({ name, attends: true, active: true }),
  })
  return { id: String(e.id || e._id || ""), name: e.name } as Attendant
}

export type CrmSegment = "birthdays" | "inactive" | "recurring" | "new" | "vip" | "never" | "all"

export type CrmSummary = {
  inactiveDays: number
  counts: { clients: number; active90: number; recurring: number; new30: number; inactive: number; never: number; once: number; vip: number }
  buckets: { one: number; two_three: number; four_plus: number }
  birthdays: { today: number; week: number; registered: number }
  rates: { repeat: number; active: number; birthdayCoverage: number }
  money?: { spent: number; avgTicket: number; perClient: number }
}

export type CrmRow = {
  id: string
  name: string
  phone: string
  orders: number
  spent?: number
  ticket?: number
  lastOrderAt: string | null
  daysSince: number | null
  openOrders: number
  birthday: { day: number; month: number; year: number | null } | null
  birthdayIn: number | null
  age: number | null
  tags: string[]
  whatsapp: { text: string; url: string } | null
  segment: string
}

export type CrmInsight = {
  summary: CrmSummary
  moves: Array<{ id: string; title: string; segment: CrmSegment }>
  headline: string
  tip: string
  ai: boolean
}

export async function getCrmSummaryV1(days = 90) {
  return v1Fetch<CrmSummary>(`/crm/summary?days=${days}`)
}

export async function getCrmListV1(params: {
  segment: CrmSegment
  days?: number
  range?: "today" | "week" | "month"
  q?: string
  limit?: number
  offset?: number
}) {
  const qs = new URLSearchParams({ segment: params.segment })
  if (params.days) qs.set("days", String(params.days))
  if (params.range) qs.set("range", params.range)
  if (params.q) qs.set("q", params.q)
  if (params.limit) qs.set("limit", String(params.limit))
  if (params.offset) qs.set("offset", String(params.offset))
  return v1Fetch<{ segment: CrmSegment; inactiveDays: number; total: number; offset?: number; hasMore?: boolean; items: CrmRow[] }>(
    `/crm/list?${qs}`
  )
}

export async function getCrmInsightV1(refresh = false) {
  return v1Fetch<{ insight: CrmInsight; business: boolean; aiQuota: AiQuota | null }>(`/crm/insight${refresh ? "?refresh=1" : ""}`)
}

export type ClientOverview = {
  stats: CrmRow & { segment: string; firstOrderAt: string | null; avgGapDays: number | null }
  orders: Array<{ id: string; code: string; status: string; what: string; total?: number; createdAt: string; deliveredAt: string | null; score: number | null }>
}

export async function getClientOverviewV1(id: string) {
  return v1Fetch<ClientOverview>(`/clients/${encodeURIComponent(id)}/overview`)
}

export type AttendanceRow = {
  employeeId: string | null
  name: string
  orders: number
  delivered: number
  cancelled: number
  sold: number
  ticket: number
  serviceScore: number | null
  serviceScoreCount: number
  recoveries: number
}

export type AttendanceReport = {
  period: { start: string; end: string; label: string }
  totals: {
    orders: number
    informed: number
    coverage: number
    attendants: number
    serviceScore?: number | null
    serviceScoreCount?: number
    recoveries?: number
  }
  rows: AttendanceRow[]
  /** Open orders still without "Aberto por" — fix them from the report. */
  missing?: Array<{ id: string; code: string; clientName: string; status: string; createdAt: string }>
}

/** Métricas → Atendimento (dono/admin). */
export async function getAttendanceV1(periodo: string) {
  return v1Fetch<AttendanceReport>(`/metrics/attendance?periodo=${encodeURIComponent(periodo)}`)
}

export type ClosedCard = {
  id: string
  code: string
  clientName: string
  clientPhone: string
  summary: string
  itemCount: number
  feedbackScore: number | null
  total?: number
  remaining?: number
  at: string
  reason?: string | null
  reasonLabel?: string
  quoteId?: string | null
  quoteStage?: string | null
  followUpAt?: string | null
}

export async function getKanbanClosedV1(days = 14) {
  return v1Fetch<{ days: number; delivered: ClosedCard[]; refused: ClosedCard[] }>(`/kanban/closed?days=${days}`)
}

export async function getShelfV1() {
  return v1Fetch<Shelf>("/orders/shelf")
}

export async function setShelfCheckV1(orderId: string, on = true) {
  return v1Fetch<{ ok: boolean; check: { flaggedAt: string; byName: string } | null }>(
    `/orders/${encodeURIComponent(orderId)}/shelf-check`,
    { method: "POST", body: JSON.stringify({ on }) }
  )
}

export async function markShelfRemindedV1(orderId: string) {
  return v1Fetch<{ ok: boolean; reminders: number; lastReminderAt: string }>(
    `/orders/${encodeURIComponent(orderId)}/shelf-remind`,
    { method: "POST" }
  )
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
  if (
    data?.platformAdmin === true &&
    !shop?.id &&
    localStorage.getItem("wq-visit-shop") !== "1"
  ) {
    localStorage.setItem("shopName", "Worqera Platform")
    localStorage.setItem("shopDisplayName", "Worqera Platform")
    if (!localStorage.getItem("role")) localStorage.setItem("role", "platform")
  }
  return data
}

export function enterPlatformShop(shop: { id: string; name: string; slug?: string }) {
  localStorage.setItem("shopId", shop.id)
  localStorage.setItem("shopName", shop.name)
  localStorage.setItem("shopDisplayName", shop.name)
  if (shop.slug) localStorage.setItem("shopSlug", shop.slug)
  localStorage.setItem("role", "platform")
  localStorage.setItem("wq-visit-shop", "1")
  const secure = window.location.protocol === "https:" ? "; secure" : ""
  document.cookie = `wq_shop=${encodeURIComponent(shop.id)}; path=/; max-age=604800; samesite=lax${secure}`
  window.dispatchEvent(new Event("wq-session-updated"))
}

export function leavePlatformShop() {
  localStorage.removeItem("shopId")
  localStorage.removeItem("shopSlug")
  localStorage.removeItem("shopLogoUrl")
  localStorage.setItem("shopName", "Worqera Platform")
  localStorage.setItem("shopDisplayName", "Worqera Platform")
  localStorage.setItem("role", "platform")
  localStorage.removeItem("wq-visit-shop")
  document.cookie = "wq_shop=; path=/; max-age=0; samesite=lax"
  window.dispatchEvent(new Event("wq-session-updated"))
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

export async function markAlertsInboxReadV1() {
  return v1Fetch<{ ok: boolean }>("/alerts/inbox/read", { method: "POST" })
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
    history?: InboxHistoryItem[]
  }>("/alerts/inbox")
}

export type InboxHistoryItem = {
  kind: "ready" | "reopened" | "feedback"
  id: string
  code: string
  clientName: string
  at?: string | null
  read?: boolean
  score?: number
  comment?: string
}

export async function listFeedbackV1(opts?: {
  period?: "30d" | "90d" | "all"
  page?: number
  limit?: number
  /** Comma-separated scores, e.g. "1,2,3" */
  score?: string
  /** Employee id from "Aberto por". */
  openedBy?: string
}) {
  const q = new URLSearchParams()
  if (opts?.period) q.set("period", opts.period)
  if (opts?.page) q.set("page", String(opts.page))
  if (opts?.limit) q.set("limit", String(opts.limit))
  if (opts?.score) q.set("score", opts.score)
  if (opts?.openedBy) q.set("openedBy", opts.openedBy)
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
      serviceAvg?: number | null
      serviceCount?: number
    }
    items: Array<{
      id: string
      code: string
      clientName: string
      status?: string
      score?: number
      serviceScore?: number | null
      openedByName?: string
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
    seal: string
    founder: boolean
  }>
) {
  return v1Fetch(`/platform/shops/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}

export type PlatformFlag = {
  key: string
  label: string
  enabled: boolean
  shops: Array<{ shopId: string; enabled: boolean }>
}

export type OpsEndpoint = {
  method: string
  route: string
  count: number
  avgMs: number
  maxMs: number
  ok: number
  clientErrors: number
  errors: number
  errorRate: number
  clientErrorRate?: number
}

export type OpsWindow = {
  calls: number
  errors: number
  avgMs: number
  endpoints: OpsEndpoint[]
}

export async function getPlatformOpsV1() {
  return v1Fetch<{
    redis: "up" | "down"
    activeUsers: number
    windows: { "1h": OpsWindow; "24h": OpsWindow; "30d": OpsWindow }
    errors: Array<{
      id: string
      message: string
      route: string
      method: string
      status: number
      shopId?: string | null
      shopName?: string
      count?: number
      at: string
    }>
    mail?: Array<{
      id: string
      at?: string
      shopId?: string | null
      shopName?: string
      kind?: string
      code?: string
      to?: string
      ok?: boolean
      skipped?: boolean
      reason?: string
      error?: string
      provider?: string
    }>
    shops: { total: number; suspended: number; trialing: number; active: number; openOrders: number }
    notices: PlatformNotice[]
    disabled: Array<{ kind: "feature" | "service"; key: string; label: string }>
    ai?: {
      configured: boolean
      model: string
      deepModel: string
      totalUsd: number
      calls: number
      shops: Array<{
        shopId: string
        shopName: string
        calls: number
        failed: number
        costUsd: number
        used: number
        limit: number
        blocked: boolean
      }>
    }
    whatsapp?: {
      configured: boolean
      shops: Array<{
        shopId: string
        name: string
        status: string
        paymentOk: boolean
        displayPhone: string
        metaCostBrl: number
        overageBrl: number
        counts: { utility: number; marketing: number; service: number }
        overageDue: { month: string; amountBrl: number } | null
      }>
    }
  }>("/platform/ops")
}

export async function getPlatformConfigV1() {
  return v1Fetch<{ features: PlatformFlag[]; services: PlatformFlag[]; seals: string[] }>("/platform/config")
}

export async function putPlatformConfigV1(body: {
  features?: Array<{ key: string; enabled?: boolean; shopId?: string; shopEnabled?: boolean; inherit?: boolean }>
  services?: Array<{ key: string; enabled?: boolean; shopId?: string; shopEnabled?: boolean; inherit?: boolean }>
}) {
  return v1Fetch<{ features: PlatformFlag[]; services: PlatformFlag[] }>("/platform/config", {
    method: "PUT",
    body: JSON.stringify(body),
  })
}

export type PlatformNotice = {
  id: string
  title: string
  body: string
  startsAt?: string | null
  endsAt?: string | null
  intervalHours: number
  region: string
  platform: string
  minVersion: string
  maxVersion: string
  active: boolean
  display?: "banner" | "modal"
  steps?: Array<{ title: string; body: string; href: string; cta: string }>
  createdAt?: string | null
}

export async function listPlatformNoticesV1() {
  return v1Fetch<{ notices: PlatformNotice[] }>("/platform/notices")
}

export async function createPlatformNoticeV1(body: Partial<PlatformNotice> & { title: string }) {
  return v1Fetch<{ notice: PlatformNotice }>("/platform/notices", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export async function deletePlatformNoticeV1(id: string) {
  return v1Fetch(`/platform/notices/${encodeURIComponent(id)}`, { method: "DELETE" })
}

export async function getRuntimeConfigV1(params: { platform?: string; version?: string; region?: string } = {}) {
  const qs = new URLSearchParams()
  if (params.platform) qs.set("platform", params.platform)
  if (params.version) qs.set("version", params.version)
  if (params.region) qs.set("region", params.region)
  const suffix = qs.toString() ? `?${qs}` : ""
  return v1Fetch<{
    seal?: string
    features?: Record<string, boolean>
    services?: Record<string, boolean>
    notices?: PlatformNotice[]
  }>(`/runtime/config${suffix}`)
}

export async function postRuntimeLocationV1(body: { lat: number; lng: number; accuracy?: number }) {
  return v1Fetch("/runtime/location", { method: "POST", body: JSON.stringify(body) })
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

export async function applyStarterKitV1(kit: string) {
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

export async function listSectorsV1(opts?: { includeInactive?: boolean }) {
  const q = opts?.includeInactive ? "?includeInactive=true" : ""
  return v1Fetch<{ sectors: any[] }>(`/sectors${q}`)
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

export async function deleteSectorV1(id: string) {
  return v1Fetch(`/sectors/${encodeURIComponent(id)}`, { method: "DELETE" })
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
      const { tryRefreshSession, consumeRefreshDenied } = await import("./authRefresh")
      const ok = await tryRefreshSession()
      if (ok) return v1FetchBlob(path, init, true)
      if (consumeRefreshDenied()) endSession()
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
    if (
      code === "SUBSCRIPTION_INACTIVE" &&
      typeof window !== "undefined" &&
      window.location.pathname !== "/billing"
    ) {
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

/** Asaas: returns the invoice link (Pix, boleto or card), or `provider: "manual"` when online payment is off. */
export async function createCheckoutSessionV1(body: {
  planCode: string
  cycle: "monthly" | "yearly"
  cpfCnpj: string
  successUrl?: string
}) {
  return v1Fetch<{
    url: string | null
    provider?: string
    configured?: boolean
    message?: string
    planCode?: string
    cycle?: string
  }>("/billing/checkout-sessions", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export type BillingPayment = {
  id: string | null
  dueDate: string | null
  paidAt: string | null
  value: number
  status: "paid" | "open" | "overdue" | "refunded"
  statusLabel: string
  method: string
  invoiceUrl: string | null
  receiptUrl: string | null
}

export async function listBillingPaymentsV1() {
  return v1Fetch<{ payments: BillingPayment[] }>("/billing/payments")
}

export async function cancelSubscriptionV1() {
  return v1Fetch<{ subscription: any }>("/billing/cancel", { method: "POST", body: "{}" })
}

export async function completeCheckoutDevV1(planCode?: string) {
  return v1Fetch("/billing/dev/complete-checkout", {
    method: "POST",
    body: JSON.stringify(planCode ? { planCode } : {}),
  })
}

export async function getPublicOrderByTokenV1(token: string) {
  return v1Fetch(`/public/track/${encodeURIComponent(token)}`)
}

export async function submitPublicFeedbackByTokenV1(
  token: string,
  body: { score: number; serviceScore?: number | null; comment?: string; tags?: string[] }
) {
  return v1Fetch(`/public/track/${encodeURIComponent(token)}/feedback`, {
    method: "POST",
    body: JSON.stringify(body),
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
  body: { score: number; serviceScore?: number | null; comment?: string; tags?: string[]; t?: string; token?: string },
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

export async function listAccessoriesV1() {
  return v1Fetch<{
    accessories: Array<{
      _id?: string
      id?: string
      name: string
      active?: boolean
      sortOrder?: number
    }>
  }>("/accessories")
}

export async function createAccessoryV1(body: { name: string; active?: boolean; sortOrder?: number }) {
  return v1Fetch("/accessories", { method: "POST", body: JSON.stringify(body) })
}

export async function patchAccessoryV1(
  id: string,
  body: Partial<{ name: string; active: boolean; sortOrder: number }>
) {
  return v1Fetch(`/accessories/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}

export async function deleteAccessoryV1(id: string) {
  return v1Fetch(`/accessories/${encodeURIComponent(id)}`, { method: "DELETE" })
}

export async function listBrandsV1() {
  return v1Fetch<{
    brands: Array<{ _id?: string; id?: string; name: string; active?: boolean }>
  }>("/brands")
}

export async function createBrandV1(body: { name: string }) {
  return v1Fetch<{ name?: string }>("/brands", { method: "POST", body: JSON.stringify(body) })
}

export async function patchBrandV1(id: string, body: Partial<{ name: string; active: boolean }>) {
  return v1Fetch(`/brands/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}

export async function deleteBrandV1(id: string) {
  return v1Fetch(`/brands/${encodeURIComponent(id)}`, { method: "DELETE" })
}

export function endSession(message = "Sua sessão acabou. Entre de novo.") {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem("wq-auth-notice", message)
  } catch {}
  clearSession()
  if (!window.location.pathname.startsWith("/login")) {
    window.location.href = "/login"
  }
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
    localStorage.removeItem("shopSlug")
    localStorage.removeItem("shopLogoUrl")
    localStorage.removeItem("userName")
    localStorage.removeItem("email")
    localStorage.removeItem("platformAdmin")
    localStorage.removeItem("wq-email-unverified")
    localStorage.removeItem("wq-email-unverified-dismissed")
    localStorage.removeItem("wq-visit-shop")
  } catch {}
  document.cookie = "token=; path=/; max-age=0; samesite=lax"
  document.cookie = "wq_shop=; path=/; max-age=0; samesite=lax"
}

export async function listProductsV1() {
  return v1Fetch<{ products: Array<{
    id: string
    name: string
    sku?: string
    description?: string
    price: number
    trackStock?: boolean
    minQty?: number
    active?: boolean
    onHand?: number
    reserved?: number
    available?: number
    low?: boolean
    leadTimeDays?: number
    restock?: ProductRestock | null
    variants?: Array<{ id: string; name: string; sku?: string; price: number | null; onHand: number; reserved: number; available: number }>
  }> }>("/products")
}

export type ProductRestock = {
  qty: number
  variantId: string | null
  orderedAt: string
  expectedAt: string | null
  note: string
  byName: string
}

export type RestockRow = {
  id: string
  name: string
  available: number
  minQty: number
  leadTimeDays: number
  variants: Array<{ id: string; name: string; available: number }>
  restock: ProductRestock | null
  state: "order" | "coming" | "late"
  reorderPoint: number
  daysOfStock: number | null
  daysLeft: number | null
  dailyUse: number | null
}

export type RestockReport = {
  order: RestockRow[]
  coming: RestockRow[]
  late: RestockRow[]
  counts: { order: number; coming: number; late: number }
}

export async function getRestockV1() {
  return v1Fetch<RestockReport>("/products/restock")
}

export async function orderRestockV1(id: string, body: { qty: number; expectedAt?: string | null; note?: string; variantId?: string }) {
  return v1Fetch(`/products/${encodeURIComponent(id)}/restock`, { method: "POST", body: JSON.stringify(body) })
}

export async function restockArrivedV1(id: string, qty?: number) {
  return v1Fetch(`/products/${encodeURIComponent(id)}/restock/arrived`, { method: "POST", body: JSON.stringify(qty ? { qty } : {}) })
}

export async function cancelRestockV1(id: string) {
  return v1Fetch(`/products/${encodeURIComponent(id)}/restock`, { method: "DELETE" })
}

export async function createProductV1(body: Record<string, unknown>) {
  return v1Fetch<{ product: { id: string } }>("/products", { method: "POST", body: JSON.stringify(body) })
}

export async function patchProductV1(id: string, body: Record<string, unknown>) {
  return v1Fetch(`/products/${id}`, { method: "PATCH", body: JSON.stringify(body) })
}

export async function deleteProductV1(id: string) {
  return v1Fetch(`/products/${id}`, { method: "DELETE" })
}

export async function adjustProductV1(id: string, body: { quantity: number; reason: string; variantId?: string }) {
  return v1Fetch(`/products/${id}/adjust`, { method: "POST", body: JSON.stringify(body) })
}

export async function productMovementsV1(id: string) {
  return v1Fetch<{ movements: Array<{ id: string; type: string; quantity: number; reason: string; orderCode?: string; createdAt?: string; variantName?: string }> }>(
    `/products/${id}/movements`
  )
}

export async function productReportCsvV1() {
  return v1FetchBlob("/products/report.csv")
}

export async function productSummaryV1() {
  return v1Fetch<{ summary: {
    productCount: number
    stockValue: number
    availableUnits: number
    salesTotal: number
    salesUnits: number
    reservedValue: number
    low: Array<{ id: string; name: string; available: number }>
    movements: Array<{ id: string; productName: string; variantName?: string; type: string; quantity: number; reason: string; orderCode?: string; createdAt?: string }>
  } }>("/products/summary")
}

export type QuoteStage = "new" | "contact" | "followup" | "lost" | "won"
export type QuoteReason = "price" | "deadline" | "thinking" | "other_shop" | "no_need" | "other"

export type QuoteActivity = {
  id: string
  kind: "created" | "refused" | "stage" | "note" | "call" | "whatsapp" | "won" | "lost" | "reopened" | "reply"
  text: string
  stage: QuoteStage | null
  byName: string
  at: string
}

export type Quote = {
  id: string
  clientId: string | null
  orderId: string | null
  orderCode: string
  source: "order" | "counter"
  name: string
  phone: string
  phoneDigits: string
  email: string
  what: string
  value: number
  stage: QuoteStage
  reason: QuoteReason | null
  reasonLabel: string
  reasonNote: string
  followUpAt: string | null
  followUp: { state: "overdue" | "today" | "later" | "none"; days: number }
  notes: string
  contactCount: number
  lastContactAt: string | null
  wonAt: string | null
  lostAt: string | null
  wonOrderId: string | null
  recovery?: {
    how: string | null
    howLabel: string
    realReason: QuoteReason | null
    realReasonLabel: string
    note: string
    people: string[]
    contacts: number
    value: number
    at: string
    byName: string
  } | null
  priority: { level: "high" | "medium" | "low" | "none"; score: number; hint: string }
  activity: QuoteActivity[]
  createdAt: string
  updatedAt: string
}

export type QuoteSummary = {
  openCount: number
  openValue: number
  todayCount: number
  overdueCount: number
  wonCount30d: number
  wonValue30d: number
  lostCount30d: number
  recoveryRate: number
  byStage: Record<QuoteStage, number>
}

export type QuotePrefill = {
  clientId: string | null
  name: string
  phone: string
  email: string
  what: string
  value: number
}

export async function listQuotesV1(params: { view?: "today" | "board" | "all"; q?: string; clientId?: string } = {}) {
  const qs = new URLSearchParams()
  if (params.view) qs.set("view", params.view)
  if (params.q) qs.set("q", params.q)
  if (params.clientId) qs.set("clientId", params.clientId)
  const suffix = qs.toString() ? `?${qs}` : ""
  return v1Fetch<{ view: string; quotes: Quote[]; summary: QuoteSummary; channels?: QuoteChannels }>(
    `/quotes${suffix}`
  )
}

export type QuoteChannels = { ai: boolean; whatsappOfficial: boolean }

export async function getQuoteV1(id: string) {
  return v1Fetch<{ quote: Quote; channels?: QuoteChannels }>(`/quotes/${encodeURIComponent(id)}`)
}

export async function createQuoteV1(body: {
  clientId?: string | null
  name: string
  phone?: string
  email?: string
  what?: string
  value?: number
  reason?: QuoteReason | null
  reasonNote?: string
  followUpAt?: string | null
  notes?: string
}) {
  return v1Fetch<{ quote: Quote }>("/quotes", { method: "POST", body: JSON.stringify(body) })
}

export async function patchQuoteV1(
  id: string,
  body: Partial<{
    name: string
    phone: string
    email: string
    what: string
    value: number
    stage: QuoteStage
    reason: QuoteReason | null
    reasonNote: string
    followUpAt: string | null
    notes: string
  }>
) {
  return v1Fetch<{ quote: Quote; order?: any; prefill?: QuotePrefill | null }>(
    `/quotes/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(body) }
  )
}

export async function addQuoteActivityV1(
  id: string,
  body: { kind: "call" | "whatsapp" | "note"; text?: string; followUpAt?: string | null }
) {
  return v1Fetch<{ quote: Quote }>(`/quotes/${encodeURIComponent(id)}/activity`, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export async function suggestQuoteMessageV1(id: string) {
  return v1Fetch<{
    ai: boolean
    options: Array<{ tone: string; label: string; text: string; waUrl: string | null }>
    aiQuota?: AiQuota | null
  }>(`/quotes/${encodeURIComponent(id)}/suggest`, { method: "POST", body: "{}" })
}

export type RecoveryInput = {
  how?: import("./recovery").RecoveryHow | null
  realReason?: QuoteReason | null
  note?: string
  helperEmployeeIds?: string[]
}

export async function winQuoteV1(id: string, recovery: RecoveryInput = {}) {
  return v1Fetch<{ quote: Quote; order: any | null; prefill: QuotePrefill | null }>(
    `/quotes/${encodeURIComponent(id)}/win`,
    { method: "POST", body: JSON.stringify(recovery) }
  )
}

export type RecoveredReport = {
  days: number
  summary: { count: number; value: number; rate: number; avgContacts: number; avgPeople: number; lost: number }
  byReason: Array<{ reason: QuoteReason | "none"; label: string; count: number; topHow: string; topHowLabel: string; hows: Array<{ how: string; label: string; count: number }> }>
  byHow: Array<{ how: string; label: string; count: number; value: number }>
  byPerson: Array<{ name: string; count: number; value: number }>
  items: Array<{
    id: string
    name: string
    orderCode: string
    wonOrderId: string | null
    value: number
    reasonLabel: string
    howLabel: string
    note: string
    people: string[]
    contacts: number
    byName: string
    at: string
  }>
  showsTotals: boolean
}

export async function getRecoveredV1(days = 30) {
  return v1Fetch<RecoveredReport>(`/quotes/recovered?days=${days}`)
}

export async function deleteQuoteV1(id: string) {
  return v1Fetch<{ ok: boolean }>(`/quotes/${encodeURIComponent(id)}`, { method: "DELETE" })
}

export async function refuseOrderQuoteV1(
  orderId: string,
  body: { reason: QuoteReason; reasonNote?: string; followUpAt?: string | null }
) {
  return v1Fetch<{ order: any; quote: Quote }>(`/orders/${encodeURIComponent(orderId)}/refuse-quote`, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export type DailyBriefAction = {
  id: string
  title: string
  detail: string
  value: number
  href: string
  tone: "brand" | "ok" | "warn" | "danger" | "muted"
}

/** owner = dono/admin (com valores) · team = atendimento (sem valores) · sector = só a fila do setor. */
export type DailyBriefAudience = "owner" | "team" | "sector"

export type DailyBriefShopNumbers = {
  ready: number
  open: number
  overdue: number
  dueTomorrow: number
  tomorrowBySector: Array<{ name: string; count: number }>
  callToday: number
  callOverdue: number
  quotesOpenValue?: number
}

export type DailyBriefSectorNumbers = {
  queue: number
  overdue: number
  dueToday: number
  dueTomorrow: number
  urgent: number
  sectors: string[]
}

type DailyBriefBase = {
  day: string
  text: string
  tip?: string
  ai: boolean
  stake?: number
  actions?: DailyBriefAction[]
}

export type DailyBrief =
  | (DailyBriefBase & { audience?: "owner" | "team"; numbers: DailyBriefShopNumbers })
  | (DailyBriefBase & { audience: "sector"; numbers: DailyBriefSectorNumbers })

export type AiQuota = {
  used: number
  limit: number
  included: number
  extra: number
  left: number
  percent: number
  blocked: boolean
  nearLimit: boolean
  resetsAt: string
}

export async function getAiQuotaV1() {
  return v1Fetch<{ business: boolean; configured: boolean; quota: AiQuota | null }>("/ai/quota")
}

export async function platformAiQuotaV1(shopId: string, body: { extraCalls?: number; monthlyCap?: number | null }) {
  return v1Fetch<{ quota: AiQuota }>(`/platform/shops/${encodeURIComponent(shopId)}/ai`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}

export async function getDailyBriefV1(refresh = false) {
  return v1Fetch<{ brief: DailyBrief; business: boolean; aiQuota: AiQuota | null }>(
    `/dashboard/brief${refresh ? "?refresh=1" : ""}`
  )
}

export async function getWeeklyInsightsV1(refresh = false) {
  return v1Fetch<{
    locked: boolean
    insights: { week: string; bullets: string[]; ai: boolean } | null
    aiQuota?: AiQuota | null
  }>(`/metrics/insights${refresh ? "?refresh=1" : ""}`)
}

/** `text` saves the team's wording; no text asks the AI (Business). */
export async function customerSummaryV1(orderId: string, text?: string) {
  return v1Fetch<{
    customerSummary: { text: string; ai: boolean; edited: boolean } | null
    ai?: boolean
    aiQuota?: AiQuota | null
  }>(`/orders/${encodeURIComponent(orderId)}/customer-summary`, {
    method: "POST",
    body: JSON.stringify(text != null ? { text } : {}),
  })
}

export async function suggestReviewReplyV1(orderId: string) {
  return v1Fetch<{
    ai: boolean
    options: Array<{ tone: string; label: string; text: string }>
    aiQuota?: AiQuota | null
  }>(`/orders/${encodeURIComponent(orderId)}/feedback/reply-suggest`, { method: "POST", body: "{}" })
}

export type WhatsAppCloudStatus = {
  configured: boolean
  business: boolean
  status: "off" | "pending" | "connected" | "paused"
  displayPhone: string
  verifiedName: string
  paymentOk: boolean
  pausedReason: string
  autoReady: boolean
  consentAtCounter: boolean
  canSend: boolean
  blockedReason: string | null
  blockedText: string
  usage: {
    counts: { utility: number; marketing: number; service: number }
    pack: { utility: number; marketing: number }
    cap: { utility: number; marketing: number }
    extra: { utility: number; marketing: number }
    metaCostBrl: number
    overageBrl: number
    percentOfPack: { utility: number; marketing: number }
  } | null
  overage: { month: string; amountBrl: number; since: string | null; paidAt: string | null } | null
  rates: { utility: number; marketing: number; service: number }
  overagePrices: { utility: number; marketing: number }
  signup: { appId: string; configId: string; graphVersion: string } | null
}

export async function getWhatsAppV1() {
  return v1Fetch<WhatsAppCloudStatus>("/whatsapp")
}

export async function connectWhatsAppV1(body: { code: string; wabaId: string; phoneNumberId: string; coexistence?: boolean }) {
  return v1Fetch<WhatsAppCloudStatus>("/whatsapp/connect", { method: "POST", body: JSON.stringify(body) })
}

export async function patchWhatsAppV1(body: { autoReady?: boolean; consentAtCounter?: boolean }) {
  return v1Fetch<WhatsAppCloudStatus>("/whatsapp", { method: "PATCH", body: JSON.stringify(body) })
}

export async function disconnectWhatsAppV1() {
  return v1Fetch<WhatsAppCloudStatus>("/whatsapp/disconnect", { method: "POST", body: "{}" })
}

export async function sendQuoteWhatsAppV1(quoteId: string) {
  return v1Fetch<{ ok: boolean; reason?: string; message?: string; followUpsLeft?: number }>(
    `/quotes/${encodeURIComponent(quoteId)}/whatsapp`,
    { method: "POST", body: "{}" }
  )
}

export async function platformWhatsAppV1(
  shopId: string,
  body: { paymentOk?: boolean; paused?: boolean; pausedReason?: string; overagePaid?: boolean; capBoost?: boolean }
) {
  return v1Fetch<WhatsAppCloudStatus>(`/platform/shops/${encodeURIComponent(shopId)}/whatsapp`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}

/** Clears refresh cookie on API then local session. */
export async function logoutV1() {
  try {
    const refreshToken = typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null
    await v1Fetch("/auth/logout", {
      method: "POST",
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    })
  } catch {
    // still clear local
  }
  clearSession()
}

/** Worqera team admin reads (`/platform/*`, platform admins only). */
export async function platformGetV1<T>(path: string) {
  return v1Fetch<T>(`/platform${path}`)
}

export async function platformPostV1<T>(path: string, body: unknown = {}) {
  return v1Fetch<T>(`/platform${path}`, { method: "POST", body: JSON.stringify(body) })
}

/* ---------- Worqera admin (platform) — métricas, análises e operação ---------- */

export type MetricDelta = { value: number; prev: number; pct: number | null }
export type DayPoint = { day: string; value: number }

export type PlatformTech = {
  days: number
  client: string
  kpis: Record<"requests" | "activeUsers" | "errors5xx" | "errorRate" | "avgMs" | "p95Ms" | "maxMs", MetricDelta>
  series: { requests: DayPoint[]; errors: DayPoint[]; activeUsers: DayPoint[]; halfHours: Array<{ at: string; value: number }> }
  topEndpoints: Array<{ method: string; route: string; count: number; avgMs: number; p95Ms: number; maxMs: number; errors4xx: number; errors5xx: number; errorRate: number }>
  slowest: PlatformTech["topEndpoints"]
  recentErrors: Array<{ at: string; method: string; route: string; status: number; code: string; message: string; correlationId: string; client: string }>
  byRegion: Array<{ region: string; users: number; pct: number }>
  byClient: Array<{ client: string; users: number }>
  appVersions: { latest: string | null; mobileUsers: number; onLatestPct: number; rows: Array<{ platform: string; version: string; users: number; pct: number }> }
  health: { status: "healthy" | "degraded" | "down"; label: string; db: string; queue: number; dropped: number; lastFlushAt: string | null; lastError: string | null; errorRateLastHour: number; requestsLastHour: number; collecting: boolean }
}

export type BusinessMetric = { key: string; label: string; total: number | null; money?: boolean; new: MetricDelta; series: DayPoint[] }
export type PlatformBusiness = {
  days: number
  metrics: BusinessMetric[]
  mrr: { mrr: number; paying: number; byPlan: Record<string, number> }
  subscriptions: Record<string, number>
}

export type PlatformProduct = {
  days: number
  activeShops: number
  verticals: Array<{ key: string; count: number }>
  regions: Array<{ key: string; count: number }>
  coverage: Array<{ key: string; label: string; shops: number; pct: number }>
  topServices: Array<{ name: string; count: number }>
}

export async function getPlatformTechV1(days: number, client = "all") {
  return v1Fetch<PlatformTech>(`/platform/metrics/tech?days=${days}&client=${encodeURIComponent(client)}`)
}
export async function getPlatformBusinessV1(days: number) {
  return v1Fetch<PlatformBusiness>(`/platform/metrics/business?days=${days}`)
}
export async function getPlatformProductV1(days: number) {
  return v1Fetch<PlatformProduct>(`/platform/metrics/product?days=${days}`)
}

export type PlatformInsight = { id: string; severity: "critical" | "warn" | "info" | "positive"; title: string; detail: string; href: string }
export type QueueItem = { id: string; shopId: string | null; title: string; detail: string; since: string; hours: number; sla: "ok" | "warn" | "late"; action: "extendTrial" | "openShop" | "metrics" }
export type PlatformQueue = { key: string; label: string; hint: string; count: number; oldestHours: number; sla: "ok" | "warn" | "late"; items: QueueItem[] }

export type PlatformOverview = {
  days: number
  kpis: {
    activeUsers30: MetricDelta
    ordersCreated: MetricDelta
    ordersDelivered: MetricDelta
    activeShops30: MetricDelta
    mrr: { value: number; paying: number }
  }
  health: { score: number; label: string; status: "healthy" | "degraded" | "down"; errorRate: number; p95Ms: number; queue: number }
  insights: PlatformInsight[]
  queues: Array<Omit<PlatformQueue, "items">>
}

export type FunnelStep = { key: string; label: string; count: number; pctOfPrev: number; pctOfTotal?: number; medianHours?: number | null }

export type PlatformShopHealth = {
  id: string
  name: string
  status: string
  plan: string | null
  subscription: string | null
  mrr: number
  members: number
  lastActivity: string | null
  idleDays: number | null
  orders: number
  ordersPrev: number
  change: number | null
  atRisk: boolean
  riskReason: string | null
  createdAt: string
  stage: "created" | "configured" | "paid" | "using"
}

export type PlatformAccountRow = {
  id: string
  name: string
  email: string
  createdAt: string
  verified: boolean
  lastActivity: string | null
  shops: Array<{ id: string; name: string; role: string }>
}

export type PlatformAccount360 = {
  account: { id: string; name: string; email: string; createdAt: string; verified: boolean; sessionsRevoked: number }
  shops: Array<{ id: string; name: string; role: string; active: boolean; status: string | null; plan: string | null; subscription: string | null; cycle: string | null; trialEndsAt: string | null; paidUntil: string | null }>
  activity: Array<{ client: string; appVersion: string | null; lastSeen: string; days: number }>
  lastActivity: string | null
  counters: { ordersCreated30: number; logins30: number; activeDays30: number }
  security: Array<{ at: string; kind: string; device: string; ip: string; client: string }>
}

export async function getPlatformOverviewV1(days: number) {
  return v1Fetch<PlatformOverview>(`/platform/overview?days=${days}`)
}
export async function getPlatformQueuesV1() {
  return v1Fetch<{ queues: PlatformQueue[] }>("/platform/queues")
}
export async function getPlatformFunnelV1(days: number) {
  return v1Fetch<{ days: number; shops: number; steps: FunnelStep[] }>(`/platform/analytics/funnel?days=${days}`)
}
export async function getPlatformCohortsV1(weeks = 8) {
  return v1Fetch<{ weeks: number; rows: Array<{ week: string; size: number; cells: number[] }>; historyDays: number; lowHistory: boolean }>(
    `/platform/analytics/cohorts?weeks=${weeks}`
  )
}
export async function getPlatformEngagementV1(days: number) {
  return v1Fetch<{
    days: number
    dau: number
    wau: number
    mau: number
    stickiness: number
    newUsers: number
    returningUsers: number
    byClient: Array<{ client: string; users: number }>
    series: DayPoint[]
  }>(`/platform/analytics/engagement?days=${days}`)
}
export async function getPlatformAdoptionV1(days: number) {
  return v1Fetch<{ days: number; activeShops: number; adoption: Array<{ key: string; label: string; shops: number; pct: number }> }>(
    `/platform/analytics/adoption?days=${days}`
  )
}
export async function getPlatformTransactionsV1(days: number) {
  return v1Fetch<{
    days: number
    orders: { steps: FunnelStep[]; cancelled: number; medianHoursToDeliver: number | null; valueBands: Array<{ label: string; count: number }>; topServices: Array<{ name: string; count: number }> }
    quotes: { steps: FunnelStep[]; lost: number; value: number; wonValue: number; medianHoursToFirstContact: number | null }
  }>(`/platform/analytics/transactions?days=${days}`)
}
export async function getPlatformShopsHealthV1(days: number) {
  return v1Fetch<{ days: number; pipeline: Array<{ stage: string; label: string; count: number }>; atRisk: number; shops: PlatformShopHealth[] }>(
    `/platform/shops-health?days=${days}`
  )
}
export async function listPlatformAccountsV1(params: { segment?: string; q?: string; page?: number }) {
  const qs = new URLSearchParams()
  if (params.segment) qs.set("segment", params.segment)
  if (params.q) qs.set("q", params.q)
  if (params.page) qs.set("page", String(params.page))
  return v1Fetch<{ segment: string; counts: Record<string, number>; total: number; page: number; accounts: PlatformAccountRow[] }>(`/platform/accounts?${qs}`)
}
export async function getPlatformAccountV1(id: string) {
  return v1Fetch<PlatformAccount360>(`/platform/accounts/${encodeURIComponent(id)}`)
}
