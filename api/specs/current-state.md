# Worqera API — Estado atual

**Atualizado:** 2026-09-24 (editar item merge-safe · fotos por item · limite 10 · laudo)

## Em uma frase

API Mongo `/api/v1` multi-tenant: kanban **por item**, fotos em `items[i].photos` (união em `order.photos`), partida por item, **patch/add/delete item** sem apagar histórico de setor, soft-delete + purge, billing gate.

## LIVE

| Área | Endpoint |
|------|----------|
| Health | `GET /health` |
| Auth SaaS | `/api/v1/auth/*` (+ rate limit; `me.platformAdmin`) |
| Shop / members | `/shops/current` (+ vertical, itemLabel, starter kit) |
| Platform | `/platform/shops` list/get/patch (suspend, +trial) |
| Sectors / kanban | board + move; `showOnPublic`; e-mail on terminal |
| Orders | CRUD + `publicToken` + `whatsappSuggest` + e-mail create/ready |
| Alerts | inbox + **`GET /alerts/feedback`** (lista + summary) |
| Services / clients / employees | CRUD |
| Billing | `/billing/*` + webhook HMAC |
| Public / files | `/public/shops/:slug/orders/:code?t=` + feedback; `/files/*` |

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
