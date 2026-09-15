# Worqera API — Estado atual

**Atualizado:** 2026-09-15 (carga CdT + consultas paginadas)

## Em uma frase

API Mongo `/api/v1` multi-tenant: signup+trial, members com roles, kanban por setor, **platform admin**, billing gate, scripts de import histórico CdT (`delivered` / códigos legacy).

## LIVE

| Área | Endpoint |
|------|----------|
| Health | `GET /health` |
| Auth SaaS | `/api/v1/auth/*` (+ rate limit; `me.platformAdmin`) |
| Shop / members | `/shops/current`, `/shops/current/members` |
| Platform | `/platform/shops` list/get/patch (suspend, +trial) |
| Sectors / kanban | filter + move para `role:sector` |
| Services / clients / orders / employees | CRUD |
| Billing | `/billing/*` + webhook HMAC |
| Public / files | `/public/orders/:code`, `/files/*` |

## Env chave

`PLATFORM_ADMIN_EMAILS` · `WORQERA_AbacatePay__WebhookSecret` · `ALLOW_INSECURE_WEBHOOK=1` só em dev

## Como rodar

```bash
make api-dev
make api-seed   # opcional
make web-dev
```

## Próximo

- AbacatePay create-session produção
- Invite branding (Fase 3)
- ZIP fotos todos items; limpar legado Dynamo
