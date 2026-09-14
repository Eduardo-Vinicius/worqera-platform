# Worqera Web — Roadmap

**Atualizado:** 2026-09-14

Inventário: [feature-inventory.md](./feature-inventory.md) · Produto: [`../../api/specs/product.requirements.md`](../../api/specs/product.requirements.md)

## Quick-wins (já)

- [ ] **QW-01** `<Toaster />` no `app/layout.tsx`
- [ ] **QW-02** Página `/pedidos` (lista) ou corrigir links
- [ ] **QW-03** Logout limpa localStorage + cookie
- [ ] **QW-04** Cookie secure condicional
- [ ] **QW-05** Nav: `/tv`, `/dashboard/setores`
- [ ] **QW-14** Decidir: show e-mails audit ou remover rota/flag

## Fases

### W0 — Specs (feito)

- [x] Specs + inventário + design master

### W1 — Auth SaaS + trial UX

- [ ] `/signup`
- [ ] Auth `/api/v1` + refresh cookie
- [ ] Banner trial
- [ ] Gate → `/billing`

### W2 — Kanban carro-chefe

- [ ] Settings CRUD setores
- [ ] Board = `GET /kanban` (colunas = setores)
- [ ] Move API; admin full board
- [ ] Remover `lib/setores` como SoT (virar fallback/seed UI only)
- [ ] Preservar: DnD, filtros, atrasados, prioridade, compact, comando rápido
- [ ] **TOP-09** atalhos teclado (polish)
- [ ] Unificar badges status→setor

### W3 — Billing

- [ ] `/billing` + checkout AbacatePay + bloqueio pós-trial

### W4 — Conta setor

- [ ] Admin cria membership sector
- [ ] Board filtrado + copy “você está no setor X”

### W5 — Ops v1 API + TOPs

- [ ] Clients/orders/PDF/metrics via `/api/v1`
- [ ] **TOP-01** UI catálogo serviços
- [ ] **TOP-02** `/p/[codigo]` consulta pública
- [ ] **TOP-03** print etiqueta
- [ ] **TOP-07** pedido rápido
- [ ] **TOP-10** settings TV
- [ ] Desligar LEGADO

## Ordem

QW → W1(+A1) → W2(+A2) → W3(+A5) → W4(+A3) → W5(+A4/TOPs)
