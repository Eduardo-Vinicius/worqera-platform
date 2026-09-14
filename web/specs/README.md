# Specs — Worqera Web

## Ordem de leitura

1. [current-state.md](./current-state.md) — snapshot UI atual
2. [roadmap.md](./roadmap.md) — próximas entregas front
3. [frontend.architecture.md](./frontend.architecture.md) — rotas e pastas
4. [frontend.integration.md](./frontend.integration.md) — como o browser chama a API

## Arquivos canônicos

| Arquivo | Uso |
|---------|-----|
| [current-state.md](./current-state.md) | Onde estamos na UI |
| [roadmap.md](./roadmap.md) | Fases W* |
| [backlog.md](./backlog.md) | IDs |
| [change-log.md](./change-log.md) | Histórico |
| [frontend.architecture.md](./frontend.architecture.md) | Rotas, auth client, kanban |
| [frontend.integration.md](./frontend.integration.md) | Client HTTP, tokens, shop context |

Contrato HTTP oficial: [`../../api/specs/backend.endpoints.md`](../../api/specs/backend.endpoints.md) — **não duplicar** endpoints aqui.

Design master: [`../../docs/superpowers/specs/2026-09-14-worqera-platform-design.md`](../../docs/superpowers/specs/2026-09-14-worqera-platform-design.md)

## Ao fechar entrega

```txt
roadmap [x] → backlog → change-log → current-state → frontend.integration (se fluxo mudou)
```
