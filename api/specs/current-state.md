# Worqera API — Estado atual

**Atualizado:** 2026-09-19 (e-mail PDF + link + CSAT)

## Em uma frase

API Mongo `/api/v1` multi-tenant: signup+trial (`vertical: general`), members, kanban, **whatsappSuggest** em create/move, **orderNotify** (create=PDF+link; ready=avaliar), branding + itemLabel, platform admin, billing gate.

## LIVE

| Área | Endpoint |
|------|----------|
| Health | `GET /health` |
| Auth SaaS | `/api/v1/auth/*` (+ rate limit; `me.platformAdmin`) |
| Shop / members | `/shops/current` (+ vertical, itemLabel, starter kit) |
| Platform | `/platform/shops` list/get/patch (suspend, +trial) |
| Sectors / kanban | board + move + `clientPhone` no card; e-mail on terminal |
| Orders | CRUD + `whatsappSuggest` + e-mail create (PDF) / ready (CSAT) |
| Services / clients / employees | CRUD |
| Billing | `/billing/*` + webhook HMAC |
| Public / files | `/public/orders/:code` + feedback; `/files/*` |

## Env chave

`PLATFORM_ADMIN_EMAILS` · `WORQERA_AbacatePay__WebhookSecret` · `PUBLIC_WEB_URL` (links wa.me/e-mail) · SMTP `WORQERA_Email__*` · `ALLOW_INSECURE_WEBHOOK=1` só em dev

## Como rodar

```bash
make api-dev
make api-seed   # opcional
make web-dev
```

## Próximo

- AbacatePay create-session produção
- WhatsApp Cloud (fase 2)
- Limpar legado Dynamo
