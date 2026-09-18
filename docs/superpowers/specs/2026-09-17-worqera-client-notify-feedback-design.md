# Worqera — Notificações cliente + reabrir + feedback

**Data:** 2026-09-17

## Situação atual (antes)

- Cliente **não** recebe e-mail no create/move/ready (v1).
- Só toast **WhatsApp wa.me** no move (manual).
- Reabrir já existia para `delivered`.
- Feedback/NPS: inexistente.

## Decisão

| Tema | Escolha |
|------|---------|
| Canal auto | **E-mail** (SMTP já existe). WA continua suggest. |
| Por coluna | `Sector.notifyEmailOnEnter` + master `notifications.email.enabled` |
| Terminal | `isTerminal` → status `ready` + e-mail “pronto” |
| Retrabalho | **Reabrir** mesmo código (`ready` ou `delivered`) — não criar outro pedido |
| Feedback | CSAT 1–5 na consulta pública quando `ready`/`delivered` |

## Fora

Meta Cloud API, SMS, push.
