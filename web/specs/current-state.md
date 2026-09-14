# Worqera Web — Estado atual

**Atualizado:** 2026-09-14

## Em uma frase

Next.js 15 com login, dashboard, **kanban `/status` (carro-chefe UI)**, clientes, novo pedido, consultas, funcionários, admin financeiro/métricas e 2 modos TV — ainda na API LEGADO; setores e catálogo de serviços hardcoded no client.

**Inventário:** [feature-inventory.md](./feature-inventory.md)

## Stack

Next 15.2 / React 19 / Tailwind 4 / Radix · `lib/apiService.ts` · auth cookie+localStorage · `NEXT_PUBLIC_APP_NAME=Worqera`

## Mapa rápido

| Área | Status |
|------|--------|
| Login / dashboard / kanban / clientes / consultas / funcionários / admin / TVs | LIVE |
| `/pedidos` lista | **404** |
| `/emails` | HIDDEN |
| `/dashboard/setores`, `/tv` | LIVE orfãs no nav |
| Toaster sonner | usado sem `<Toaster />` |
| Signup / billing / setores CRUD / conta setor | ausente |
| Catálogo serviços | hardcoded em `/pedidos/novo` |

## Kanban UI (resumo)

DnD, dialog assignee, filtros (hoje/atrasados/prioridade), compact, comando rápido, PDF, `CardDetalhesPedido`, `MoverSetorButton`, cores `lib/setores.ts`. Colunas = **status API**, não setores CRUD.

## Próximo

Quick-wins W (Toaster, `/pedidos`, logout, nav) → W1/W2 com API A1/A2. Ver [roadmap.md](./roadmap.md).
