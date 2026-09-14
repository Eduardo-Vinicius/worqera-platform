# Integracao Frontend - Admin Financeiro e Metricas

## Objetivo
Este documento descreve os novos endpoints e os ajustes de resposta no backend para montar telas administrativas de financeiro e performance operacional.

Base de rotas: `/metrics`  
Autenticacao: `Bearer Token` obrigatorio em todas as rotas.

## Novos Endpoints

### 1) `GET /metrics/financeiro`
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

Resposta:
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

### 2) `GET /metrics/funcionarios/desempenho`
Retorna ranking de funcionarios por produtividade e por velocidade.

Query params opcionais:
- `limit`: quantidade de funcionarios por ranking (default: `10`)
- `periodo`: `7d`, `15d`, `30d`, `90d`, `180d`, `1y`
- `dataInicio`, `dataFim`

Exemplo:
```http
GET /metrics/funcionarios/desempenho?periodo=30d&limit=5
```

Resposta:
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

### 3) `GET /metrics/overview`
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

Resposta:
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

## Endpoints Existentes Que Foram Enriquecidos

### `GET /metrics/resumo`
Mantem compatibilidade e agora inclui:
- `noPrazo`
- `taxaAtraso`
- `periodo`

### `GET /metrics/atrasos`
Mantem compatibilidade e agora inclui:
- `atrasoMedioHoras`
- `itens[].diasAtraso`
- suporte a filtros por periodo/dataInicio/dataFim

### `GET /metrics/departamentos` e `GET /metrics/funcionarios`
Mantidos, com suporte a filtro de periodo.

## Recomendacao de Telas Admin (Frontend)

### Tela 1: Financeiro
- Cards principais:
  - `receitaPrevista`
  - `receitaRecebida`
  - `receitaPendente`
  - `despesas`
  - `lucroPrevisto`
  - `ticketMedio`
- Grafico de linha/area: `evolucaoDiaria`
- Tabela 1: `receitaPorStatus`
- Tabela 2: `topServicos`

### Tela 2: Metricas Operacionais
- Cards:
  - `resumo.total`
  - `resumo.abertos`
  - `resumo.finalizados`
  - `resumo.atrasados`
  - `resumo.taxaAtraso`
- Lista de atrasos criticos: `atrasos.itens` (ordenado por maior atraso)
- Ranking produtividade: `topFuncionariosPorPedidos`
- Ranking velocidade: `topFuncionariosMaisRapidos`

### Tela 3: Home Admin (resumo geral)
- Use `GET /metrics/overview` para reduzir chamadas.

## Regras de Negocio Importantes
- Filtro de periodo usa data de criacao do pedido (`createdAt`/`dataCriacao`).
- `receitaRecebida` considera:
  - pedido finalizado: valor total do pedido;
  - pedido aberto: total menos valor restante (fallback para valor de sinal quando necessario).
- Ranking de funcionarios usa historico de setores (`setoresHistorico`) para calcular tempo medio por etapa.

## Observacoes para implementacao
- Todos os valores monetarios chegam como `number` em reais (sem formatacao).
- Formatar moeda no frontend com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
- Para filtros customizados no frontend, prefira `dataInicio` + `dataFim`.
- O backend aplica cache curto (`METRICS_CACHE_MS`, default `30000ms`).
