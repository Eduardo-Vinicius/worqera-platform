# Worqera API — Endpoints

**Atualizado:** 2026-09-14 (Ops UX Onda C)  
**Base:** `/api/v1`  
Legenda: **LIVE** = runtime Mongo · **PLANEJADO** = ainda não no host · **LEGADO** = aliases PT / rotas antigas

> Contrato canônico **live** em `/api/v1`. Front: `web/lib/apiService.ts` + `adapters.ts` (aliases PT). Health, auth SaaS, shop/sectors/kanban, clients/orders = **LIVE**. Billing AbacatePay ainda é **stub**.

## Erros (alvo)

Problem Details:

```json
{
  "type": "about:blank",
  "title": "string",
  "status": 400,
  "detail": "string",
  "code": "SHOP_REQUIRED|SUBSCRIPTION_INACTIVE|FORBIDDEN_SECTOR|…",
  "correlationId": "uuid"
}
```

| code | HTTP | Quando |
|------|------|--------|
| `UNAUTHORIZED` | 401 | Sem JWT / inválido |
| `FORBIDDEN` | 403 | Role insuficiente |
| `FORBIDDEN_SECTOR` | 403 | Conta de setor fora do permitido |
| `SUBSCRIPTION_INACTIVE` | 402 ou 403 | Trial expirado / sem assinatura |
| `SHOP_REQUIRED` | 400 | Falta contexto de shop |
| `NOT_FOUND` | 404 | Recurso inexistente no shop |
| `VALIDATION_ERROR` | 400 | Input inválido |
| `CONFLICT` | 409 | Slug/código duplicado |

## Health

```
GET /health                          # PLANEJADO — liveness
```

## Auth

```
POST /auth/signup                    # PLANEJADO — shop + owner + trial
POST /auth/login                     # PLANEJADO
POST /auth/refresh                   # PLANEJADO — cookie HttpOnly
POST /auth/logout                    # PLANEJADO
GET  /auth/me                        # PLANEJADO — user + memberships + subscription summary
```

LEGADO: `POST /auth/login`, `POST /auth/register`, `POST /auth/refresh-token` (sem shop/trial).

## Billing

```
GET  /billing/products               # LIVE
POST /billing/checkout-sessions      # LIVE — mock URL se sem API key
POST /billing/dev/complete-checkout  # LIVE — só Development
POST /webhooks/abacatepay            # LIVE — raw body + secret + HMAC (fail-closed)
GET  /billing/subscription           # LIVE — subscription do shop atual
```

## Shops / members

```
GET  /shops/current                  # LIVE
PATCH /shops/current                 # LIVE — branding básico (admin/owner)
GET  /shops/current/members          # LIVE
POST /shops/current/members          # LIVE — criar user/membership (admin/owner)
PATCH /shops/current/members/{id}    # LIVE — role / sectorIds / active
```

## Platform (Worqera allowlist)

```
GET   /platform/shops                # LIVE — list + search
GET   /platform/shops/{id}           # LIVE
PATCH /platform/shops/{id}           # LIVE — status, extendTrialDays, subscriptionStatus
```

## Sectors (carro-chefe)

```
GET    /sectors                      # LIVE — lista do shop
POST   /sectors                      # LIVE — admin/owner
PATCH  /sectors/{id}                 # LIVE
DELETE /sectors/{id}                 # LIVE — soft (active=false) preferível
POST   /sectors/reorder              # LIVE — body: [{id, order}]
```

## Kanban

```
GET  /kanban                         # LIVE
     # admin/owner/atendimento: todas colunas (setores ativos) + cards
     # sector: só setores em membership.sectorIds
POST /kanban/orders/{orderId}/move   # LIVE
     # body: { toSectorId, note? }
     # authz: admin → any; sector → regra RF-SEC-06
```

## Clients

```
GET    /clients                      # PLANEJADO
POST   /clients                      # PLANEJADO
GET    /clients/{id}                 # PLANEJADO
PATCH  /clients/{id}                 # PLANEJADO
DELETE /clients/{id}                 # PLANEJADO
```

LEGADO: `/clientes`.

## Orders

```
GET    /orders                       # LIVE — shop-scoped; cada row: items + itemCount + flat
POST   /orders                       # LIVE — body items[] ou flat (shoeModel/services/photos)
GET    /orders/{id}                  # LIVE
PATCH  /orders/{id}                  # LIVE — scalars + opcional itemPatches[]; items[] wholesale → 400 USE_ITEM_ENDPOINTS
PATCH  /orders/{id}/items/{itemIndex} # LIVE — merge (preserva id/fotos/setor/histórico); delivered → 400
POST   /orders/{id}/items            # LIVE — novo par (bootstrap partida); delivered → 400
DELETE /orders/{id}/items/{itemIndex} # LIVE — remove par (mín. 1); delivered → 400
POST   /orders/{id}/photos           # LIVE — item 0 (legado); multipart field photos; append
POST   /orders/{id}/items/{itemIndex}/photos  # LIVE — append em items[itemIndex]; índice inválido → 400
DELETE /orders/{id}/items/{itemIndex}/photos/{photoIndex}  # LIVE
POST   /orders/{id}/pdf              # LIVE
GET    /orders/{id}/photos/zip       # LIVE — ainda só flat photos (item 0)
```

Create `items[]` (opcional): `{ shoeModel, services[{id?, name, price}], notes? }`. Aliases PT (`modeloTenis`, `servicos`, `preco`, `fotos`, `observacoes`) aceitos. Sem `items`, o service sintetiza 1 item a partir do flat. Um `code` por pedido; `pricing.total` default = soma de todos os items.

LEGADO: `/pedidos`, `/upload`, PDF em rotas antigas.

## Dashboard

```
GET /dashboard                       # LIVE — KPIs + recent orders
GET /dashboard/summary               # LIVE
GET /dashboard/sectors               # LIVE — counts by sector (+ ?includeOrders=true)
```

## Metrics (owner/admin)

```
GET /metrics/departments
GET /metrics/employees
GET /metrics/employees/performance
GET /metrics/delays
GET /metrics/summary
GET /metrics/finance
GET /metrics/overview
```

Query (EN): `period`, `startDate`, `endDate`, `limit`, `servicesLimit`  
(aliases PT ainda aceitos uma vez: `periodo`, `dataInicio`, `dataFim`, `limitServicos`)

## Público (TOP-02)

```
GET /public/orders/{code}            # LIVE — status resumido sem auth
```

## Catálogo (TOP-01)

```
GET/POST /services                   # LIVE
PATCH/DELETE /services/{id}          # LIVE
```

## Headers

| Header | Uso |
|--------|-----|
| `Authorization: Bearer …` | Access token |
| `X-Worqera-Shop` | Shop ativo (obrigatório se multi-membership) |
| `X-Correlation-Id` | Opcional; ecoado na resposta |

## Notas

- Contrato JSON em **inglês** (`code`, `photos`, `sectors`, `items`, …). Front usa `web/lib/adapters.ts` enquanto a UI migra.
- Upload: multipart field `photos` (aceita `fotos` legado). Cap 8 arquivos **por request** (não por item).
- `POST /orders/:id/photos` → `uploadItemPhotos(..., 0)`: append em `items[0]` e espelha flat `photos`.
- `POST /orders/:id/items/:itemIndex/photos`: append em `items[itemIndex]`; se `items` vazio, hidrata do flat antes do índice; `idx === 0` também espelha flat. Índice inválido → 400.
- `GET` order: `items` via `effectiveItems` + `itemCount`; `items[].photos` = URLs (strings). Upload response ainda devolve objetos `{ key, url, isCover }` no item.
- Inventário legado: [feature-inventory.md](./feature-inventory.md).
