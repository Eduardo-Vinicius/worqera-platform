# Worqera Web — Estado atual

**Atualizado:** 2026-09-14

## Em uma frase

Next.js 15 App Router com login, dashboard, kanban (`/status`), clientes, pedidos, admin financeiro/métricas e TVs — ainda acoplado à **API LEGADO** (sem tenant/trial) e setores parcialmente hardcoded no client.

## Stack

- Next.js 15.2.x, React 19, Tailwind 4, Radix/shadcn
- Auth: `localStorage` + cookie `token`; `middleware.ts` decode JWT
- API: `lib/apiService.ts` → `NEXT_PUBLIC_API_URL` (default `:3001`)
- Brand: `NEXT_PUBLIC_APP_NAME` (Worqera)

## Mapa de rotas

| Rota | Status | Notas |
|------|--------|-------|
| `/` | live | Login |
| `/dashboard` | live | Stats LEGADO |
| `/dashboard/setores` | live | |
| `/status` | live | Kanban principal (carro-chefe alvo) |
| `/pedidos/novo` | live | |
| `/clientes/**` | live | |
| `/consultas` | live | |
| `/funcionarios` | live | |
| `/admin/financeiro`, `/admin/metrics` | live | Gate role admin só no front |
| `/tv`, `/tv-dashboard` | live | |
| `/signup` | **ausente** | Precisa para trial |
| `/billing` | **ausente** | AbacatePay + bloqueio pós-trial |
| `/setores` (CRUD admin) | **ausente** | Setores hoje hardcoded em `lib/setores` |

## Gaps vs produto alvo

- Sem signup/trial/billing UI
- Kanban não é 100% dinâmico por shop (cores/nomes locais)
- Sem modo “conta de setor” (board filtrado)
- Auth client não usa refresh HttpOnly ainda
- Sem `X-Worqera-Shop`

## Próximo (front)

Alinhar com ondas W1–W2 após A1/A2 — ver [roadmap.md](./roadmap.md).
