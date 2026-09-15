# Worqera Quick-wins Pack — Implementation Plan

> **For agentic workers:** Execute task-by-task. No commits unless user asks.

**Goal:** Ship high-ROI quick wins: cut dead emails, services CRUD UI, kanban shortcuts, API sectors in ops UI, warranty end date + pedidos filter.

**Architecture:** Web-first against existing `/api/v1` services/sectors/orders. Pure helpers for warranty date + shortcut eligibility; thin pages following AppShell patterns.

**Tech Stack:** Next.js App Router, existing `apiV1` / `apiService`, Express Mongo v1 unchanged except warranty date on create if missing.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-14-worqera-qw-pack.md`
- No commits unless user asks
- UI pt-BR; API English keys
- Preserve kanban hybrid UX

---

### Task 1: Cut emails (QW-14)

**Files:**
- Delete: `web/app/(app)/emails/page.tsx`
- Modify: `web/middleware.ts` (remove `/emails` from HIDDEN)
- Modify: `web/lib/apiService.ts` (remove email log helpers)
- Docs later in Task 6

- [ ] Remove page + middleware entry + dead client helpers
- [ ] Grep confirms no remaining `/emails` nav links

### Task 2: Services CRUD UI (TOP-01)

**Files:**
- Create: `web/app/(app)/settings/servicos/page.tsx`
- Modify: `web/lib/apiV1.ts` — `createServiceV1`, `patchServiceV1`, `deleteServiceV1`
- Modify: `web/components/shell/nav.ts` — item Serviços under Empresa

- [ ] CRUD list: name, defaultPrice, active toggle; soft-delete
- [ ] Match visual language of `/settings/setores`

### Task 3: Kanban shortcuts (TOP-09)

**Files:**
- Create: `web/lib/kanbanShortcuts.ts` (+ test)
- Modify: `web/app/(app)/kanban/page.tsx`

Shortcuts (when not in input/textarea/select/contenteditable and no modal open):
- `/` focus search if present, else no-op
- `j` / `k` move focus among cards in active column
- `1`–`9` switch active column
- `Enter` open detail for focused card
- `n` advance to next sector (planned or board order)

- [ ] Unit test helper `shouldIgnoreShortcut(target)`
- [ ] Wire keydown on kanban page; small hint in header

### Task 4: Sectors from API

**Files:**
- Modify: `web/app/(app)/funcionarios/page.tsx`
- Modify: `web/app/(app)/consultas/page.tsx`
- Modify: `web/components/SetorProgress.tsx`
- Optionally shrink `web/lib/setores.ts` to thin color fallback

- [ ] Funcionários options from `listSectorsV1`
- [ ] Consultas / SetorProgress resolve names/colors from sector map when available

### Task 5: Warranty date + filter (TOP-08)

**Files:**
- Create: `web/lib/warranty.ts` (+ test)
- Modify: `web/app/(app)/pedidos/novo/page.tsx` — set `garantia.data` ISO date +3 months when active
- Modify: `api/src/v1/services/orderService.js` — if warranty.active and no date, set +3 months server-side
- Modify: `web/app/(app)/pedidos/page.tsx` — filter chips

- [ ] Helper `warrantyEndDate(from = new Date(), months = 3)`
- [ ] Filters: all | with warranty | expiring in 30d (client-side on loaded list)

### Task 6: Docs

**Files:** api/web `roadmap.md`, `backlog.md`, `change-log.md`, `current-state.md`, `feature-inventory.md`

- [ ] Mark QW-13/14 done; TOP-01/08/09 partial/done; sync stale backlog rows
