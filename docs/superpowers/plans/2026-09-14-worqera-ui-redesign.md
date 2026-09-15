# Worqera UI Redesign + English API — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Worqera web (Procedy density, Worqera palette) in waves and make `/api/v1` paths + JSON fully English.

**Architecture:** Tokens in `globals.css` → `AppShell` layout for authenticated routes → page restyles by wave. API: rename PT routes/serializers; update `web/lib/apiV1.ts` + `apiService.ts` in the same commit as API changes.

**Tech Stack:** Next.js 15, React 19, Tailwind 4, Radix/shadcn, Express `/api/v1`, Mongo.

## Global Constraints

- Spec: [2026-09-14-worqera-ui-redesign.md](../specs/2026-09-14-worqera-ui-redesign.md)
- UI copy pt-BR; API English only
- Brand: Worqera (not Casa do Tênis hardcoded)
- Preserve kanban behaviors (filters, move, detail) while changing layout
- No commit unless user asks
- Update roadmaps/current-state when a wave ships

## File map

| Area | Files |
|------|--------|
| Tokens | `web/app/globals.css`, `web/app/layout.tsx` |
| Shell | `web/components/shell/*`, `web/app/(app)/layout.tsx` |
| Auth UI | `web/app/page.tsx`, `web/app/signup/page.tsx` |
| API routes | `api/src/v1/routes/dashboardRoutes.js`, `metricsRoutes.js` |
| Serializers | `api/src/v1/serializers.js`, metrics/dashboard services |
| Front API | `web/lib/apiV1.ts`, `web/lib/apiService.ts` |
| Specs | `api/specs/backend.endpoints.md`, `web/specs/*` |

---

### Task 0.1 — English metrics + dashboard routes

**Files:**
- Modify: `api/src/v1/routes/dashboardRoutes.js`
- Modify: `api/src/v1/routes/metricsRoutes.js`
- Modify: `api/src/v1/controllers/dashboardController.js` (rename `setores` → `sectors` export)
- Modify: `api/src/v1/controllers/metricsController.js`
- Modify: `api/src/v1/services/metricsService.js` (response keys EN)
- Modify: `api/src/v1/services/dashboardService.js` (`sectors` not `setores`)
- Modify: `api/src/v1/serializers.js` (EN-only response shape)
- Modify: `api/src/v1/controllers/orderController.js` (`photos` multipart)
- Modify: `web/lib/apiV1.ts`, `web/lib/apiService.ts`
- Modify: `api/specs/backend.endpoints.md`

- [ ] Map and rename PT paths listed in spec Onda 0
- [ ] Align JSON keys to English in serializers/services used by dashboard/metrics/orders list
- [ ] Update front callers; grep for old PT paths
- [ ] Smoke: `curl` new paths with auth; old PT paths 404
- [ ] Update endpoints spec

### Task 1.1 — Design tokens + fonts

**Files:**
- Modify: `web/app/globals.css`
- Modify: `web/app/layout.tsx`

- [ ] Add `--wq-*` tokens; wire `@theme` / shadcn vars to ink/brand/action/paper
- [ ] Load Plus Jakarta Sans + Fraunces (or Newsreader) + JetBrains Mono
- [ ] Verify login page still renders (visual check)

### Task 1.2 — AppShell components

**Files:**
- Create: `web/components/shell/AppSidebar.tsx`
- Create: `web/components/shell/AppHeader.tsx`
- Create: `web/components/shell/AppShell.tsx`
- Create: `web/app/(app)/layout.tsx`
- Move authenticated pages under `(app)` **or** wrap via existing layout — prefer route group without breaking URLs

- [ ] Sidebar sections + active state (brand soft)
- [ ] Header sticky + title slot + primary CTA slot
- [ ] User footer: name, shop, logout
- [ ] Role-gate Admin links

### Task 1.3 — Login + signup redesign

**Files:**
- Modify: `web/app/page.tsx`, `web/app/signup/page.tsx`

- [ ] Split-screen ink | form
- [ ] Teal primary CTA; lilás brand mark
- [ ] Keep existing auth logic (`loginV1` / signup)

### Task 1.4 — Wire shell to dashboard (first consumer)

**Files:**
- Modify: `web/app/dashboard/page.tsx` (strip local header; use shell)
- Modify: middleware if route groups change

- [ ] Dashboard loads inside AppShell
- [ ] Nav links work to existing routes

### Task 2.1 — Dashboard density

**Files:**
- Modify: `web/app/dashboard/page.tsx`
- Possibly: `web/components/dashboard/*`

- [ ] 4 KPIs + hot queue + sector summary + recent activity
- [ ] Remove quick-action card grid as primary nav

### Task 2.2 — Empresa pages

**Files:**
- Modify: `web/app/settings/setores/page.tsx`, `web/app/billing/page.tsx`
- Create: `web/app/settings/empresa/page.tsx` (shop current form)

- [ ] Visual shell alignment
- [ ] Dados page calls `GET/PATCH /shops/current`

### Task 3.1 — Kanban hybrid layout

**Files:**
- Modify: `web/app/kanban/page.tsx` (+ related components)

- [ ] Pipeline chips + active sector list
- [ ] Move via chip drop / prev-next
- [ ] Overview drawer; no required horizontal scroll

### Task 4.1 — Order flow alignment

**Files:**
- Modify: `web/app/pedidos/**`, `web/app/clientes/**`, `web/app/consultas/**`, `web/components/CardDetalhesPedido.tsx`

- [ ] Shared density/tokens; wizard novo pedido; lista `/pedidos`

### Task Doc — Close wave

- [ ] Update `web/specs/current-state.md`, `roadmap.md`, `api/specs` as needed
- [ ] Changelog note

---

## Execution order

0.1 → 1.1 → 1.2 → 1.3 → 1.4 → 2.* → 3.* → 4.* → Doc
