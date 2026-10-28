# Worqera API — Estado atual

**Atualizado:** 2026-10-28 ("Aberto por" e métricas de atendimento; recuperação de orçamento com análise; repor estoque com prazo do fornecedor; conferir prontos)

## Em uma frase

API Mongo `/api/v1` multi-tenant: kanban **por item**, fotos em `items[i].photos` (união em `order.photos`), partida por item, **patch/add/delete item** sem apagar histórico de setor, soft-delete + purge, billing gate.

## LIVE

| Área | Endpoint |
|------|----------|
| Health | `GET /health` |
| Auth SaaS | `/api/v1/auth/*` (+ rate limit por visitante, inclusive refresh; `me.platformAdmin`; logout só limpa o cliente atual; troca de senha invalida os tokens). Fora de `/api/v1` e `/health` a resposta é 404 e não entra no painel. Erro 500 na resposta é genérico; o painel guarda o texto real. |
| Shop / members | `/shops/current` (+ vertical, itemLabel, starter kit) |
| Platform | `/platform/shops` list/get/patch (suspend, +trial) |
| Sectors / kanban | board + move; `showOnPublic`; e-mail on terminal |
| Orders | CRUD + `publicToken` + `whatsappSuggest` + e-mail create/ready. Com `photoCounts`, o e-mail espera o upload de cada item |
| Alerts | inbox + `POST /alerts/inbox/read` + **`GET /alerts/feedback`** (lista + summary, `serviceAvg`, `?openedBy=`) |
| Services / clients / employees | CRUD. Funcionário `attends` = aparece em "Aberto por" (`Order.openedByEmployeeId/openedByName`); `GET /metrics/attendance` |
| Products | `/products` CRUD, ajuste e `/products/summary`. Dono e admin da oficina. Item `origin=stock` reserva, baixa na entrega e estorna no cancelamento. `leadTimeDays` + `/products/restock` (hora de pedir, a caminho, atrasado) |
| Quotes | `/quotes` funil (novo, contato, retorno, recuperado, perdido) + `POST /orders/:id/refuse-quote`. Prioridade no servidor; texto de WhatsApp por modelo ou IA (`OPENAI_API_KEY`). `win` grava `recovery` e `Order.recovered`; `GET /quotes/recovered` |
| IA | `aiService` (chave, modelo, custo, `AiUsage`, teto) + `/dashboard/brief`, `/metrics/insights`, `customer-summary`, `reply-suggest`. Só Business |
| WhatsApp oficial | `/whatsapp`, `/webhooks/whatsapp`, `WhatsAppMessage`. Inerte sem `META_*`. Ver [ia-e-whatsapp-setup](../../docs/ops/ia-e-whatsapp-setup.md) |
| Billing | `/billing/*` + webhook HMAC. Catálogo Basic 9700 · Pro 19700 · Business 69700 centavos (fundador 49900 por 12 meses). Criar pedido no `WORQERA_BASIC` recusa a partir do 101º do mês (America/Sao_Paulo) |
| Public / files | `/public/track/:token` (URL `/p/o/{token}`); antigo `/public/shops/:slug/orders/:code?t=` segue; `/files/*` |

## Env chave

`PLATFORM_ADMIN_EMAILS` · `OPENAI_API_KEY` (IA do Business; `WORQERA_AI_MODEL` padrão `gpt-6-luna`, `WORQERA_AI_MODEL_DEEP` `gpt-5.6-terra`) · `META_APP_ID` / `META_APP_SECRET` / `META_WA_CONFIG_ID` / `META_WEBHOOK_VERIFY_TOKEN` / `WHATSAPP_TOKEN_KEY` (WhatsApp oficial) · `WORQERA_AbacatePay__WebhookSecret` · `PUBLIC_WEB_URL` (links wa.me/e-mail) · SMTP `WORQERA_Email__*` · `ALLOW_INSECURE_WEBHOOK=1` só em dev

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
