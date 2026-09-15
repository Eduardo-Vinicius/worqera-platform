# Worqera Product + Phase 3 Implementation Plan

> **For agentic workers:** Execute task-by-task. No commits unless user asks.

**Goal:** Ship open product items + Phase 3 (branding, TV, wa.me, partner, env Gmail, Abacate off) with Worqera brand tokens, company-first UX, dark/light theme, and a denser dashboard.

**Architecture:** Extend `Shop` as SoT for branding/tv/notifications/partner; mailer Gmail-first with company subject/from; web reads shop into shell/TVs/emails surfaces; theme via `next-themes`.

**Tech Stack:** Node/Mongo API v1, Next.js web, nodemailer, next-themes.

**Spec:** `docs/superpowers/specs/2026-09-14-worqera-product-phase3-design.md`

## Global Constraints

- AbacatePay off in prod (`WORQERA_AbacatePay__Enabled=false`)
- WhatsApp = wa.me only (no Meta Cloud API)
- No subdomain / CNAME
- No commits unless asked
- Casa do Tênis = seed/`legacyBrand` only
- Brand: Worqera platform + Empresa protagonist

---

### Task 1: Env + mailer Gmail-first + Abacate soft-off

**Files:**
- Create: `api/.env.prod.example`
- Modify: `api/.env.example`, `api/src/v1/services/mailer.js`, `api/src/v1/services/billingService.js`, `web/app/(app)/billing/page.tsx`

- [ ] Align env keys with Procedy-style `WORQERA_Email__*` + Gmail aliases
- [ ] Prefer Gmail when enabled; SES only if explicitly preferred
- [ ] `createCheckoutSession` returns manual when disabled / no keys
- [ ] Billing UI soft message

### Task 2: Shop branding schema + Empresa + email branding

**Files:**
- Modify: `api/src/v1/models/Shop.js`, `shopService.js`, `serializers.js`, auth/invite/billing mail call sites
- Modify: `web/app/(app)/settings/empresa/page.tsx`, `web/lib/apiV1.ts`

- [ ] Schema: phone, address, logoUrl, tvSettings, notifications, partnerCode, referredByPartnerCode
- [ ] patchCurrentShop accepts branding + slug (unique check)
- [ ] Logo upload endpoint or reuse storage
- [ ] Mail subjects `[displayName]` / from `{name} via Worqera`

### Task 3: Theme + brand tokens

**Files:**
- Modify: `web/app/globals.css`, `web/app/layout.tsx`, `web/components/shell/AppHeader.tsx`
- Create: `web/components/shell/ThemeToggle.tsx`

- [ ] Tokens from worqera.com; complete `.dark` `--wq-*`
- [ ] ThemeProvider + toggle

### Task 4: Dashboard + shell company name

**Files:**
- Modify: `web/app/(app)/dashboard/page.tsx`, `AppShell.tsx` / `AppSidebar.tsx`

### Task 5: TOP-10 TV settings

**Files:**
- Create: `web/app/(app)/settings/tv/page.tsx`
- Modify: TV pages, nav, shop patch

### Task 6: TOP-06 WhatsApp wa.me

**Files:**
- Create: `web/lib/whatsapp.ts` (+ test)
- Modify: Client model, settings UI, order detail, client forms

### Task 7: Partner code + onboarding catalog seed

**Files:**
- Modify: `authService.js`, signup page, equipe/empresa, onboarding, seed services helper

### Task 8: Docs (roadmap/backlog/change-log/current-state)

---

**Execution:** inline in this session (user said “faça”).
