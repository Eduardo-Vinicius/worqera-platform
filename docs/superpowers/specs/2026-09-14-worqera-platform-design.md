# Worqera Platform — Design (2026-09-14)

## Em uma frase

Worqera é um SaaS multi-tenant de gestão de pedidos/kanban para oficinas de tênis. Casa do Tênis é o primeiro shop (legado/seed), não o nome do produto.

## Decisões fechadas

| Tema | Decisão |
|------|--------|
| API host | Node long-running, Docker, **sem Lambda** |
| DB | MongoDB |
| Billing | AbacatePay |
| Trial | 7 dias; sem pagamento → bloqueio (só auth + billing) |
| Kanban | Carro-chefe = **setores configuráveis por shop** |
| Admin board | Vê e move para **qualquer** coluna |
| Conta setor (P1) | `role: sector` + `sectorIds` |
| Auth | Hash; JWT + refresh HttpOnly; RBAC API; `shopId` |
| Specs | Padrão procedy |

## O que já existe (não reinventar)

Inventário: [api/specs/feature-inventory.md](../../api/specs/feature-inventory.md).

**Preservar / migrar:** clientes, pedidos (código curto, serviços, sinal, garantia, fotos, PDF, ZIP), kanban UX (DnD, filtros, atrasados, prioridade, assignee), mover setor + histórico, funcionários, dashboard, metrics/financeiro, 2 TVs, e-mail de status, consulta.

**Corrigir cedo (QW):** toasts, `/pedidos` 404, logout, WhatsApp require, hash senha, gate metrics, secrets no template, dual e-mail, `clientPhone`, upload limit, refresh role.

**Substituir no alvo:** colunas = status strings → colunas = setores do shop; Dynamo/Lambda → Mongo/host; brand CdT hardcoded → branding do shop.

## Arquitetura

```
web/ (Next.js)  →  /api/v1  →  api/ (Node)  →  MongoDB
                                      ↓
                               S3 · AbacatePay
```

## Kanban (carro-chefe)

1. Shop cadastra setores (ordem = fluxo).
2. Board = colunas desses setores.
3. Admin/owner: visão total + move livre.
4. Conta setor: só suas colunas + regras de saída.
5. `status` de negócio derivado (`open|in_progress|ready|delivered`); **não** dual status×setor como SoT.
6. UX legada (filtros, SLA visual, comando rápido) permanece.

## Features tops (agregar)

| # | Feature |
|---|---------|
| TOP-01 | Catálogo de serviços por shop |
| TOP-02 | Consulta pública por código |
| TOP-03 | Etiqueta/QR imprimível |
| TOP-04 | Regras de fluxo por serviço → setores |
| TOP-05 | Alertas de atraso |
| TOP-06 | WhatsApp auto (opt-in) |
| TOP-07 | Pedido rápido / templates |
| TOP-08 | Garantia lifecycle |
| TOP-09 | Atalhos teclado no kanban |
| TOP-10 | TV configurável |

Detalhe RF: [api/specs/product.requirements.md](../../api/specs/product.requirements.md).

## Billing

AbacatePay + webhook seguro; plano `WORQERA_PRO`; trial no signup.

## Ordem de execução

1. Quick-wins  
2. A0 → A1 → **A2 kanban** → A5 billing → A3 sector accounts → A4 ops + TOPs  

## Specs

| Onde | Uso |
|------|-----|
| [api/specs/](../../api/specs/) | Back + inventário + RFs |
| [web/specs/](../../web/specs/) | Front |
| Este arquivo | Decisões |
