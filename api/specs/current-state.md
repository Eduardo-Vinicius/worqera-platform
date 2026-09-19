# Worqera API — Estado atual

**Atualizado:** 2026-09-18 (Loop WA create + multi-vertical)

## Em uma frase

API Mongo `/api/v1` multi-tenant: signup+trial (`vertical: general`), members, kanban, **whatsappSuggest** em create/move, branding + itemLabel, platform admin, billing gate.

## LIVE

| Área | Endpoint |
|------|----------|
| Health | `GET /health` |
| Auth SaaS | `/api/v1/auth/*` (+ rate limit; `me.platformAdmin`) |
| Shop / members | `/shops/current` (+ vertical, itemLabel) |
| Platform | `/platform/shops` list/get/patch (suspend, +trial) |
| Sectors / kanban | board + move + `clientPhone` no card |
| Orders | CRUD + `whatsappSuggest` no create |
| Services / clients / employees | CRUD |
| Billing | `/billing/*` + webhook HMAC |
| Public / files | `/public/orders/:code`, `/files/*` |

## Env chave

`PLATFORM_ADMIN_EMAILS` · `WORQERA_AbacatePay__WebhookSecret` · `PUBLIC_WEB_URL` (links wa.me) · `ALLOW_INSECURE_WEBHOOK=1` só em dev

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
