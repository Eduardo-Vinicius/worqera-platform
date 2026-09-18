# Worqera API — Roadmap

**Atualizado:** 2026-09-16 (metrics owner-only + plano ops)

Plano: [`../../docs/superpowers/plans/2026-09-16-worqera-next-session.md`](../../docs/superpowers/plans/2026-09-16-worqera-next-session.md)

## Norte

Node + Mongo multi-tenant. **Kanban por setores** = carro-chefe. Trial 7d + AbacatePay (**stub**). Casa do Tênis = seed/`legacyBrand`.

Inventário: [feature-inventory.md](./feature-inventory.md).

---

## Ops UX (ondas A–C)

- [x] Onda C — `Order.items[]` + espelho flat + fotos por item + `itemCount` no kanban
- [x] Kanban labels — `nextOrderCode` shop-wide (`0001`), `plannedSectorIds`, move off-path exige `note`
- Ondas A/B (shell, TVs, kanban polish): ver `web/specs/roadmap.md`

---

## Quick-wins

| # | ID | Status |
|---|-----|--------|
| 1 | QW-01…05 front (Toaster, `/pedidos`, logout, cookie, nav) | **feito** |
| 2 | QW-06,09–12 back (WA, upload, phone, e-mail, refresh role) | **feito** (v1) |
| 3 | QW-07 hash senha | **feito** (v1) |
| 4 | QW-08 gate metrics | **feito** (owner only — 2026-09-16) |
| 5 | QW-13 secrets template | **feito** (defaults vazios; CFN legado) |
| 6 | QW-14 e-mail audit | **feito** (corte `/emails` no web) |
| 7 | Paths/JSON EN (`/metrics/*`, serializers) | **feito** |

---

## Fases estruturais

### A0 — Bootstrap host — feito

### A1 — Identity + Shop — feito

- [x] users/shops/memberships, signup+trial, JWT+shop, seed CdT
- [x] Refresh token usable from web (auto on 401)
- [x] QW-13 template sem secrets commitados
- [x] Rate limit signup/login; 1 e-mail = 1 user (signup conflict)
- [x] Platform admin allowlist + `/api/v1/platform/shops`

### A2 — Setores + Kanban — feito (API)

- [x] CRUD setores, kanban, move
- [x] Conta `role: sector` — board filter + **blind forward** (qualquer destino; auditoria)

### A3 — Conta setor — feito (API)

- [x] Members CRUD: `admin|atendimento|sector` + `sectorIds`; owner protegido

### A4 — Ops Mongo — feito (base)

- [x] clients, orders, photos, PDF, metrics, employees, public order, services catalog
- [x] `Order.items[]` (multi-par) + espelho flat `shoeModel`/`services`/`photos` = `items[0]`
- [x] `POST /orders/:id/items/:itemIndex/photos` (legado `/photos` = item 0, append)
- [x] Warranty end date (+3m) no create se ativa sem `data`
- [x] `listOrders` filter `clientId`
- [ ] E-mail/WhatsApp auto v1
- [x] Seed catálogo serviços (ensure no seed CdT)

### A5 — Billing — harden (stub checkout)

- [x] products, checkout mock (`mock: !apiKey`), webhook HMAC + fail-closed secret
- [x] AbacatePay `POST /subscriptions/create` quando ApiKey + ProductId
- [ ] E-mail reset senha via SES (hoje token em dev response)

## Ordem restante

Smoke PRD pós-rebuild → cron trial reminders + mongo backup → WhatsApp auto / digest semanal

---

## Quick-wins API (status 2026-09-17)

| ID | Item | Status |
|----|------|--------|
| QW-API-01 | `GET /health` + `/health/ready` | **feito** |
| QW-API-02 | Log JSON request | **feito** |
| QW-API-03 | Correlation id (já existia) + logs | **feito** |
| QW-API-04 | Docker healthcheck | **já existia** |
| QW-API-05 | `mongodump` script | **feito** (`scripts/mongo-backup.sh`) |
| QW-API-06 | E-mail recibo AbacatePay | **já existia** (webhook active) |
| QW-API-07 | E-mail trial D-2 / D-0 | **feito** (`scripts/send-trial-reminders.js`) |
| QW-API-08 | Export CSV delivered | **feito** |
| QW-API-09 | Digest semanal owner | **feito** |
| QW-API-10 | Sentry API | backlog |

## Propostas backend (trimestre)

- **Audit log** platform admin (suspend shop, extend trial)  
- **Rate limit** consulta pública `/public/orders` anti-scrape  
- **Webhook retry** AbacatePay idempotente (dedupe event id)  
- **Soft delete** shop vs hard delete (LGPD export antes)  
- Unificar metrics legado `src/routes` → só v1
