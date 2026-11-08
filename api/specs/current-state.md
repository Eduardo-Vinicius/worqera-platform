# Worqera API — Estado atual

**Atualizado:** 2026-11-08 (recorte da fila no GET /kanban?focus=; KPIs por card)

## Em uma frase

API Mongo `/api/v1` multi-tenant: kanban **por item**, fotos em `items[i].photos` (união em `order.photos`), partida por item, **patch/add/delete item** sem apagar histórico de setor, soft-delete + purge, billing gate.

## LIVE

| Área | Endpoint |
|------|----------|
| Health | `GET /health` |
| Auth SaaS | `/api/v1/auth/*` (+ `POST /auth/apple`, `DELETE /auth/account`; rate limit por visitante, inclusive refresh; `me.platformAdmin`; logout só limpa o cliente atual; troca de senha invalida os tokens). Fora de `/api/v1` e `/health` a resposta é 404 e não entra no painel. Erro 500 na resposta é genérico; o painel guarda o texto real. |
| Shop / members | `/shops/current` (+ vertical, itemLabel, starter kit) |
| Platform | `/platform/shops` list/get/patch (suspend, +trial); painel: `/platform/overview`, `/platform/metrics/tech\|business\|product`, `/platform/insights`, `/platform/queues`, `/platform/analytics/*`, `/platform/shops-health`, `/platform/accounts[/:id]`, `/platform/emails` (todos os e-mails, 30 dias). Coleta em `metricbuckets`, `activeaccounts`, `errorsamples`, `securityevents` (TTL). Ver [admin-metrics](admin-metrics.md) |
| Sectors / kanban | board + move; `GET /kanban?focus=late\|ready\|due-today\|due-tomorrow`; `siblings[]` no card; `showOnPublic`; e-mail on terminal |
| Orders | CRUD + `publicToken` + `whatsappSuggest` + e-mail create/ready. Com `photoCounts`, o e-mail espera o upload de cada item |
| Atrasos | Regra única em `lib/lateness.js` + recorte em `lib/queueFocus.js`: atrasado = aberto/em andamento com prazo vencido; pronto esperando retirada não conta. KPIs e kanban contam **cards**. No prazo = pronto até a data prevista |
| Alerts | inbox + `POST /alerts/inbox/read` + **`GET /alerts/feedback`** (lista + summary, `serviceAvg`, `?openedBy=`) |
| Services / clients / employees | CRUD. Funcionário `attends` = aparece em "Aberto por" (`Order.openedByEmployeeId/openedByName`); `GET /metrics/attendance` |
| Products | `/products` CRUD, ajuste e `/products/summary`. Dono e admin da oficina. Item `origin=stock` reserva, baixa na entrega e estorna no cancelamento. `leadTimeDays` + `/products/restock` (hora de pedir, a caminho, atrasado) |
| Quotes | `/quotes` funil (novo, contato, retorno, recuperado, perdido) + `POST /orders/:id/refuse-quote`. Prioridade no servidor; texto de WhatsApp por modelo ou IA (`OPENAI_API_KEY`). `win` grava `recovery` e `Order.recovered`; `GET /quotes/recovered` |
| IA | `aiService` (chave, modelo, custo, `AiUsage`, teto por plano: teste 30, Basic 50, Pro 300, Business 1.500 por mês) + `/dashboard/brief`, `customer-summary`, `reply-suggest`. Leitura semanal (`/metrics/insights`) só no Business |
| WhatsApp oficial | `/whatsapp`, `/webhooks/whatsapp`, `WhatsAppMessage`. Inerte sem `META_*`. Ver [ia-e-whatsapp-setup](../../docs/ops/ia-e-whatsapp-setup.md) |
| Billing | `/billing/*` (checkout, `payments`, `cancel`) + `POST /webhooks/asaas` (token no header, idempotente). Asaas com Pix, boleto ou cartão. Basic 14700 · Pro 29700 · Business 59700 centavos; anual 10×; fundador do Business 49900. Criar pedido no `WORQERA_BASIC` recusa a partir do 151º do mês (America/Sao_Paulo). 5 dias de tolerância em atraso |
| Public / files | `/public/track/:token` (URL `/p/o/{token}`); antigo `/public/shops/:slug/orders/:code?t=` segue; `/files/*` |

## Env chave

`PLATFORM_ADMIN_EMAILS` · `WORQERA_Apple__ClientIds` (Entrar com a Apple; padrão `com.worqera.worqeraMobile`) · `WORQERA_AI__CustomerSummary=1` (religa o texto da IA na consulta e no laudo; padrão desligado) · `OPENAI_API_KEY` (IA do Business; `WORQERA_AI_MODEL` padrão `gpt-6-luna`, `WORQERA_AI_MODEL_DEEP` `gpt-5.6-terra`) · `META_APP_ID` / `META_APP_SECRET` / `META_WA_CONFIG_ID` / `META_WEBHOOK_VERIFY_TOKEN` / `WHATSAPP_TOKEN_KEY` (WhatsApp oficial) · `WORQERA_Asaas__Env` / `WORQERA_Asaas__ApiKey` / `WORQERA_Asaas__WebhookToken` · `WORQERA_Metrics__Enabled` (coleta do painel, padrão ligado) · `PUBLIC_WEB_URL` (links wa.me/e-mail) · SMTP `WORQERA_Email__*` · `ALLOW_INSECURE_WEBHOOK=1` só em dev

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
