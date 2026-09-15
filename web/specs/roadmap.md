# Worqera Web — Roadmap

**Atualizado:** 2026-09-15 (landing `/` + branding)

Inventário: [feature-inventory.md](./feature-inventory.md) · Landing: [`../../docs/superpowers/specs/2026-09-15-worqera-landing-page.md`](../../docs/superpowers/specs/2026-09-15-worqera-landing-page.md)

## Quick-wins

- [x] **LP marketing** — `/` landing (CTA trial); login em `/login`; logo SVG + favicon no SaaS
- [x] Kanban board profissional — colunas desktop + `@dnd-kit`; mobile foco 1 setor
- [x] Consultas split — hub + `/consultas/clientes` + `/consultas/pedidos`
- [x] TV Chão renomeada para **TV Oficina**
- [x] Ops UX Onda A — shell slim + atalhos TV + consulta enxuta
- [x] Ops UX Onda B — rebrand + TVs Cliente/Chão + kanban DnD polish
- [x] Ops UX Onda C — multi-tênis (`items[]`), upload por item, badge `N pares`
- [x] Kanban labels — código loja `0001…`, sticky CTA, `/pedidos/[id]/etiqueta` + QR, detalhe + move fora do plano com comentário
- [x] Ops UX A1 — nav slim (Consultas em Principal; TVs fora da sidebar)
- [x] **QW-01** `<Toaster />` no layout
- [x] **QW-02** `/pedidos` lista
- [x] **QW-03** Logout limpa storage + cookie
- [x] **QW-04** Cookie secure condicional
- [x] **QW-05** Nav TV / setores no AppShell
- [x] **QW-UI** AppHeader em setores, billing, funcionários, admin
- [x] **QW-UI** Banner trial no shell
- [x] **QW-UI** Menu mobile (drawer)
- [x] **QW-UI** Novo pedido lê catálogo `/services` (fallback hardcoded)
- [x] **QW-13** `template.yaml` sem secrets commitados (params vazios / NoEcho)
- [x] **QW-14** Removido `/emails` (página + middleware + helpers mortos)
- [x] **TOP-01** `/settings/servicos` CRUD UI
- [x] **TOP-09** Atalhos kanban (j/k, 1–9, Enter, n)
- [x] **TOP-08** Garantia: data fim +3m + filtro em `/pedidos`
- [x] **TOP-07** Pedido rápido (templates localStorage no novo pedido)
- [x] Busca código no kanban (+ atalho `/`)
- [x] Refresh JWT automático (401 → `/auth/refresh`)
- [x] `clientId` filter na listagem de pedidos
- [x] Removido hardcode de nomes/cores em `lib/setores`
- [x] Setores da API em funcionários / consultas / SetorProgress

## Fases

### W0 — Specs — feito

### W1 — Auth SaaS + trial UX — feito

- [x] `/signup`, login v1, shell, banner trial (não dismissível quando locked), `/billing` com lock UX
- [x] Middleware: sector → kanban; `/admin/shops` só platform allowlist

### W2 — Kanban carro-chefe — feito (híbrido)

- [x] Settings setores, board por setores, move API
- [x] Unificar badges; `lib/setores` só `MAX_FOTOS`

### W3 — Billing

- [x] Gate 402 → `/billing`; webhook HMAC fail-closed (API)
- [x] AbacatePay produção (checkout real quando ApiKey + ProductId)
- [ ] E-mail de billing / recibo (SES)

### W4 — Conta setor — feito (base)

- [x] `/settings/equipe` cria membership `admin|atendimento|sector` + `sectorIds`
- [x] Nav/middleware ocultam Empresa/Admin para `sector`
- [x] API kanban: filtra fila + **encaminhar às cegas** (histórico quem/quando)

### W4b — Platform control — feito (base)

- [x] `/admin/shops` — listar, suspender, +7d trial (`PLATFORM_ADMIN_EMAILS`)

### W5 — Ops + TOPs

- [x] Clients/orders/metrics via `/api/v1`
- [x] TOP-01 UI CRUD catálogo serviços
- [x] TOP-02 `/p/[codigo]` (base)
- [x] TOP-03 etiqueta/QR
- [x] TOP-07 pedido rápido (templates)
- [x] TOP-04 regras serviço → setores (sectorPathHint no create)
- [x] TOP-05 alertas atraso (banner + digest)
- [x] TOP-10 TV settings
- [x] TOP-06 WhatsApp wa.me (opt-in shop + templates)

## Ordem restante

Invite branding fino → CNAME opcional → AbacatePay quando ligar → Meta Cloud API se necessário
