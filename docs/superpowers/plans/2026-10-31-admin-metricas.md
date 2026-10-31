# Admin da plataforma — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Central do time Worqera com métricas técnicas duráveis, negócio, produto, insights, análises, lojas, contas 360° e filas.
**Spec:** `docs/superpowers/specs/2026-10-31-admin-metricas-design.md`
**Tech:** Express + Mongoose (`node --test`), Next.js 15 (SVG próprio, sem lib de gráfico), Flutter.

## Global Constraints
- Coleta nunca derruba nem atrasa a requisição: só enfileira; erro de gravação = log. `WORQERA_Metrics__Enabled=false` desliga.
- Fila 20.000, flush 5 s e no shutdown. Buckets de 30 min, TTL 90 d; erros TTL 30 d; contas ativas TTL 120 d; eventos de segurança TTL 180 d.
- Dias no fuso America/Sao_Paulo. Rotas `/platform/*` exigem `auth + requirePlatformAdmin` (401 anônimo, 403 não admin).
- `?days=1|7|14|30` (Camada 1) e `7|14|30|90` (Camada 2); toda resposta traz o período anterior para delta. Cache em memória 60 s.
- Nada carrega coleções inteiras: agregações no Mongo com índices em `createdAt`/filtros.
- Contratos existentes não mudam; `/admin/plataforma` antigo vai para `/admin/plataforma/portal`.
- Sem commits. Verificação: `cd api && npm test`; tsc do web; `flutter analyze`.

### Task 1 — Store de métricas (API)
Create `lib/metricsStore.js` (fila, `enqueue`, `flush`, `start`, `stop`, `stats`), models `MetricBucket`, `ErrorSample`, `ActiveAccount`; pure helpers `bucketStart`, `latencyBin`, `p95FromHistogram`, `clientOf(req)`, `ufFromAddress`. Testes unitários dos helpers e do flush com modelos simulados.

### Task 2 — Middleware e leitura antiga
`apiMetrics` passa a enfileirar (mantém `logApiError`). `readOpsSnapshot` lê os buckets do Mongo (1h/24h/30d) em vez do Redis. `server.js` inicia o worker e faz flush no SIGTERM/SIGINT. Compose de produção: Redis com `maxmemory 256mb`, `volatile-lru` e logs com rotação.

### Task 3 — Endpoints de métricas
`services/platformMetrics.js`: `tech`, `business`, `product` com deltas e cache; rotas `GET /platform/metrics/tech|business|product`.

### Task 4 — Headers do app
Interceptor do Dio envia `X-Worqera-Client`, `X-Worqera-Platform`, `X-Worqera-App-Version` (lidos uma vez do pacote).

### Task 5 — Tela Métricas (site)
`components/admin/charts.tsx` (KpiCard com delta, Spark, Columns, Bars, HealthDot, PeriodChips, Skeleton) e `/admin/metricas` com abas Tecnologia · Negócio · Produto, filtro de sistema, auto-refresh 60 s, estado vazio.

### Task 6 — Segurança
Model `SecurityEvent` + registro em login (aparelho novo pelo hash do user-agent), troca/reset de senha e revogação de sessões.

### Task 7 — Insights, filas e visão geral
`services/platformInsights.js` (regras puras testáveis + coleta de números), `services/platformQueues.js`; rotas `GET /platform/insights`, `/platform/queues`, `/platform/overview`. Testes de cada regra com números preparados.

### Task 8 — Análises, lojas e contas
`services/platformAnalytics.js`: funil de ativação (mediana entre etapas), coortes semanais, engajamento, adoção, funil de pedidos e orçamentos, saúde das lojas, lista de contas por segmento e 360°. Rotas `/platform/analytics/*`, `/platform/shops-health`, `/platform/accounts`, `/platform/accounts/:id`.

### Task 9 — Telas da Camada 2 e navegação
`/admin/plataforma` (visão geral nova), `/admin/plataforma/portal` (antiga), `/admin/analises` (Produto · Transações · Lojas), `/admin/operacao` (filas), `/admin/contas` e `/admin/contas/[id]`; menu "Worqera": Visão geral · Métricas · Análises · Operação · Lojas · Contas · Parâmetros · Notícias.

### Task 10 — Integração e docs
Smoke com banco descartável (números semeados, regras, funil, coorte, flush e status final 409/500); doc `api/specs/admin-metrics.md` (mapa do domínio, contratos, coleções, índices, TTLs, definição de métricas e regras); change-logs.
