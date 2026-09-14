# Worqera Web — Roadmap

**Atualizado:** 2026-09-14

## Fases

### W0 — Specs + alinhamento (feito)

- [x] Specs iniciais + design master
- [x] `.env.example` com API URL / app name

### W1 — Auth SaaS + trial UX

- [ ] `/signup` (loja + owner)
- [ ] Login contra `/api/v1/auth/*`
- [ ] Refresh cookie; `auth/me`
- [ ] Banner “X dias de trial”
- [ ] Redirect `SUBSCRIPTION_INACTIVE` → `/billing`

### W2 — Kanban carro-chefe (setores dinâmicos)

- [ ] Admin: CRUD `/setores` (ou settings)
- [ ] `/status` (ou rename `/kanban`) consome `GET /kanban`
- [ ] Drag move → `POST /kanban/orders/{id}/move`
- [ ] Admin vê todas as colunas; remove hardcode `lib/setores` como fonte de verdade
- [ ] Empty states / loading sólidos (produto primeiro)

### W3 — Billing AbacatePay

- [ ] `/billing` — plano, CTA, redirect checkout
- [ ] Tela de bloqueio pós-trial (só billing)
- [ ] Retorno pós-pagamento

### W4 — Conta de setor

- [ ] UI admin: criar membership sector + setor
- [ ] Board filtrado para role `sector`
- [ ] Feedback claro “você está no setor X”

### W5 — Ops no v1 API

- [ ] Clients/orders/PDF via `/api/v1`
- [ ] Dashboard summary novo
- [ ] Remover chamadas LEGADO

## Ordem

W0 → W1 (com A1) → W2 (com A2) → W3 (com A5) → W4 (com A3) → W5
