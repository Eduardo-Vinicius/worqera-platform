# Painel da plataforma (admin Worqera)

Só para admin da plataforma (`PLATFORM_ADMIN_EMAILS`): todas as rotas abaixo passam por `auth + requirePlatformAdmin`. Desenho em [2026-10-31-admin-metricas-design](../../docs/superpowers/specs/2026-10-31-admin-metricas-design.md).

## Mapa

| Tela (web) | O que responde | Rotas |
|---|---|---|
| `/admin/plataforma` Visão geral | O que importa agora: números com link e série, saúde, insights, pendências, assinaturas | `GET /platform/overview` |
| `/admin/acoes` Ações rápidas | Ligar/desligar módulos, aviso de 7 dias, achar loja (+7 dias, entrar), erros e rotas lentas | `GET/PUT /platform/config`, `POST /platform/notices`, `GET /platform/shops`, `GET /platform/metrics/tech` |
| `/admin/erros` Erros e rotas | Todas as rotas (ordenáveis) e até 500 erros 5xx com busca, por sistema | `GET /platform/metrics/tech` (`allEndpoints`), `GET /platform/errors` |
| `/admin/ritual` Ritual semanal | Um número por passo do negócio, contra o período anterior | `GET /platform/ritual?days=7\|30` |
| `/admin/assinaturas` Assinaturas | MRR, recebido, situação; plano, +7 dias, ativar manual, cancelar | `GET /platform/subscriptions`, `PATCH /platform/shops/:id` |
| `/admin/auditoria` Auditoria | Quem do time mudou o quê | `GET /platform/audit` |
| `/admin/metricas` Métricas | Tecnologia · Negócio · Produto | `GET /platform/metrics/tech\|business\|product` |
| `/admin/analises` Análises | Ativação, retenção, uso, transações, lojas | `GET /platform/analytics/funnel\|cohorts\|engagement\|adoption\|transactions`, `GET /platform/shops-health` |
| `/admin/operacao` Operação | Quem precisa de um toque do time | `GET /platform/queues` |
| `/admin/contas` e `/admin/contas/[id]` | Quem é, onde usa (30 dias), o que fez; transferir e-mail | `GET /platform/accounts`, `GET /platform/accounts/:id`, `POST /platform/accounts/:id/transfer-email` |
| `/admin/emails` E-mails | O que foi enviado e o que falhou | `GET /platform/emails` |
| `/admin/plataforma/portal` Portal técnico | Tela anterior (IA, WhatsApp, e-mails, endpoints) | `GET /platform/ops` e afins |

`days` aceita `1, 7, 14, 30` nas métricas e `7, 14, 30, 90` no resto; fora da lista vale o padrão da rota. Dias são do fuso de São Paulo. Toda resposta com número comparável traz `{ value, prev, pct }` contra o período anterior de mesmo tamanho. Cada leitura fica 60 s em memória por processo.

## Coleta

`middleware/apiMetrics.js` registra cada resposta no `finish` (status final, inclusive 401/403/409/429/5xx vindos do `errorHandler`) e põe na fila em memória de `lib/metricsStore.js`. Ignora `OPTIONS`, `/health`, `/` e arquivos estáticos.

- Fila de até **20.000** amostras; cheia, descarta e conta em `dropped` (aparece na saúde).
- A cada **5 s** grava em lote (`bulkWrite` com upsert). No `SIGTERM`/`SIGINT` grava o que sobrou antes de sair.
- Desligar: `WORQERA_Metrics__Enabled=false` (o resto da API segue igual; as telas mostram zero).

Cliente da requisição (`clientOf`):

| Sinal | Cliente |
|---|---|
| `X-Worqera-Client: mobile` + `X-Worqera-Platform` | `android` ou `ios` (com `X-Worqera-App-Version`) |
| caminho `/api/v1/platform/*` | `admin` |
| `Origin` ou `Referer` | `web` |
| só `Authorization` | `api` |

## Coleções

| Coleção | Uma linha por | Campos principais | Índices | Expira |
|---|---|---|---|---|
| `metricbuckets` | 30 min × rota × método × classe de status × cliente | `count`, `errors4xx`, `errors5xx`, `totalMs`, `maxMs`, faixas `h0..h6` | único `{start, route, method, status, client}` | 90 dias |
| `errorsamples` | erro 5xx (até 50 por lote) | rota, status, código, mensagem, `correlationId`, loja | `{route, at}` | 30 dias |
| `activeaccounts` | dia × usuário × cliente | loja, plataforma, versão do app, UF (do endereço da loja), primeiro e último acesso | único `{day, userId, client}`, `{userId, day}`, `{shopId, day}` | 120 dias |
| `securityevents` | evento de conta | `kind`, aparelho, IP, cliente | `{userId, at}` | 180 dias |

Índices novos em coleções existentes: `createdAt` em Order, Quote, Shop e User; `{status, deliveredAt}` em Order; `{status, planCode}` em Subscription. Todos criados no boot (`ensureMetricIndexes`).

**Latência:** faixas `≤50, ≤100, ≤250, ≤500, ≤1000, ≤2500 ms` e acima. O p95 é o limite da faixa onde cai o 95º percentil (aproximado; na última faixa usa o máximo).

**Eventos de segurança:** `login`, `login_new_device` (hash de plataforma + user-agent nunca visto para a conta), `login_failed`, `password_reset`, `password_set_by_admin`, `sessions_revoked`. `logout` existe no enum, mas a rota de saída não é autenticada e não grava.

## Definições

- **Usuário ativo:** fez ao menos uma requisição autenticada no dia. Ativos 7/30 dias são distintos no período.
- **Loja ativa:** alguém da loja ativo no período.
- **Uso recorrente:** média de ativos por dia ÷ ativos em 30 dias.
- **MRR:** assinaturas `active` ou `past_due` (fora as de provedor `Dev`); anual entra como 1/12; fundador com o preço de fundador.
- **Pedidos de demonstração** (`clientName = "Cliente demonstração"`) e apagados não entram em nenhuma conta.
- **Funil de ativação** (lojas cadastradas no período): Cadastro → Configurou a loja (onboarding) → 1º pedido → 1º pedido entregue → Assinatura paga. Tempo mediano entre etapas.
- **Coorte:** semana de cadastro (segunda-feira, SP); célula = % da turma ativa naquela semana. `lowHistory` enquanto a coleta for mais curta que a tabela.
- **Funil de pedidos** (criados no período, pela situação atual): criados → em produção ou além → prontos → entregues → pagos (total > 0 e nada a receber).
- **Funil de orçamentos:** criados → com contato → recuperados.
- **Estágio da loja:** Cadastrada → Configurada → Pagante → Pagante e usando (pedido nos últimos 30 dias).
- **Loja em risco:** ativa e sem uso há 30 dias (ou nunca usou depois de 30 dias), ou pedidos caíram mais de 50% com base de 10+.
- **Saúde (0–100)** (`lib/healthScore.js`, igual ao Procedy, sobre o dia de hoje):
  - Começa em 100.
  - Erro 5xx, com 20 ou mais chamadas: ≥ 5% −40, ≥ 2% −25, ≥ 1% −15, ≥ 0,5% −5.
  - p95, com 20 ou mais chamadas: > 2,5 s −25, > 1 s −15, > 500 ms −8.
  - Fora do ar −100. Degradado −10 por motivo, até −30.
  - Faixas: Excelente ≥ 90, Bom ≥ 75, Atenção ≥ 50, Crítico abaixo disso.
  - Cada componente volta com o quanto descontou, e `health.reasons` diz por que está degradado (banco, erro na última hora, coleta parada ou com erro).
- **MRR / assinaturas** (`services/platformBilling.js`):
  - MRR = assinaturas ativas e em atraso (fora o provedor `Dev`). Mensal pelo preço do plano, ou de fundador enquanto durar; anual ÷ 12.
  - **Recebido** = pagamentos `PAYMENT_RECEIVED`/`PAYMENT_CONFIRMED` do Asaas no período, cada pagamento contado uma vez (pelo id do pagamento).
- **Sinais da loja** (`shopFlags`):
  - `at_risk`: em risco.
  - `no_onboarding`: 7+ dias sem concluir o onboarding.
  - `trial_ending`: teste acaba em ≤ 3 dias.
  - `past_due`: em atraso.
  - `no_orders_30d`: loja com 7+ dias e nenhum pedido em 30 dias.
- **Ritual:**
  - Lojas novas, testes iniciados, lojas que usaram e clientes cadastrados.
  - Pedidos criados, laudos e avisos de pronto que saíram, WhatsApp oficial e pedidos entregues.
  - Avaliações (com nota média), orçamentos recuperados (quantidade e valor) e recebido.
  - Tudo contra o período anterior de mesmo tamanho.

## Filas e prazo

Cada fila volta com `count`, `oldestHours`, `oldestAt`, `slaHours` (48), `overdueCount` (itens além do prazo) e `severity`: `critical` se há atraso, `warn` se há itens, `ok` vazia. A barra lateral mostra o total em "Filas" e o de inadimplentes em "Assinaturas", em vermelho quando há atraso.

Prazo pelo item mais antigo: **no prazo** < 24 h, **atenção** < 48 h, **atrasado** ≥ 48 h.

| Fila | Entra quando | Ação na tela |
|---|---|---|
| `trials` | teste acaba em ≤ 3 dias (ou acabou há ≤ 14) sem assinatura no Asaas | +7 dias, Entrar |
| `overdue` | assinatura `past_due` | Entrar |
| `onboarding` | loja ativa com 7+ dias sem concluir o onboarding | Entrar |
| `errors` | rota com erro 5xx nas últimas 48 h | Ver métricas |
| `reviews` | avaliação ≤ 2 nos últimos 30 dias | Entrar |

## Insights (`services/platformInsights.rules`, função pura)

| Regra | Dispara quando |
|---|---|
| Cadastros | variação > 25% com base anterior ≥ 4 |
| Erro em rota | 20+ chamadas, erro > 2% e > 2× a média (crítico ≥ 5%) |
| Rota mais lenta | p95 ≥ 250 ms e > 1,5× o período anterior |
| Ativação | variação > 10 p.p. com 3+ lojas em cada período |
| Versão do app | 10+ usuários no app e menos de 70% na versão mais nova |
| Lojas paradas | assinatura com 30+ dias e ninguém da loja ativo no período |
| Onboarding travado | fila `onboarding` com itens |
| Fila atrasada | item mais antigo ≥ 48 h (crítico ≥ 96 h) |
| Cancelamentos | 2+ e pelo menos o dobro do período anterior |
| Crescimento | ramo com 2+ cadastros no período |

Ordem: crítico, atenção, informação, bom sinal.

## Auditoria

`platformaudits` (expira em 365 dias). Middleware `platformAudit.audited(action, describe)` grava depois que a rota respondeu 2xx: quem fez, quando, ação, alvo (loja/conta), um resumo em português e o que foi enviado (sem chaves, tokens ou senhas).

Ações registradas:
- `shop.update`: suspender ou reativar, estender teste, situação, plano, selo, nota.
- `shop.whatsapp` e `shop.ai`.
- `config.update`.
- `notice.create` e `notice.delete`.
- `account.transfer_email`.

Cancelar pelo admin uma assinatura do Asaas cancela lá também.

## Contas

**Transferir e-mail** (`POST /platform/accounts/:id/transfer-email {newEmail}`):
- E-mail válido, diferente do atual (409 `EMAIL_UNCHANGED`) e livre (409 `EMAIL_ALREADY_EXISTS`).
- Troca o login, marca o e-mail como não confirmado e encerra todas as sessões (`tokenVersion`).
- Manda o link de criar senha e grava `account_transferred` no histórico de segurança e na auditoria.


`GET /platform/accounts?segment=&q=&page=` — 50 por página, mais recentes primeiro; `q` busca nome ou e-mail. Segmentos com contagem: `all`, `active` (30 dias), `inactive`, `owners`, `no_activation` (dono de loja sem pedido), `plan:WORQERA_BASIC|PRO|BUSINESS`.

`GET /platform/accounts/:id` — conta, lojas com papel e assinatura, onde usa (cliente × versão), contadores de 30 dias (pedidos criados, logins, dias ativos) e os últimos 50 eventos de segurança. Id inválido ou inexistente: 404.

## E-mails

Todo `sendMail` com `log: { kind, shopId? }` grava em `platformmaillogs` (expira em 30 dias); os de pedido gravam pelo `orderNotify`. Situação: **enviado** (SMTP/SES aceitou), **não enviado** (sem destinatário, esperando foto ou preço, SMTP desligado) ou **falhou** (erro do provedor).

| Grupo | Tipos |
|---|---|
| `orders` | `created`, `ready` |
| `account` | `verify_email`, `password_reset`, `invite` |
| `billing` | `billing_active` |
| `alerts` | `late_alerts`, `weekly_digest` |

## Testes

`__tests__/metricsStore.test.js`, `periods.test.js`, `insights.test.js`, `analytics.test.js` (funções puras). O smoke com banco descartável passou por HTTP real (200/409/500 gravados com o status final), flush, todas as rotas e os controllers.
