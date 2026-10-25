# Worqera API — Endpoints

**Atualizado:** 2026-09-14 (Ops UX Onda C)  
**Base:** `/api/v1`  
Legenda: **LIVE** = runtime Mongo · **PLANEJADO** = ainda não no host · **LEGADO** = aliases PT / rotas antigas

> Contrato canônico **live** em `/api/v1`. Front: `web/lib/apiService.ts` + `adapters.ts` (aliases PT). Health, auth SaaS, shop/sectors/kanban, clients/orders = **LIVE**. Billing AbacatePay ainda é **stub**.

## Erros (alvo)

Problem Details:

```json
{
  "type": "about:blank",
  "title": "string",
  "status": 400,
  "detail": "string",
  "code": "SHOP_REQUIRED|SUBSCRIPTION_INACTIVE|FORBIDDEN_SECTOR|…",
  "correlationId": "uuid"
}
```

| code | HTTP | Quando |
|------|------|--------|
| `UNAUTHORIZED` | 401 | Sem JWT / inválido |
| `FORBIDDEN` | 403 | Role insuficiente |
| `FORBIDDEN_SECTOR` | 403 | Conta de setor fora do permitido |
| `SUBSCRIPTION_INACTIVE` | 402 ou 403 | Trial expirado / sem assinatura |
| `SHOP_REQUIRED` | 400 | Falta contexto de shop |
| `NOT_FOUND` | 404 | Recurso inexistente no shop |
| `VALIDATION_ERROR` | 400 | Input inválido |
| `CONFLICT` | 409 | Slug/código duplicado |
| `EMAIL_NOT_VERIFIED` | 403 | Login de cadastro novo sem confirmar e-mail (`email`, `resent`) |

## Health

```
GET /health                          # PLANEJADO — liveness
```

## Auth

```
POST /auth/signup                    # PLANEJADO — shop + owner + trial
POST /auth/login                     # PLANEJADO
POST /auth/refresh                   # PLANEJADO — cookie HttpOnly
POST /auth/logout                    # PLANEJADO
GET  /auth/me                        # PLANEJADO — user + memberships + subscription summary
POST /auth/verify-email              # {token} ou {email, code}. Confirma e devolve a sessão (como o login)
POST /auth/resend-verification       # {email}. Novo código + link; 60 s entre envios (retryIn, throttled)
```

LEGADO: `POST /auth/login`, `POST /auth/register`, `POST /auth/refresh-token` (sem shop/trial).

## Billing

```
GET  /billing/products               # LIVE
POST /billing/checkout-sessions      # LIVE — mock URL se sem API key
POST /billing/dev/complete-checkout  # LIVE — só Development
POST /webhooks/abacatepay            # LIVE — raw body + secret + HMAC (fail-closed)
GET  /billing/subscription           # LIVE — subscription do shop atual
```

## Shops / members

```
GET  /shops/current                  # LIVE
PATCH /shops/current                 # LIVE — branding básico (admin/owner)
GET  /shops/current/members          # LIVE
POST /shops/current/members          # LIVE — criar user/membership (admin/owner)
PATCH /shops/current/members/{id}    # LIVE — role / sectorIds / active
```

## Platform (Worqera allowlist)

```
GET   /platform/shops                # LIVE — list + search
GET   /platform/shops/{id}           # LIVE
PATCH /platform/shops/{id}           # LIVE — status, extendTrialDays, subscriptionStatus, seal
GET   /platform/ops                  # LIVE — métricas da API, erros, última posição
GET   /platform/config               # LIVE — menu, consulta pública e e-mail do laudo
PUT   /platform/config               # LIVE
GET   /platform/notices              # LIVE
POST  /platform/notices              # LIVE
DELETE /platform/notices/{id}        # LIVE
GET   /runtime/config                # LIVE — ?platform=web|ios|android&version=&region=
POST  /runtime/location              # LIVE — { lat, lng }
```

## Sectors (carro-chefe)

```
GET    /sectors                      # LIVE — lista do shop
POST   /sectors                      # LIVE — admin/owner
PATCH  /sectors/{id}                 # LIVE
DELETE /sectors/{id}                 # LIVE — apaga o documento; 409 se a coluna ainda tem pedido aberto
POST   /sectors/reorder              # LIVE — body: [{id, order}]
```

## Kanban

```
GET  /kanban                         # LIVE
     # admin/owner/atendimento: todas colunas (setores ativos) + cards
     # sector: só setores em membership.sectorIds
POST /kanban/orders/{orderId}/move   # LIVE
     # body: { toSectorId, note? }
     # authz: admin → any; sector → regra RF-SEC-06
```

## Clients

```
GET    /clients                      # PLANEJADO
POST   /clients                      # PLANEJADO
GET    /clients/{id}                 # PLANEJADO
PATCH  /clients/{id}                 # PLANEJADO
DELETE /clients/{id}                 # PLANEJADO
```

LEGADO: `/clientes`.

## Orders

```
GET    /orders                       # LIVE — shop-scoped; cada row: items + itemCount + flat; ?payment=due (saldo > 0; setor ignora)
POST   /orders                       # LIVE — body items[] ou flat; photoCounts[] adia o e-mail até as fotos
GET    /orders/{id}                  # LIVE
PATCH  /orders/{id}                  # LIVE — scalars + opcional itemPatches[]; items[] wholesale → 400 USE_ITEM_ENDPOINTS
PATCH  /orders/{id}/items/{itemIndex} # LIVE — merge (preserva id/fotos/setor/histórico); delivered → 400
POST   /orders/{id}/items            # LIVE — novo par (bootstrap partida); delivered → 400
DELETE /orders/{id}/items/{itemIndex} # LIVE — remove par (mín. 1); delivered → 400
POST   /orders/{id}/photos           # LIVE — item 0 (legado); multipart field photos; append
POST   /orders/{id}/items/{itemIndex}/photos  # LIVE — append em items[itemIndex]; índice inválido → 400
POST   /orders/{id}/notify-created   # LIVE — manda o e-mail de criação se ainda estava esperando as fotos
DELETE /orders/{id}/items/{itemIndex}/photos/{photoIndex}  # LIVE
POST   /orders/{id}/pdf              # LIVE
GET    /orders/{id}/photos/zip       # LIVE — ainda só flat photos (item 0)
```

Create `items[]` (opcional): `{ shoeModel, services[{id?, name, price}], notes? }`. Aliases PT (`modeloTenis`, `servicos`, `preco`, `fotos`, `observacoes`) aceitos. Sem `items`, o service sintetiza 1 item a partir do flat. Um `code` por pedido; `pricing.total` default = soma de todos os items.

LEGADO: `/pedidos`, `/upload`, PDF em rotas antigas.

## Dashboard

```
GET /dashboard                       # LIVE — KPIs + recent orders
GET /dashboard/summary               # LIVE
GET /dashboard/sectors               # LIVE — counts by sector (+ ?includeOrders=true)
```

## Metrics (owner/admin)

```
GET /metrics/departments
GET /metrics/employees
GET /metrics/employees/performance
GET /metrics/delays
GET /metrics/summary
GET /metrics/finance
GET /metrics/overview
```

Query (EN): `period`, `startDate`, `endDate`, `limit`, `servicesLimit`  
(aliases PT ainda aceitos uma vez: `periodo`, `dataInicio`, `dataFim`, `limitServicos`)

## Público (TOP-02)

```
GET /public/orders/{code}            # LIVE — status resumido sem auth (link antigo)
GET /public/track/{token}            # LIVE — mesmo status, só pelo token opaco
POST /public/track/{token}/feedback  # LIVE — avaliação sem slug na URL
```

## Catálogo (TOP-01)

```
GET/POST /services                   # LIVE
PATCH/DELETE /services/{id}          # LIVE — DELETE remove o catálogo; pedido antigo guarda nome e preço
GET/POST /brands                     # LIVE — combo de marca no pedido. POST também no atendimento
PATCH/DELETE /brands/{id}            # LIVE — só admin/dono. Renomear atualiza o nome nos pedidos da loja.
GET/POST /accessories                # LIVE — catálogo da loja. POST também no atendimento, ao informar Outro no pedido
PATCH/DELETE /accessories/{id}       # LIVE — só admin/dono. DELETE remove do cadastro; pedido antigo guarda o nome
```

## Produtos

```
GET/POST /products                   # GET: equipe da oficina. POST: dono e admin
GET /products/summary                # vendido, reservado, valor em estoque
GET/PATCH/DELETE /products/{id}
POST /products/{id}/adjust           # quantity + reason; variantId se houver variação
GET /products/{id}/movements
```

Item de pedido `origin=stock` reserva ao criar, baixa em `delivered`, estorna em cancelamento, exclusão ou reabertura. `origin=brought` não mexe no saldo.

## Orçamentos

Dono, admin e atendimento. Setor não acessa.

```
GET  /quotes?view=today|board|all&q=&clientId=   # quotes[] + summary (Ligar hoje, na mesa, recuperado 30d, taxa)
POST /quotes                         # orçamento do balcão, sem pedido: name, phone, what, value, reason, followUpAt
GET  /quotes/{id}                    # com activity[]
PATCH /quotes/{id}                   # stage, followUpAt, reason, reasonNote, notes, dados do cliente. stage=won com pedido = win
POST /quotes/{id}/activity           # kind call | whatsapp | note. call/whatsapp contam contato; new → contact
POST /quotes/{id}/suggest            # 3 textos (Direto, Leve, Curto) + waUrl. ai=true só com OPENAI_API_KEY
POST /quotes/{id}/win                # reabre o pedido recusado na fila; sem pedido devolve prefill para Novo pedido
DELETE /quotes/{id}                  # dono/admin
POST /orders/{id}/refuse-quote       # reason, reasonNote, followUpAt. Pedido vira cancelled + quoteRefusal; libera estoque
POST /orders  items[].ready          # produto da loja (origin=stock) já pronto: nasce no setor final. deliverNow=true + só produtos prontos = nasce entregue
GET  /orders/shelf                   # owner. Prontos não retirados: days, stale (3+), toCollect, whatsapp {text,url}, summary
POST /orders/{id}/shelf-remind       # owner. Registra o lembrete (shelfReminder.count/lastAt)
```

## IA (Business)

Sem `OPENAI_API_KEY`, sem Business ou acima do teto mensal: mesma resposta, com texto pronto e `ai: false`.

```
GET  /dashboard/brief?refresh=1             # resumo do dia: números ao vivo + frase (IA no máx. a cada 3 h)
GET  /metrics/insights?refresh=1            # leitura da semana; { locked: true } fora do Business
POST /orders/{id}/customer-summary          # { text } salva o texto da equipe; sem body, a IA escreve (Business)
POST /orders/{id}/feedback/reply-suggest    # 2 respostas para a avaliação
```

`POST /quotes/{id}/suggest` só usa IA no Business. Cada chamada grava `AiUsage` (tokens e custo).

Limite: 1.000 usos por mês no Business (`WORQERA_AI_MONTHLY_CAP`), só respostas com sucesso contam, renova no dia 1º (SP). Toda resposta de IA traz `aiQuota { used, limit, left, percent, blocked, nearLimit, resetsAt }`.

```
GET   /ai/quota                       # { business, configured, quota }
PATCH /platform/shops/{id}/ai         # admin Worqera: { extraCalls } soma no mês atual; { monthlyCap } muda o limite fixo (null = padrão)
```

## WhatsApp oficial (Business)

Fica inerte sem `META_APP_ID`, `META_APP_SECRET` e `META_WA_CONFIG_ID`.

```
GET   /whatsapp                       # status, uso do mês, pacote, excedente, dados do Embedded Signup
POST  /whatsapp/connect               # { code, wabaId, phoneNumberId, coexistence } — dono/admin
PATCH /whatsapp                       # { autoReady, consentAtCounter } — dono/admin
POST  /whatsapp/disconnect
POST  /quotes/{id}/whatsapp           # retomada (modelo marketing), máx. 2 por orçamento
GET   /webhooks/whatsapp              # verificação da Meta (hub.challenge)
POST  /webhooks/whatsapp              # status, respostas do cliente, account_update (X-Hub-Signature-256)
PATCH /platform/shops/{id}/whatsapp   # admin Worqera: paymentOk, paused, overagePaid, capBoost
```

Pedido pronto (todos os itens no setor final) envia `pedido_pronto` quando `autoReady` está ligado.

Etapas: `new` · `contact` · `followup` · `won` · `lost`. Motivos: `price` · `thinking` · `deadline` · `other_shop` · `no_need` · `other`. A prioridade (`high|medium|low` + `hint`) é calculada no servidor: retorno atrasado, motivo, valor e quantos contatos já houve. O dia de "hoje" é o de São Paulo.

## Headers

| Header | Uso |
|--------|-----|
| `Authorization: Bearer …` | Access token |
| `X-Worqera-Shop` | Shop ativo (obrigatório se multi-membership) |
| `X-Correlation-Id` | Opcional; ecoado na resposta |

## Notas

- Contrato JSON em **inglês** (`code`, `photos`, `sectors`, `items`, …). Front usa `web/lib/adapters.ts` enquanto a UI migra.
- Upload: multipart field `photos` (aceita `fotos` legado). Cap 8 arquivos **por request** (não por item).
- `POST /orders/:id/photos` → `uploadItemPhotos(..., 0)`: append em `items[0]` e espelha flat `photos`.
- `POST /orders/:id/items/:itemIndex/photos`: append em `items[itemIndex]`; se `items` vazio, hidrata do flat antes do índice; `idx === 0` também espelha flat. Índice inválido → 400.
- `GET` order: `items` via `effectiveItems` + `itemCount`; `items[].photos` = URLs (strings). Upload response ainda devolve objetos `{ key, url, isCover }` no item.
- Inventário legado: [feature-inventory.md](./feature-inventory.md).
