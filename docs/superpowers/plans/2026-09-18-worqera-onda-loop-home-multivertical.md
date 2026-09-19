# Worqera Onda Loop + Home + Multi-vertical — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or subagent-driven) to implement this plan task-by-task.

**Goal:** Entregar Loop do Cliente (A), home profissional, tour/checklist do loop, fluidez de cadastro/consulta, e base multi-vertical por empresa.

**Architecture:** Colar UX em cima de wa.me + consulta + etiqueta existentes. Introduzir `Shop.vertical` + `itemLabel*` e um helper de copy no web. Sem Cloud API.

**Tech Stack:** Next.js (`web/`), Express/Mongo (`api/`), sonner toasts, `web/lib/whatsapp.ts`.

---

### Task 1: API — create WA suggest + Shop vertical/itemLabel

**Files:**
- Modify: `api/src/v1/services/whatsappSuggest.js`
- Modify: `api/src/v1/controllers` order create path
- Modify: `api/src/v1/models/Shop.js`
- Modify: `api/src/v1/services/shopService.js` (patch allowlist)
- Modify: `api/src/v1/services/authService.js` (defaults general)

### Task 2: Web — etiqueta “Avisar no Zap” (created)

**Files:**
- Modify: `web/app/(app)/pedidos/[id]/etiqueta/page.tsx`
- Modify: `web/lib/whatsapp.ts` if needed
- Modify: create order response typing in `web/lib/apiV1.ts`

### Task 3: Web — sticky “Avisar pronto” + drawer templates

**Files:**
- Modify: `web/app/(app)/kanban/page.tsx`
- Modify: `web/components/CardDetalhesPedido.tsx`
- Modify: `web/components/PedidoConsultaDetalhe.tsx`
- Modify: `web/components/shell/FeedbackBell.tsx` (optional one-click)

### Task 4: Checklist = Loop tour + Dashboard home

**Files:**
- Modify: `web/components/shell/SetupChecklist.tsx`
- Modify: `web/app/(app)/dashboard/page.tsx`

### Task 5: Multi-vertical copy helper + neutralize UI

**Files:**
- Create: `web/lib/itemNoun.ts`
- Modify: pedido novo, CardDetalhes, consulta, pública, etiqueta fallbacks
- Modify: `web/app/(app)/settings/empresa/page.tsx` — editar itemLabel + vertical
- Modify: orderItems validation messages to use noun

### Task 6: Docs

**Files:**
- Modify: `web/specs/roadmap.md`, `change-log.md`, `current-state.md`
- Modify: `api/specs/*` equivalents
- Update: `docs/superpowers/plans/2026-09-18-worqera-loop-cliente-scale-10k.md` status

### Task 7: Verticais candidatas (doc only) + stub “plano do app”

**Files:**
- Create: `docs/superpowers/specs/2026-09-18-worqera-verticais-candidatas.md`
- Create: `docs/superpowers/specs/2026-09-18-worqera-app-nativo-brief.md` (brief para sessão futura)
