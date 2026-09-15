# Worqera Quick-wins Pack — Design

**Date:** 2026-09-14  
**Status:** Approved (chat)  
**Scope:** Significant remaining QWs / near-QWs (package 1)

## Decisions

- **QW-14:** Cut `/emails` (page dead; v1 API has no email log routes)
- **QW-13:** Mark done — `template.yaml` already empty defaults / NoEcho; CFN legacy
- **Out of scope:** AbacatePay, sector accounts, WhatsApp auto, pedido rápido, HttpOnly refresh

## Deliverables

1. **Cut emails** — remove page, middleware hide, dead `apiService` email helpers
2. **TOP-01** — `/settings/servicos` CRUD UI against existing `/api/v1/services`
3. **TOP-09** — kanban keyboard shortcuts (focus-aware; ignore when typing/modal)
4. **Sectors from API** — funcionarios + consultas + `SetorProgress` stop relying on hardcoded `lib/setores` as options/labels
5. **TOP-08** — on create with warranty active, set end date (+3 months); `/pedidos` filter Com garantia / Vencendo 30d

## Non-goals

No new email API. No rewrite of kanban board. No auth cookie refresh loop.
