# Worqera API — Estado atual

**Atualizado:** 2026-09-14

## Em uma frase

API **híbrida**: legado Express + DynamoDB (rotas raiz) **e** alvo **`/api/v1`** Node long-running + Mongo multi-tenant (auth/shop/trial, setores, kanban, billing mock). CdT = seed `casa-do-tenis`.

**Inventário detalhado:** [feature-inventory.md](./feature-inventory.md)

## Onde estamos (mapa)

| Área | Status | Notas |
|------|--------|-------|
| Host Node + Mongo (`src/server.js`) | **LIVE local** | `make dev`; Lambda `handler.js` ainda aponta p/ mesmo app |
| Express `/api/v1` | **LIVE bootstrap** | Auth, shops, sectors, kanban, clients, orders, billing, public, services |
| Express domínio ops legado | **LIVE útil** | Rotas raiz Dynamo intactas |
| Auth JWT v1 | LIVE | bcrypt + trial 7d no signup; refresh body |
| Auth JWT legado | PARTIAL | Dynamo; register aberto |
| Clientes / Pedidos v1 | LIVE mínimo | Código `DDMMYY-SEQ` via `order_counters` |
| Kanban por setores | LIVE v1 | RBAC sector + move RF-KAN-06 |
| Setores CRUD / por shop | LIVE v1 | Soft-delete `active=false` |
| Shop / Trial / AbacatePay | LIVE mock | Checkout URL mock; webhook secret + idempotência |
| Seed CdT | LIVE | `npm run seed` |
| Specs | iniciado | Este diretório |

## Stack atual → alvo

| | Atual | Alvo |
|--|-------|------|
| Host | Lambda + serverless-http | Node Docker long-running |
| DB | DynamoDB (scans) | Mongo + `shopId` |
| Billing | — | AbacatePay |
| Kanban SoT | status strings + setores fixos | setores por shop |

## Riscos críticos

1. Senhas plaintext + secrets no `template.yaml`
2. Sem tenant
3. AuthZ cosmética
4. Scans DynamoDB
5. Brand CdT no core de e-mail/SMS
6. WhatsApp quebrado em runtime

## Próximo

1. Quick-wins QW-* (segurança/UX)  
2. A0 bootstrap  
Ver [roadmap.md](./roadmap.md).
