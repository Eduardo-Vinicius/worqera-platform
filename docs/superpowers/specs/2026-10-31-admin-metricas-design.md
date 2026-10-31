# Admin da plataforma: métricas, análises e operação

Data: 31/10/2026 · Para o time Worqera (role `platformAdmin`), não para as lojas.

## 0. O que existe hoje (levantamento)

- **Stack:** API Node/Express + MongoDB (replica set) + **Redis em produção** (`worqera-redis`, AOF ligado, **sem `maxmemory`**). Site Next.js 15; app Flutter.
- **Coleta atual** (`middleware/apiMetrics.js`): grava no `res.on('finish')` (status final certo, 401/403/429 contados), rota template via `req.route` (sem ids). Agrega **só no Redis** em hashes por hora (TTL 30 d) e guarda erros 5xx em `PlatformError` (Mongo, teto 1.000). Não sabe cliente (web/app), versão do app, latência por faixa nem usuários ativos por dia; com o Redis fora, as métricas somem sem aviso.
- **Admin atual:** `/admin/plataforma` (visão geral: atenção, saúde, IA, WhatsApp, endpoints, e-mails, notícias), `/admin/shops` (oficinas), `/admin/plataforma/parametros`, `/admin/plataforma/noticias`. Rotas `/platform/*` com `auth + requirePlatformAdmin`.
- **Não existe:** log de segurança (logins, troca de senha), métricas por plataforma/versão, funil, coortes.

## 1. Mapa do domínio

| Conceito | No Worqera |
| --- | --- |
| Cliente B2B | **Loja** (`Shop`) — paga a assinatura |
| Usuário | Membro da loja (`User` + `Membership`: owner, admin, atendimento, setor) |
| Entidade principal | **Pedido** (`Order`) |
| Ação de valor | **Pedido entregue** (`status: delivered`) |
| Ativação da loja | cadastro → setores configurados (onboarding) → 1º pedido → 1º pedido entregue → assinatura paga |
| Transação secundária | **Orçamento** (`Quote`): novo → contato → retorno → recuperado/perdido |
| Receita | `Subscription` (Asaas) → **MRR** = soma dos planos ativos (anual ÷ 12; fundador 499) |
| Funcionalidades | kanban, pedidos, clientes/CRM, orçamentos, avaliações, WhatsApp, IA, estoque, financeiro, TVs |
| Processos manuais (filas) | teste acabando sem assinatura, pagamento atrasado, loja parada no onboarding, erros 5xx novos, avaliação ruim sem resposta |

## 2. Camada 1 — coleta e métricas

**Coleta (substitui as hashes do Redis; o Mongo vira a fonte durável):**
- O middleware só **enfileira** uma amostra em memória (fila de 20.000; cheia = descarta e conta). Um worker grava em lote a cada 5 s e no shutdown. `WORQERA_Metrics__Enabled=false` desliga.
- Amostra: método, rota template, status final, ms, cliente (`web` · `android` · `ios` · `admin` · `api`), versão do app, userId, shopId, código de erro, correlation id. Ignora OPTIONS, `/health*`, estáticos.
- `MetricBucket`: janela de 30 min × rota × método × faixa de status × cliente, com `count`, `errors4xx`, `errors5xx`, `totalMs`, `maxMs` e histograma (≤50, ≤100, ≤250, ≤500, ≤1000, ≤2500, >2500 ms) para p95 aproximado. Upsert com `$inc`/`$max`. TTL 90 d.
- `ErrorSample`: 5xx (rota, status, código, mensagem curta, correlation id, data), até 50 por lote. TTL 30 d. O `PlatformError` atual segue para a tela antiga.
- `ActiveAccount`: dia (São Paulo) × usuário × cliente, com loja, última atividade, plataforma, versão e região (UF lida do endereço da loja, ex. "… - SP"; sem UF = "—"). Regrava no máximo a cada 10 min por usuário (cache em memória). TTL 120 d.
- **Headers do app:** `X-Worqera-Client: mobile`, `X-Worqera-Platform: ios|android`, `X-Worqera-App-Version: 1.2.3+45`. Sem eles = `web`; rotas `/platform/*` = `admin`; com `Authorization` e sem nada disso = `api`.
- Dias sempre no fuso `America/Sao_Paulo`.
- Redis em produção ganha `--maxmemory 256mb --maxmemory-policy volatile-lru` (as métricas saem dele).

**Endpoints (`/platform/metrics/*`, só platform admin; `?days=1|7|14|30`, deltas vs. período anterior, cache 60 s):**
- `tech?client=all|web|mobile|admin|api`: KPIs (requisições, usuários ativos, 5xx, taxa de erro, média, p95, máx.), séries diária e de 30 min, top e mais lentos, erros recentes, ativos por região/plataforma/versão (rollout), saúde (ping do Mongo, fila, último flush, 5xx na última hora).
- `business`: lojas (novas, ativas), testes, assinaturas pagas, MRR, cancelamentos, pedidos criados/entregues, valor em pedidos, orçamentos recuperados, indicações — total, novos, delta e série diária.
- `product`: ramos (vertical), UFs, cobertura de funcionalidades (% de lojas ativas usando cada uma), funil de ativação das lojas.

## 3. Camada 2 — análises e operação

- **Visão geral (nova home do admin):** KPIs north star (usuários ativos 30 d, pedidos criados na semana, pedidos entregues na semana, lojas ativas, MRR), nota de saúde, **feed de insights** (`/platform/insights`) e **pendências** (filas com quantidade e idade do mais antigo).
- **Regras de insight:** cadastros ±25%; rota com erro > 2% e 2× a média ou p95 +50%; ativação ±10 p.p.; versão antiga do app com > 30% dos ativos; lojas paradas > 30 d ou presas no onboarding > 7 d; filas acima do SLA; pico de cancelamento; ramo/UF que mais cresceu (positivo).
- **Análises (`/admin/analises`):** funil de ativação com mediana de tempo entre etapas; retenção por coorte semanal (8 semanas, a partir de `ActiveAccount`; avisa quando ainda há pouco histórico); DAU/WAU/MAU, stickiness, novos × recorrentes por plataforma; adoção de funcionalidades.
- **Transações:** funil do pedido (criado → em produção → pronto → entregue → pago), tempo até ficar pronto e até entregar, faixas de valor e top serviços; funil de orçamentos.
- **Lojas (parceiros):** pipeline de onboarding e tabela de saúde (última atividade, pedidos no período, plano/MRR, membros, status, **em risco** se sem atividade 30 d ou queda > 50%), ordenável, com detalhe.
- **Visão 360°** (`/admin/contas/[id]`): perfil, plano, lojas, última atividade por plataforma/versão, **linha do tempo de segurança** (novo `SecurityEvent`: login, login em aparelho novo, troca/reset de senha, sessões revogadas; TTL 180 d) e contadores. Lista de contas com segmentos (ativas, sem ativação, donos, por plano).
- **Filas com SLA:** testes acabando sem assinatura, pagamentos atrasados, onboarding parado, erros novos, avaliações 1–2★ sem resposta. Badge verde < 24 h, amarelo < 48 h, vermelho > 48 h; ações inline com os endpoints que já existem (estender teste, abrir a loja, marcar erro como visto).
- **Navegação do admin:** Visão geral · Métricas · Análises · Operação (Filas, Lojas, Contas) · Configuração (Parâmetros, Notícias). URLs antigas continuam (`/admin/plataforma` vira a visão geral nova; a tela antiga vai para `/admin/plataforma/portal`).

## 4. Qualidade

- Testes: 401/403, formato, números com dados semeados (banco descartável), flush do store e status final (409/500 contados como erro), cada regra de insight disparando, funil/coorte com datas conhecidas.
- Índices criados de forma idempotente no boot (conflito = log, não derruba).
- Doc: endpoints, coleções, índices, TTLs, definição de cada métrica e regra. Change-logs.
