# Worqera API — Estado atual

**Atualizado:** 2026-09-14 (cutover Mongo)

## Em uma frase

API **somente Mongo** em `/api/v1` (Node hospedado). Rotas Dynamo legado **desmontadas**. Storage local em `uploads/` (S3 opcional).

## LIVE

| Área | Endpoint |
|------|----------|
| Health | `GET /health` |
| Auth SaaS | `/api/v1/auth/*` signup/login/me + trial 7d |
| Shop / members / sectors / kanban | `/api/v1/...` |
| Clients / orders / employees | CRUD Mongo |
| Fotos / PDF / ZIP | `POST/GET /orders/:id/photos`, `/pdf`, `/photos/zip` |
| Dashboard / metrics / sector stats | `/dashboard`, `/metrics/*`, `/sectors/stats` |
| Billing stub AbacatePay | `/billing/*`, webhook |
| Public order | `/public/orders/:code` |
| Files | `/files/*` |

## Front

`web/lib/apiService.ts` aponta para `${API}/api/v1`. `/status` redireciona para `/kanban`.

## Como rodar

```bash
make api-dev
make api-seed   # opcional
make web-dev
```

Deixe `S3_BUCKET_NAME` vazio no `.env` para disco local.

## Próximo

- AbacatePay produção
- UI membership role `sector`
- Migrar dados históricos CdT (se houver dump Dynamo) → Mongo
- Remover código morto legado Dynamo quando estável
