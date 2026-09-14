# Instruções para agentes (Cursor / IA)

Monorepo: **`web/`** = Next.js · **`api/`** = Node API (legado Lambda → alvo hospedado + Mongo).

## Antes de codar

### Produto / decisões

1. [docs/superpowers/specs/2026-09-14-worqera-platform-design.md](docs/superpowers/specs/2026-09-14-worqera-platform-design.md)

### API (`api/`)

1. [api/specs/current-state.md](api/specs/current-state.md)
2. [api/specs/feature-inventory.md](api/specs/feature-inventory.md) — **o que já existe**
3. [api/specs/roadmap.md](api/specs/roadmap.md) — QW → A* → TOPs
4. [api/specs/backend.endpoints.md](api/specs/backend.endpoints.md)
5. [api/specs/modeling.md](api/specs/modeling.md)
6. [api/specs/product.requirements.md](api/specs/product.requirements.md)

### Web (`web/`)

1. [web/specs/current-state.md](web/specs/current-state.md)
2. [web/specs/feature-inventory.md](web/specs/feature-inventory.md)
3. [web/specs/roadmap.md](web/specs/roadmap.md)
4. [web/specs/frontend.integration.md](web/specs/frontend.integration.md)
5. [web/specs/frontend.architecture.md](web/specs/frontend.architecture.md)

## Prioridades de produto

1. Kanban por setores (configuráveis; admin total; depois conta por setor) — **preservar UX atual**
2. Quick-wins (toasts, `/pedidos`, segurança básica)
3. Multi-tenant + trial + AbacatePay
4. TOPs: catálogo serviços, consulta pública, etiqueta, alertas, WhatsApp auto

## Marca

- Produto: **Worqera**
- **Casa do Tênis** = seed/`legacyBrand` — não hardcode no core

## Ao fechar entrega

Atualizar roadmap → backlog → change-log → current-state (api e/ou web).
