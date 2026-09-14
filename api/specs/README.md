# Specs — Worqera API

## Ordem de leitura

1. [current-state.md](./current-state.md) — snapshot atual (legado Lambda + alvo)
2. [feature-inventory.md](./feature-inventory.md) — o que já existe (sem gap)
3. [roadmap.md](./roadmap.md) — QW + fases A* + TOPs
4. [product.requirements.md](./product.requirements.md) — RF-* / TOP-* / QW-*
5. [backend.architecture.md](./backend.architecture.md) — host, camadas, segurança
6. [modeling.md](./modeling.md) — Mongo
7. [backend.endpoints.md](./backend.endpoints.md) — contrato HTTP `/api/v1`

## Arquivos canônicos

| Arquivo | Uso |
|---------|-----|
| [current-state.md](./current-state.md) | Onde estamos |
| [feature-inventory.md](./feature-inventory.md) | Inventário legado × alvo |
| [roadmap.md](./roadmap.md) | Feito / pendente / próximas |
| [backlog.md](./backlog.md) | IDs de entrega |
| [change-log.md](./change-log.md) | Histórico datado |
| [product.requirements.md](./product.requirements.md) | Requisitos + tops + QWs |
| [backend.architecture.md](./backend.architecture.md) | Arquitetura alvo |
| [modeling.md](./modeling.md) | Collections |
| [backend.endpoints.md](./backend.endpoints.md) | Contrato HTTP + erros |
| [frontend-integration.md](./frontend-integration.md) | Ondas de integração front |

Design master: [`../../docs/superpowers/specs/2026-09-14-worqera-platform-design.md`](../../docs/superpowers/specs/2026-09-14-worqera-platform-design.md)

Front: [`../../web/specs/`](../../web/specs/)

## Ao fechar entrega

```txt
roadmap [x] → backlog → change-log → current-state → endpoints (se HTTP) → modeling (se schema)
```
