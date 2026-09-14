# Worqera Web — Integração API (browser)

**Atualizado:** 2026-09-14

Contrato HTTP: [`../../api/specs/backend.endpoints.md`](../../api/specs/backend.endpoints.md).

## Env

| Var | Uso |
|-----|-----|
| `NEXT_PUBLIC_API_URL` | Base da API (sem trailing slash) |
| `NEXT_PUBLIC_APP_NAME` | Nome na UI |
| `NEXT_PUBLIC_MAX_PHOTOS` | Limite upload |

## Client

- Prefixo alvo: `{API}/api/v1`
- Enviar `Authorization` + opcional `X-Worqera-Shop`
- Em `402/403` com `code=SUBSCRIPTION_INACTIVE` → router `/billing`
- Em `403` `FORBIDDEN_SECTOR` → toast + refresh board

## Fluxos críticos

### Signup → portal

`POST /auth/signup` → tokens → `/dashboard` ou `/kanban` com banner trial.

### Kanban

1. `GET /sectors` (admin settings) / `GET /kanban` (board)
2. Move: `POST /kanban/orders/{id}/move` `{ toSectorId }`
3. Optimistic UI opcional; rollback em erro

### Billing

1. `GET /billing/subscription` + `GET /billing/products`
2. `POST /billing/checkout-sessions` → redirect URL AbacatePay
3. Volta ao app → `auth/me` / subscription active

## LEGADO (transição)

Enquanto A2 não live, `apiService.ts` mantém paths `/pedidos`, `/clientes`, etc. Feature flags ou dual client por onda — evitar big-bang no front da CdT em produção.
