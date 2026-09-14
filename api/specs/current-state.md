# Worqera API — Estado atual

**Atualizado:** 2026-09-14

## Em uma frase

API **legado** Express + `serverless-http` + DynamoDB (single-shop, Lambda). Alvo: API Node hospedada + Mongo multi-tenant + trial/AbacatePay + kanban por setores configuráveis.

## Onde estamos (mapa)

| Área | Status | Notas |
|------|--------|-------|
| Host Lambda + SAM (`template.yaml`) | **legado** | Substituir por processo contínuo + Docker |
| Express routes (clientes, pedidos, auth, …) | **legado / útil** | Domínio reaproveitável na API nova |
| DynamoDB + scans | **legado** | Migrar para Mongo com `shopId` |
| Auth JWT | **parcial** | Senha em texto; register aberto; RBAC fraco |
| Setores | **hardcoded** | `SETORES_PADRAO` em código |
| Kanban status | **live no legado** | Mistura status + setores |
| PDF / S3 / e-mail / WhatsApp / SMS | **live no legado** | Branding Casa do Tênis hardcoded em e-mail/SMS |
| Dashboard / metrics | **live no legado** | Scans; metrics API sem gate admin real |
| Multi-tenant / Shop | **ausente** | |
| Trial 7d | **ausente** | |
| AbacatePay | **ausente** | |
| Specs canônicos | **iniciado** | Este diretório |
| API `/api/v1` hospedada + Mongo | **PLANEJADO** | Ver roadmap |

## Stack atual (legado)

- Node + Express + `serverless-http`
- DynamoDB (`aws-sdk` v2), S3
- JWT (`jsonwebtoken`)
- Deploy: CloudFormation / GitHub Actions em `api/.github`

## Stack alvo

- Node (Express ou Fastify) long-running
- MongoDB
- S3 (ou compatível) para mídia
- AbacatePay (billing)
- Docker + compose (dev: Mongo; prod: API+Mongo)
- Prefixo env `WORQERA_` (a definir no bootstrap)

## Riscos críticos do legado

1. Senhas plaintext + secrets em IaC
2. Sem `shopId` / isolamento
3. Autorização cosmética
4. Scans DynamoDB
5. Branding CdT no core de notificação

## Próximo

Começar **A0** (bootstrap API hospedada + health + Mongo) — ver [roadmap.md](./roadmap.md).
