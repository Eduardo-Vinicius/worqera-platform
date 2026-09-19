# Worqera Web — Roadmap

**Atualizado:** 2026-09-16 (LP conversão + plano próxima sessão)

Plano detalhado: [`../../docs/superpowers/plans/2026-09-16-worqera-next-session.md`](../../docs/superpowers/plans/2026-09-16-worqera-next-session.md)

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

Rebuild PRD web+api → smoke mobile CdT → Meta Cloud API (opcional, hoje wa.me)

---

## Quick-wins web (status 2026-09-17)

| ID | Item | Status |
|----|------|--------|
| QW-15 | Empty states + CTA | **feito** |
| QW-16 | Pedido demo / onboarding | **feito** |
| QW-17 | Kanban mobile FAB + chips truncate | **feito** |
| QW-18 | Skeleton loading | **feito** |
| QW-19 | PWA manifest | **feito** |
| QW-20 | 403/404 amigáveis | **feito** |
| QW-21 | Mobile shell profissional (overflow/bleed) | **feito** |
| QW-22 | Billing UX + export CSV UI | **feito** |
| QW-23 | Digest semanal + WhatsApp suggest no move | **feito** |
| QW-24 | Branding por loja (logo+cores+superfícies) | **feito** |
| QW-25 | Admin shops nota interna | **feito** |
| QW-26 | Rate limit consulta pública | **feito** |
| QW-27 | Feedback CSAT pertinente + ver no detalhe | **feito** |
| QW-28 | Marcar entregue no detalhe | **feito** |
| QW-29 | Convite setor copy “só sua fila” | **feito** |
| QW-30 | Badge reaberto + limpar feedback no reopen | **feito** |
| QW-31 | Sino inbox (feedback/prontos) + entregue na coluna final | **feito** |
| QW-32 | Rota sempre termina em setor Final | **feito** |
| QW-33 | ⌘K busca pedido + botão no header | **feito** |
| QW-34 | Kanban drawer: copiar link / WA / imprimir | **feito** |
| QW-35 | Novo pedido: data +3d chips + clientes recentes | **feito** |
| QW-36 | Financeiro: caixa do dia + serviços multi-par + CSV | **feito** |
| QW-37 | Loop: etiqueta Zap created + Avisar pronto sticky | **feito** |
| QW-38 | Tour operação (checklist Loop) + home next-actions | **feito** |
| QW-39 | Multi-vertical: itemLabel + Empresa tipo de negócio | **feito** |
| QW-40 | Logout chama `POST /auth/logout` | **feito** |
| QW-41 | Employees API `requireRole(owner,admin)` | **feito** |
| QW-42 | MW: atendimento bloqueado em settings/billing/admin | **feito** |
| QW-43 | Status Pack banner + copy Empresa | **feito** |
| QW-44 | Starter Kits (`POST …/apply-starter-kit`) | **feito** |
| QW-45 | Renomear setor inline + copiar link `/p` | **feito** |

## Propostas SaaS (backlog priorizado)

1. ~~Digest semanal owner~~ **feito**
2. ~~Export CSV~~ **feito**
3. **Trial e-mails** D-2 / D-0 — script + [ops doc](../../docs/ops/trial-reminders.md); cron PRD  
4. **WhatsApp auto** Cloud API (adiado; hoje Status Pack wa.me)  
5. **Metas SLA** simples no dashboard owner  
6. ~~Platform admin trial/pedidos/nota~~ **feito (base)**  
7. **App nativo** — AS-IS em `docs/superpowers/specs/2026-09-18-worqera-app-asis-mirror.md`  
8. ~~**Starter Kits** por vertical~~ **feito** (Empresa → Aplicar kit)  

## Observabilidade (web + ops)

- [x] Badge “Sistema ok” (`SystemOkBadge` + `/health/ready`)  
- [ ] Sentry front (env DSN) — stack sem reproduzir bug do cliente  
- Ver API roadmap: `/health`, logs JSON, healthcheck Docker
