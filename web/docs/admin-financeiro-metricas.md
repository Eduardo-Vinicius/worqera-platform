# Integracao Frontend - Admin Financeiro e Metricas

## Escopo
Este workspace contem apenas o frontend Next.js que consome uma API externa via `NEXT_PUBLIC_API_URL`.

Por isso:
- as alteracoes reais de backend nao puderam ser aplicadas neste repositorio;
- a camada de integracao do frontend foi preparada para os novos contratos;
- as telas admin foram atualizadas para consumir os endpoints novos com fallback seguro quando o backend ainda nao estiver publicado.

Base de rotas esperada: `/metrics`

Autenticacao: `Bearer Token` obrigatorio em todas as rotas.

## O que foi preparado no frontend

### Servicos adicionados em `lib/apiService.ts`
- `getMetricsFinanceiroService(filters)`
- `getMetricsFuncionariosDesempenhoService(filters)`
- `getMetricsOverviewService(filters)`

### Servicos existentes enriquecidos
- `getMetricsResumoService(filters)` agora aceita `periodo`, `dataInicio`, `dataFim`
- `getMetricsDepartamentosService(filters)` agora aceita `periodo`, `dataInicio`, `dataFim`
- `getMetricsFuncionariosService(params)` agora aceita `limit`, `periodo`, `dataInicio`, `dataFim`
- `getMetricsAtrasosService(filters)` agora aceita `periodo`, `dataInicio`, `dataFim`

### Tipos adicionados no frontend
- `MetricsResumo`
- `MetricsAtrasos`
- `MetricsFinanceiro`
- `MetricsFuncionariosDesempenho`
- `MetricsOverview`
- `MetricsPeriodo`

## Telas criadas e ajustadas

### 1. Tela nova: Financeiro Admin
Rota: `/admin/financeiro`

Objetivo:
- mostrar cards de receita, lucro, despesas e ticket medio;
- mostrar evolucao diaria;
- mostrar receita por status;
- mostrar ranking de servicos.

Arquivo:
- `app/admin/financeiro/page.tsx`

### 2. Tela ajustada: Metricas Admin
Rota: `/admin/metrics`

Objetivo:
- consolidar resumo operacional;
- destacar pedidos em atraso;
- mostrar ranking de funcionarios por produtividade;
- mostrar ranking de funcionarios por velocidade;
- exibir pulso financeiro resumido.

Arquivo:
- `app/admin/metrics/page.tsx`

### 3. Acesso no dashboard
Adicionado atalho admin para financeiro:
- `app/dashboard/page.tsx`

## Estrategia de fallback no frontend

### `/admin/metrics`
A tela tenta primeiro:
- `GET /metrics/overview`

Se esse endpoint ainda nao existir, cai automaticamente para:
- `GET /metrics/resumo`
- `GET /metrics/departamentos`
- `GET /metrics/atrasos`
- `GET /metrics/funcionarios/desempenho`
- `GET /metrics/financeiro`
- `GET /metrics/funcionarios`

Com isso, a tela continua renderizando parcialmente mesmo com backend incompleto.

### `/admin/financeiro`
Depende principalmente de:
- `GET /metrics/financeiro`

Sem esse endpoint, a tela permanece navegavel, mas mostrara erro de carga e/ou valores vazios.

## Contrato esperado do backend

## 1) `GET /metrics/financeiro`
Retorna dados financeiros consolidados para cards, graficos e tabelas.

Query params opcionais:
- `periodo`: `7d`, `15d`, `30d`, `90d`, `180d`, `1y` (default: `30d`)
- `dataInicio`: `YYYY-MM-DD` ou ISO
- `dataFim`: `YYYY-MM-DD` ou ISO
- `limitServicos`: limite do ranking de servicos (default: `10`)

Exemplo:

```http
GET /metrics/financeiro?periodo=30d&limitServicos=8
```

Resposta esperada:

```json
{
  "success": true,
  "data": {
    "periodo": {
      "inicio": "2026-03-09",
      "fim": "2026-04-08",
      "referencia": "30d"
    },
    "resumo": {
      "totalPedidos": 120,
      "pedidosFinalizados": 80,
      "pedidosEmAberto": 40,
      "receitaPrevista": 24500,
      "receitaRecebida": 18800,
      "receitaPendente": 5700,
      "despesas": 4200,
      "lucroPrevisto": 20300,
      "lucroRealizado": 14600,
      "margemPrevista": 82.85,
      "ticketMedio": 204.16
    },
    "receitaPorStatus": [
      {
        "status": "Atendimento - Finalizado",
        "pedidos": 40,
        "receitaPrevista": 9800,
        "receitaRecebida": 9800
      }
    ],
    "topServicos": [
      {
        "servico": "Lavagem Completa",
        "pedidos": 33,
        "receita": 4950
      }
    ],
    "evolucaoDiaria": [
      {
        "data": "2026-04-01",
        "pedidos": 6,
        "receitaPrevista": 1450,
        "receitaRecebida": 900
      }
    ]
  }
}
```

## 2) `GET /metrics/funcionarios/desempenho`
Retorna ranking de funcionarios por produtividade e por velocidade.

Query params opcionais:
- `limit`: quantidade de funcionarios por ranking (default: `10`)
- `periodo`: `7d`, `15d`, `30d`, `90d`, `180d`, `1y`
- `dataInicio`, `dataFim`

Exemplo:

```http
GET /metrics/funcionarios/desempenho?periodo=30d&limit=5
```

Resposta esperada:

```json
{
  "success": true,
  "data": {
    "periodo": {
      "inicio": "2026-03-09",
      "fim": "2026-04-08",
      "referencia": "30d"
    },
    "topFuncionariosPorPedidos": [
      {
        "funcionarioNome": "Carlos",
        "pedidosComParticipacao": 48,
        "pedidosFinalizados": 32
      }
    ],
    "topFuncionariosMaisRapidos": [
      {
        "funcionarioNome": "Ana",
        "etapasConcluidas": 61,
        "pedidosComTempo": 37,
        "tempoTotalMs": 112320000,
        "tempoMedioMs": 1841311,
        "tempoMedioHoras": 0.51
      }
    ]
  }
}
```

## 3) `GET /metrics/overview`
Endpoint agregado para montar a home admin em uma unica chamada.

Query params opcionais:
- `limit`
- `periodo`
- `dataInicio`
- `dataFim`
- `limitServicos`

Exemplo:

```http
GET /metrics/overview?periodo=30d&limit=5&limitServicos=6
```

Resposta esperada:

```json
{
  "success": true,
  "data": {
    "resumo": { "...": "mesma estrutura de /metrics/resumo" },
    "atrasos": { "...": "mesma estrutura de /metrics/atrasos" },
    "financeiro": { "...": "mesma estrutura de /metrics/financeiro" },
    "funcionarios": { "...": "mesma estrutura de /metrics/funcionarios/desempenho" }
  }
}
```

## Endpoints existentes que devem ser enriquecidos

### `GET /metrics/resumo`
Manter compatibilidade e incluir:
- `noPrazo`
- `taxaAtraso`
- `periodo`

### `GET /metrics/atrasos`
Manter compatibilidade e incluir:
- `atrasoMedioHoras`
- `itens[].diasAtraso`
- suporte a filtro por `periodo`, `dataInicio`, `dataFim`

### `GET /metrics/departamentos`
Manter endpoint e incluir suporte a periodo.

### `GET /metrics/funcionarios`
Manter endpoint e incluir suporte a periodo.

## Regras de negocio esperadas no backend
- filtro de periodo usando data de criacao do pedido (`createdAt` ou `dataCriacao`);
- `receitaRecebida` considerando:
  - pedido finalizado: valor total do pedido;
  - pedido aberto: total menos valor restante, com fallback para valor de sinal;
- ranking de funcionarios calculado a partir de `setoresHistorico`;
- velocidade calculada por tempo medio entre entrada e saida das etapas;
- cache curto sugerido: `METRICS_CACHE_MS` com default de `30000ms`.

## Observacoes de frontend
- todos os valores monetarios devem chegar como `number` em reais, sem formatacao;
- formatar moeda com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`;
- para filtros customizados, priorizar `dataInicio` + `dataFim`;
- o frontend ja esta pronto para receber `success/data` ou payload direto, pois o `resolveApiPayload` trata ambos;
- o ranking de velocidade hoje mostra placeholder quando o backend ainda nao entrega `topFuncionariosMaisRapidos`.

## Checklist para o backend real
- implementar `GET /metrics/financeiro`
- implementar `GET /metrics/funcionarios/desempenho`
- implementar `GET /metrics/overview`
- enriquecer `GET /metrics/resumo`
- enriquecer `GET /metrics/atrasos`
- aceitar filtros de periodo em `GET /metrics/departamentos`
- aceitar filtros de periodo em `GET /metrics/funcionarios`

## Arquivos impactados no frontend
- `lib/apiService.ts`
- `app/admin/financeiro/page.tsx`
- `app/admin/metrics/page.tsx`
- `app/dashboard/page.tsx`