# Instruções para agentes (Cursor / IA)

Monorepo: **`web/`** = Next.js · **`api/`** = Node API (legado Lambda → alvo hospedado + Mongo).

## Antes de codar

### Produto / decisões

1. [docs/superpowers/specs/2026-09-14-worqera-platform-design.md](docs/superpowers/specs/2026-09-14-worqera-platform-design.md)

### API (`api/`)

1. [api/specs/current-state.md](api/specs/current-state.md)
2. [api/specs/roadmap.md](api/specs/roadmap.md)
3. [api/specs/backend.endpoints.md](api/specs/backend.endpoints.md) — contrato `/api/v1`
4. [api/specs/modeling.md](api/specs/modeling.md)
5. [api/specs/product.requirements.md](api/specs/product.requirements.md)

### Web (`web/`)

1. [web/specs/current-state.md](web/specs/current-state.md)
2. [web/specs/roadmap.md](web/specs/roadmap.md)
3. [web/specs/frontend.integration.md](web/specs/frontend.integration.md)
4. [web/specs/frontend.architecture.md](web/specs/frontend.architecture.md)

HTTP contract fica no **back** — front não duplica endpoints.

## Prioridades de produto

1. Kanban por setores (configuráveis; admin vê tudo; depois conta por setor)
2. Segurança + multi-tenant (`shopId`)
3. Trial 7d + AbacatePay
4. Ops (clientes/pedidos/dashboard)

## Marca

- Produto: **Worqera**
- **Casa do Tênis** = seed/`legacyBrand` — não hardcode no core

## Ao fechar entrega

Atualizar roadmap → backlog → change-log → current-state (api e/ou web).
