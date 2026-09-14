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

```json
{
  "_id": "ObjectId",
  "shopId": "ObjectId",
  "code": "string",
  "clientId": "ObjectId",
  "clientName": "string",
  "clientPhone": "string|null",
  "services": [],
  "pricing": {},
  "photos": [],
  "currentSectorId": "ObjectId|null",
  "sectorHistory": [
    {
      "sectorId": "ObjectId",
      "enteredAt": "Date",
      "leftAt": "Date|null",
      "movedByUserId": "ObjectId",
      "note": "string|null"
    }
  ],
  "status": "open|in_progress|ready|delivered|cancelled",
  "priority": "normal|high",
  "pdfUrl": "string|null",
  "createdByUserId": "ObjectId",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

Índices: `(shopId, code)` unique; `(shopId, currentSectorId)`; `(shopId, createdAt)`.

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
