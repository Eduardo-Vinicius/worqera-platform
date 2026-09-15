# Worqera Web — Integração API (browser)

**Atualizado:** 2026-09-14 (Ops UX Onda C)

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
2. `POST /billing/checkout-sessions` → redirect URL AbacatePay (**stub**/dev hoje)
3. Volta ao app → `auth/me` / subscription active

### Pedidos (create + fotos)

1. `POST /orders` com `items[]` (`shoeModel`, `services[{id?, name, price}]`, `notes?`) **ou** payload flat legado.
2. Response: `items` + `itemCount` + espelho flat de `items[0]`. Um `code` por pedido. `pricing.total` = soma dos serviços de todos os items (salvo total explícito).
3. Fotos: `POST /orders/{id}/items/{itemIndex}/photos` (multipart field `photos`). Legado `POST /orders/{id}/photos` = item 0 (append). Índice inválido → 400.
4. Front: `createPedidoService({ items })`; se `items` vier e o flat estiver vazio, o client também manda espelho de `[0]`. Depois `uploadPedidoItemFotosService(id, index, files)` por par com arquivos. `uploadPedidoFotosService` permanece (item 0).
5. `adaptOrder` sempre expõe `items`/`itemCount` (sintetiza 1 item se o payload for só flat) e espelha `items[0].shoeModel` em `shoeModel`/`modeloTenis`.

### LEGADO (transição)

`apiService.ts` já chama `{API}/api/v1` (EN). `adapters.ts` ainda devolve aliases PT para a UI. Sem dual client Dynamo.
