# Worqera Kanban Flow + Labels — Implementation Plan

> **For agentic workers:** Execute task-by-task. No commits unless user asks.

**Goal:** Shop-wide order codes (`0001`…), sticky create CTA, post-create label/QR page, `plannedSectorIds`, kanban detail drawer + off-path move with required note.

**Architecture:** API counter + Order.plannedSectorIds first; label page after create redirect; kanban drawer + move modal last.

**Tech Stack:** Express/Mongo, Next.js App Router, qrcode lib (or CDN-free `qrcode` npm in web).

## Global Constraints

- Spec: [2026-09-14-worqera-kanban-labels.md](../specs/2026-09-14-worqera-kanban-labels.md)
- No commits unless user asks
- UI pt-BR; API English
- Preserve hybrid kanban; do not rewrite old order codes

---

### Task A1: Shop-wide nextOrderCode

**Files:** Modify `api/src/v1/services/orderService.js` (`nextOrderCode`)

- [ ] Use `dayKey: "shop"` (reuse field) + `padStart(4,"0")`
- [ ] Smoke: call helper or create order

### Task A2: Sticky CTA on novo pedido

**Files:** Modify `web/app/(app)/pedidos/novo/page.tsx`

- [ ] Fixed bottom bar: total, sinal, submit Criar pedido
- [ ] `pb-24` on form so content not hidden

### Task B1: plannedSectorIds on Order + create

**Files:** `Order.js`, `orderService.js`, `serializers.js`, novo form payload

- [ ] Schema field `plannedSectorIds: [ObjectId]`
- [ ] Resolve from `departamentosSelecionados` / sector slugs on create
- [ ] Serialize plannedSectorIds (+ names if cheap)

### Task B2: Label page + redirect

**Files:** Create `web/app/(app)/pedidos/[id]/etiqueta/page.tsx`; modify novo submit redirect

- [ ] Load order; big code; QR to `/p/{code}`; print CSS
- [ ] Print pairs mode `{code}-{n}`
- [ ] After create → etiqueta (not kanban)

### Task C1: Kanban detail drawer

**Files:** `kanban/page.tsx`, possibly reuse CardDetalhesPedido / fetch order by id

- [ ] Click card opens drawer with plan chips + history

### Task C2: Off-path move modal

**Files:** `kanbanService.js` move note; `kanban/page.tsx` modal; `apiV1` move body

- [ ] If destination ∉ plannedSectorIds → require note
- [ ] Persist note on sectorHistory

### Task D: Docs

- [ ] Update api/web roadmap + current-state briefly
