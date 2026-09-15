# Worqera — Modeling (Mongo)

**Atualizado:** 2026-09-14

DB único compartilhado; isolamento por `shopId` (não DB-per-tenant).

## Collections

### `shops`

```json
{
  "_id": "ObjectId",
  "name": "string",
  "slug": "string",
  "status": "active|suspended",
  "branding": {
    "displayName": "string",
    "emailFromName": "string",
    "legacyBrand": "casa-do-tenis|null"
  },
  "timezone": "America/Sao_Paulo",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

Índices: `slug` unique.

### `users`

```json
{
  "_id": "ObjectId",
  "email": "string",
  "passwordHash": "string",
  "name": "string",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

Índices: `email` unique.

### `memberships`

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "shopId": "ObjectId",
  "role": "owner|admin|atendimento|sector",
  "sectorIds": ["ObjectId"],
  "active": true,
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

Índices: `(userId, shopId)` unique; `(shopId, role)`.

`sectorIds` obrigatório / usado quando `role === "sector"`.

### `sectors`

```json
{
  "_id": "ObjectId",
  "shopId": "ObjectId",
  "name": "string",
  "slug": "string",
  "order": 1,
  "color": "#2196F3",
  "active": true,
  "isTerminal": false,
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

Índices: `(shopId, slug)` unique; `(shopId, order)`.

### `clients`

```json
{
  "_id": "ObjectId",
  "shopId": "ObjectId",
  "name": "string",
  "cpf": "string|null",
  "phone": "string|null",
  "email": "string|null",
  "address": {},
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

Índices: `(shopId, cpf)`; `(shopId, name)`.

### `orders` (pedidos)

Campos alinhados ao legado útil (`pedidoModel` + runtime):

```json
{
  "_id": "ObjectId",
  "shopId": "ObjectId",
  "code": "string",
  "clientId": "ObjectId",
  "clientName": "string",
  "clientPhone": "string|null",
  "clientEmail": "string|null",
  "shoeModel": "string",
  "services": [{ "id": "string", "name": "string", "price": 0 }],
  "accessories": [],
  "warranty": {},
  "pricing": {
    "total": 0,
    "deposit": 0,
    "remaining": 0,
    "expenses": 0
  },
  "photos": [{ "key": "string", "url": "string|null", "isCover": false }],
  "items": [
    {
      "_id": "ObjectId",
      "shoeModel": "string",
      "services": [{ "id": "string", "name": "string", "price": 0 }],
      "photos": [{ "key": "string", "url": "string|null", "isCover": false }],
      "notes": "string|null"
    }
  ],
  "currentSectorId": "ObjectId|null",
  "sectorPath": ["ObjectId"],
  "sectorHistory": [
    {
      "sectorId": "ObjectId",
      "enteredAt": "Date",
      "leftAt": "Date|null",
      "movedByUserId": "ObjectId",
      "employeeId": "ObjectId|null",
      "employeeName": "string|null",
      "note": "string|null"
    }
  ],
  "status": "open|in_progress|ready|delivered|cancelled",
  "priority": 1,
  "dueAt": "Date|null",
  "deliveredAt": "Date|null",
  "assigneeEmployeeId": "ObjectId|null",
  "pdfUrl": "string|null",
  "notes": "string|null",
  "createdByUserId": "ObjectId",
  "updatedByUserId": "ObjectId|null",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

Índices: `(shopId, code)` unique; `(shopId, currentSectorId)`; `(shopId, createdAt)`; `(shopId, dueAt)`; `(shopId, status)`.

**Espelho flat:** `shoeModel` / `services` / `photos` no documento = `items[0]` (legado). Create/PATCH aceitam `items[]` **ou** payload flat; se `items` vier preenchido, o primeiro item é copiado para os campos flat. Docs antigos sem `items` (ou `items: []`) continuam válidos — leitura (`effectiveItems`) sintetiza um item a partir do flat. Um pedido = um `code` = um card no kanban. Serialização sempre devolve `items` + `itemCount` (readers vazios ainda saem com 1 item sintetizado). `pricing.total` = soma dos serviços de **todos** os items, salvo total explícito no body.

### `service_catalog` (TOP-01)

```json
{
  "_id": "ObjectId",
  "shopId": "ObjectId",
  "name": "string",
  "defaultPrice": 0,
  "sectorPathHint": ["ObjectId"],
  "active": true,
  "sortOrder": 0
}
```

Índices: `(shopId, name)`.

### `subscriptions`

```json
{
  "_id": "ObjectId",
  "shopId": "ObjectId",
  "planCode": "WORQERA_PRO",
  "status": "trialing|active|past_due|canceled|expired",
  "provider": "AbacatePay|Manual|Dev",
  "trialEndsAt": "Date|null",
  "currentPeriodEnd": "Date|null",
  "providerCustomerId": "string|null",
  "providerSubscriptionId": "string|null",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

Índices: `shopId` unique (uma subscription corrente por shop no v1).

### `webhook_events` (idempotência)

```json
{
  "_id": "ObjectId",
  "provider": "AbacatePay",
  "eventId": "string",
  "type": "string",
  "processedAt": "Date",
  "payload": {}
}
```

Índices: `(provider, eventId)` unique.

### Opcionais v1.1+

- `employees` (funcionários de chão sem login)
- `email_logs`
- `order_counters` (sequência diária por shop)

## Seed Casa do Tênis

Shop `slug: casa-do-tenis`, `branding.legacyBrand: "casa-do-tenis"`, setores na ordem legada (Atendimento, Sapataria, Costura, Lavagem, Acabamento, Pintura, Atendimento final).
