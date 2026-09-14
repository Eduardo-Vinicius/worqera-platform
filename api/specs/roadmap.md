# Worqera API — Roadmap

**Atualizado:** 2026-09-14

## Norte

Sair do Lambda/DynamoDB → API Node + Mongo multi-tenant, com **kanban por setores** como carro-chefe, trial 7d e AbacatePay.

## Fases

### A0 — Bootstrap host (próxima)

- [ ] App Node long-running (`/api/v1`, `/health`)
- [ ] Docker Compose Mongo (dev); API no host
- [ ] `.env.example` / config; correlationId; Problem Details
- [ ] Remover dependência de Lambda no caminho feliz de dev
- [ ] Makefile `dev` / `health` (estilo procedy)

### A1 — Identity + Shop + segurança

- [ ] Collections `users`, `shops`, `memberships`
- [ ] Signup: shop + owner + subscription `trialing` (7d)
- [ ] Login / refresh HttpOnly / logout
- [ ] Hash de senha; fechar register aberto
- [ ] JWT com `shopId` + role; header `X-Worqera-Shop`
- [ ] Gate subscription `trialing|active` em rotas operacionais

### A2 — Setores + Kanban (carro-chefe)

- [ ] CRUD `sectors` por shop
- [ ] Pedido com `currentSectorId` + `sectorHistory`
- [ ] `GET /kanban` colunas dinâmicas por setores ativos
- [ ] Admin/owner: ver todas as colunas; mover para qualquer setor
- [ ] Seed Casa do Tênis (`legacy-brand`)
- [ ] Migrar/adaptar domínio pedido+cliente mínimos para Mongo

### A3 — Contas de setor (P1 kanban)

- [ ] Membership `role: sector` + `sectorIds`
- [ ] Kanban filtrado: só colunas/cards do setor
- [ ] Regras de movimento (sair do próprio setor → próximo permitido)
- [ ] Admin cria/convoca users de setor

### A4 — Ops completo no Mongo

- [ ] Clientes, pedidos, fotos (S3), PDF
- [ ] Funcionários (chão, distinto de membership login se necessário)
- [ ] Dashboard / indicadores scoped por `shopId`
- [ ] Notificações com branding do shop (não hardcoded CdT)

### A5 — Billing AbacatePay

- [ ] Plano `WORQERA_PRO`
- [ ] Checkout session → URL AbacatePay
- [ ] Webhook `/webhooks/abacatepay` (secret + HMAC + idempotência)
- [ ] `subscription.completed|renewed|cancelled`
- [ ] Dev simulation endpoint
- [ ] Front gate pós-trial

### A6 — Endurecimento

- [ ] Índices Mongo (`shopId` + queries de kanban)
- [ ] RBAC em todas as rotas sensíveis
- [ ] Desligar/arquivar path Lambda + DynamoDB
- [ ] Observabilidade básica

## Próximas entregas (ordem)

1. **A0** bootstrap  
2. **A1** auth+shop+trial  
3. **A2** setores+kanban admin  
4. **A5** AbacatePay (pode paralelizar após A1)  
5. **A3** contas setor  
6. **A4** resto ops  

## Fora deste roadmap

Mobile, white-label total, multi-região, seats complexos.
