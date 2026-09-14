# Worqera API — Estado atual

**Atualizado:** 2026-09-14

## Em uma frase

API **legado** Express + Lambda + DynamoDB, single-shop, com domínio operacional **rico** (pedidos, kanban status, setores hardcoded, fotos, PDF, dashboard, metrics, TVs via front, e-mail CdT). Alvo: Node hospedado + Mongo multi-tenant + kanban por setores + trial/AbacatePay.

**Inventário detalhado:** [feature-inventory.md](./feature-inventory.md)

## Onde estamos (mapa)

| Área | Status | Notas |
|------|--------|-------|
| Host Lambda + SAM | legado | → A0 processo contínuo |
| Express domínio ops | **LIVE útil** | Reaproveitar regras na API nova |
| Auth JWT | PARTIAL | Plaintext password; register aberto; refresh perde role |
| Clientes / Pedidos | LIVE | `clientPhone` gap no create; código DDMMYY-SEQ |
| Kanban status + mover setor | LIVE | Dual status×setor; RBAC cosmético |
| Setores CRUD / por shop | ausente | Hardcoded `SETORES_PADRAO` |
| Conta setor real | ausente | Roles seed sem enforce |
| Funcionários | LIVE | Chão ≠ login |
| Upload / PDF / ZIP | LIVE | Limite 5 vs 8 |
| Dashboard / Metrics / Financeiro | LIVE | Metrics sem gate admin API |
| E-mail notificações | LIVE | Brand CdT; double send create; audit desmontada |
| SMS final | PARTIAL | Flag |
| WhatsApp | PARTIAL | Manual; require quebrado; auto não wired |
| Shop / Trial / AbacatePay | ausente | |
| Specs | iniciado | Este diretório |

## Stack atual → alvo

| | Atual | Alvo |
|--|-------|------|
| Host | Lambda + serverless-http | Node Docker long-running |
| DB | DynamoDB (scans) | Mongo + `shopId` |
| Billing | — | AbacatePay |
| Kanban SoT | status strings + setores fixos | setores por shop |

## Riscos críticos

1. Senhas plaintext + secrets no `template.yaml`
2. Sem tenant
3. AuthZ cosmética
4. Scans DynamoDB
5. Brand CdT no core de e-mail/SMS
6. WhatsApp quebrado em runtime

## Próximo

1. Quick-wins QW-* (segurança/UX)  
2. A0 bootstrap  
Ver [roadmap.md](./roadmap.md).
