# Worqera API — Roadmap

**Atualizado:** 2026-09-14

## Norte

Sair do Lambda/Dynamo → Node + Mongo multi-tenant. **Kanban por setores** = carro-chefe. Trial 7d + AbacatePay. Preservar o que já funciona (pedidos, clientes, TVs, métricas, fotos, PDF).

Inventário completo: [feature-inventory.md](./feature-inventory.md).

---

## Quick-wins (fazer cedo — inclusive no legado)

Ordem sugerida (pode rodar **em paralelo** ao A0):

| # | ID | Item |
|---|-----|------|
| 1 | QW-01…05 | Front: Toaster, `/pedidos`, logout, cookie, nav TV/setores |
| 2 | QW-06,09–12 | Back: WA require, upload limit, clientPhone, double e-mail, refresh role |
| 3 | QW-07,08,13 | Segurança: hash senha, gate metrics, limpar secrets do template |
| 4 | QW-14 | E-mail audit: ligar ou cortar |

Detalhe: [product.requirements.md](./product.requirements.md) § Quick-wins.

---

## Fases estruturais

### A0 — Bootstrap host

- [ ] App Node long-running (`/api/v1`, `/health`)
- [ ] Compose Mongo; API no host; Makefile
- [ ] Problem Details + correlationId
- [ ] Dev sem Lambda

### A1 — Identity + Shop + segurança

- [ ] `users`, `shops`, `memberships`
- [ ] Signup + trial 7d
- [ ] Login / refresh HttpOnly / logout
- [ ] Password hash; fechar register aberto
- [ ] JWT `shopId` + role; `X-Worqera-Shop`
- [ ] Gate subscription

### A2 — Setores + Kanban (carro-chefe)

- [ ] CRUD `sectors` por shop
- [ ] Pedidos Mongo mínimos + history
- [ ] `GET /kanban` + `POST .../move` (admin full board)
- [ ] Unificar coluna = setor (RF-KAN-12)
- [ ] Seed Casa do Tênis
- [ ] TOP-04 início: regras fluxo por serviço (mínimo viável)
- [ ] Preservar UX: filtros, prioridade, atrasados, dialog assignee

### A3 — Contas de setor

- [ ] Membership `sector` + `sectorIds`
- [ ] Board filtrado + regras de move
- [ ] Admin convida/cria user de setor

### A4 — Ops completo no Mongo

- [ ] Clientes, fotos S3, PDF, ZIP, consulta
- [ ] Funcionários + dashboard + metrics (com RBAC)
- [ ] TVs consumindo API nova
- [ ] Notificações com branding do shop
- [ ] TOP-01 catálogo serviços
- [ ] TOP-02 consulta pública
- [ ] TOP-03 etiqueta/QR
- [ ] TOP-05 alertas atraso
- [ ] TOP-06 WhatsApp auto (opt-in)

### A5 — Billing AbacatePay

- [ ] Checkout + webhook seguro + dev simulate
- [ ] Gate pós-trial

### A6 — Endurecimento

- [ ] Índices Mongo; audit RBAC; decommission Lambda/Dynamo

---

## Features tops (após kanban A2 estável)

Ordem de valor:

1. **TOP-04** regras de fluxo por serviço (alimenta o kanban)
2. **TOP-01** catálogo de serviços por shop
3. **TOP-02** consulta pública por código
4. **TOP-05** alertas de atraso
5. **TOP-03** etiqueta/QR
6. **TOP-06** WhatsApp auto
7. **TOP-07 / TOP-10** pedido rápido + TV settings

---

## Próximas entregas (ordem)

1. **Quick-wins** QW-01…14 (não bloqueiam A0)  
2. **A0** bootstrap  
3. **A1** auth+shop+trial  
4. **A2** setores+kanban admin  
5. **A5** AbacatePay (após A1)  
6. **A3** contas setor  
7. **A4** + TOPs  

## Fora deste roadmap

Mobile, white-label total, multi-região, seats complexos.
