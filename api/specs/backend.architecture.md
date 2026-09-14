# Worqera API — Arquitetura alvo

**Atualizado:** 2026-09-14

## Host

- Processo Node long-running (Kestrel-equivalente), **não** Lambda
- Docker image multi-stage; em prod atrás de reverse proxy
- Dev: Mongo (e opcional mail) via compose; API no host para iteração rápida
- `GET /health` — liveness
- Prefixo público: `/api/v1`

## Camadas

```
src/
  http/          # routes, middleware, validators de input
  application/   # use cases / services (authz de recurso aqui)
  domain/        # entidades, regras puras (setores, trial gate)
  infra/         # mongo, s3, abacatepay, email, jwt
  contracts/     # DTOs request/response (opcional pasta)
```

Regras:

- Routes não acessam Mongo direto
- Toda query operacional inclui `shopId` do contexto autenticado
- Erros: Problem Details + `code` estável + `correlationId`

## AuthZ

1. JWT válido  
2. Membership no shop do contexto  
3. Subscription `trialing|active` (exceto auth, billing, health, webhooks)  
4. Role / `sectorIds` para kanban e mutações  

Header: `X-Worqera-Shop: {shopId}` quando necessário.

## Segurança

- Argon2id ou bcrypt para senhas
- Secrets só em env (nunca no image / template commitado)
- Webhook AbacatePay: query secret + HMAC; `timingSafeEqual`; idempotência por `event.id`
- CORS allowlist em produção
- Não logar bodies com senha/tokens/PII sensível

## Billing

- Provider: **AbacatePay**
- Collection `subscriptions` por `shopId`
- Dev: endpoint de simulação para completar checkout sem provedor

## Mídia

- S3 (ou S3-compatible); keys `shops/{shopId}/...`

## Legado

Código atual em `api/src` (Dynamo/Lambda) permanece até migração por fase; novo host pode viver em `api/src` refatorado ou `api/server` — decisão no bootstrap A0 (preferir evoluir pastas sem dual-runtime longo).
