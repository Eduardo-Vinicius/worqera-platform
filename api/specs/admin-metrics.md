# Painel da plataforma (admin Worqera)

Só para admin da plataforma (`PLATFORM_ADMIN_EMAILS`): todas as rotas abaixo passam por `auth + requirePlatformAdmin`. Desenho em [2026-10-31-admin-metricas-design](../../docs/superpowers/specs/2026-10-31-admin-metricas-design.md).

## Mapa

| Tela (web) | O que responde | Rotas |
|---|---|---|
| `/admin/plataforma` Visão geral | Como está a semana? | `GET /platform/overview` |
| `/admin/metricas` Métricas | Tecnologia · Negócio · Produto | `GET /platform/metrics/tech\|business\|product` |
| `/admin/analises` Análises | Ativação, retenção, uso, transações, lojas | `GET /platform/analytics/funnel\|cohorts\|engagement\|adoption\|transactions`, `GET /platform/shops-health` |
| `/admin/operacao` Operação | Quem precisa de um toque do time | `GET /platform/queues` |
| `/admin/contas` e `/admin/contas/[id]` | Quem é, onde usa, o que fez | `GET /platform/accounts`, `GET /platform/accounts/:id` |
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
- **Saúde (0–100):** começa em 100; −10 por ponto de taxa de erro (até −50); p95 > 1 s −10, > 2,5 s −25; amostras descartadas −10; degradado −15; fora do ar = 0. Ótima ≥ 85, Atenção ≥ 65.

## Filas e prazo

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

## Contas

`GET /platform/accounts?segment=&q=&page=` — 50 por página, mais recentes primeiro; `q` busca nome ou e-mail. Segmentos com contagem: `all`, `active` (30 dias), `inactive`, `owners`, `no_activation` (dono de loja sem pedido), `plan:WORQERA_BASIC|PRO|BUSINESS`.

`GET /platform/accounts/:id` — conta, lojas com papel e assinatura, onde usa (cliente × versão), contadores de 30 dias (pedidos criados, logins, dias ativos) e os últimos 50 eventos de segurança. Id inválido ou inexistente: 404.

## Testes

`__tests__/metricsStore.test.js`, `periods.test.js`, `insights.test.js`, `analytics.test.js` (funções puras). O smoke com banco descartável passou por HTTP real (200/409/500 gravados com o status final), flush, todas as rotas e os controllers.
