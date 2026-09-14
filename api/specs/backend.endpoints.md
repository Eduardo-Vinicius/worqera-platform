# Worqera API — Endpoints

**Atualizado:** 2026-09-14  
**Base:** `/api/v1`  
Legenda: **PLANEJADO** (alvo pós-refatoração) · **LEGADO** = rotas atuais sem versionamento (Express raiz, DynamoDB)

> Contrato canônico do **alvo**. Enquanto A0–A2 não entregam, o front continua no LEGADO (`NEXT_PUBLIC_API_URL` apontando para o host atual).

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
GET  /billing/products               # PLANEJADO
POST /billing/checkout-sessions      # PLANEJADO — AbacatePay URL
POST /billing/dev/complete-checkout  # PLANEJADO — só Development
POST /webhooks/abacatepay            # PLANEJADO — raw body + secret + HMAC
GET  /billing/subscription           # PLANEJADO — subscription do shop atual
```

## Shops / members

```
GET  /shops/current                  # PLANEJADO
PATCH /shops/current                 # PLANEJADO — branding básico (admin/owner)
GET  /shops/current/members          # PLANEJADO
POST /shops/current/members          # PLANEJADO — convidar/criar user (admin)
PATCH /shops/current/members/{id}    # PLANEJADO — role / sectorIds
```

## Sectors (carro-chefe)

```
GET    /sectors                      # PLANEJADO — lista do shop
POST   /sectors                      # PLANEJADO — admin/owner
PATCH  /sectors/{id}                 # PLANEJADO
DELETE /sectors/{id}                 # PLANEJADO — soft (active=false) preferível
POST   /sectors/reorder              # PLANEJADO — body: [{id, order}]
```

## Kanban

```
GET  /kanban                         # PLANEJADO
     # admin/owner/atendimento: todas colunas (setores ativos) + cards
     # sector: só setores em membership.sectorIds
POST /kanban/orders/{orderId}/move   # PLANEJADO
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
GET    /orders                       # PLANEJADO — filtros shop-scoped
POST   /orders                       # PLANEJADO
GET    /orders/{id}                  # PLANEJADO
PATCH  /orders/{id}                  # PLANEJADO
POST   /orders/{id}/photos           # PLANEJADO
POST   /orders/{id}/pdf              # PLANEJADO
```

LEGADO: `/pedidos`, `/upload`, PDF em rotas antigas.

## Dashboard

```
GET /dashboard/summary               # PLANEJADO — contagens por setor, etc.
GET /metrics/...                     # PLANEJADO — admin/owner only
```

LEGADO: `/dashboard`, `/metrics` (JWT qualquer).

## Headers

| Header | Uso |
|--------|-----|
| `Authorization: Bearer …` | Access token |
| `X-Worqera-Shop` | Shop ativo (obrigatório se multi-membership) |
| `X-Correlation-Id` | Opcional; ecoado na resposta |

## Notas de migração

Front troca paths LEGADO → `/api/v1/...` por onda (ver `frontend-integration.md` e `web/specs`). Enquanto isso, não quebrar LEGADO em produção CdT sem plano de cutover.
