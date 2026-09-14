# Worqera Platform — Design (2026-09-14)

## Em uma frase

Worqera é um SaaS multi-tenant de gestão de pedidos/kanban para oficinas de tênis (e afins). Casa do Tênis é o primeiro shop (legado/seed), não o nome do produto.

## Decisões fechadas

| Tema | Decisão |
|------|--------|
| API host | Node long-running (Express/Fastify), Docker, **sem Lambda** |
| DB | MongoDB |
| Billing | AbacatePay (webhook seguro + simulação em dev) |
| Trial | 7 dias `trialing` no signup; sem pagamento → bloqueio do portal (só auth + billing) |
| Kanban | Carro-chefe = colunas = **setores configuráveis por shop** |
| Admin no board | Vê e move para **qualquer** coluna |
| Conta de setor (P1) | Membership `sector` + `sectorIds` → vê só o(s) seu(s) setor(es) |
| Auth | Hash de senha; JWT + refresh HttpOnly; RBAC na API; isolamento por `shopId` |
| Specs | Padrão procedy: `api/specs/` + `web/specs/` + este design |

## Arquitetura

```
web/ (Next.js)  →  /api/v1  →  api/ (Node)  →  MongoDB
                                      ↓
                               S3 (fotos/PDF)
                                      ↓
                               AbacatePay (checkout/webhooks)
```

- Base path `/api/v1`; `GET /health`; Problem Details + `correlationId`
- Camadas: routes → application/services → repositories → Mongo
- Header opcional `X-Worqera-Shop` quando user tiver mais de um shop
- Todo documento operacional com `shopId`

## Produto — prioridades

1. **Kanban por setores** (confiável, rápido, permissões reais)
2. Clientes + pedidos (CRUD, fotos, PDF)
3. Segurança + multi-tenant
4. Signup → trial 7d → AbacatePay → gate do portal
5. Dashboard/indicadores (depois do kanban estável)

## Setores

- Collection `sectors` por `shopId` (CRUD admin/owner)
- Pedido: `currentSectorId` + `sectorHistory[]`
- Seed Casa do Tênis = fluxo atual (Atendimento → … → Final)
- P0: kanban dinâmico + admin total; P1: contas de setor

## Billing (fino)

- Plano `WORQERA_PRO`; subscription por shop
- Status: `trialing` | `active` | `past_due` | `canceled` | `expired`
- Webhook AbacatePay: secret + HMAC + idempotência
- Gate: subscription `trialing|active` para rotas operacionais

## Legacy

- Specs e seed marcam `legacy-brand: casa-do-tenis`
- E-mails/SMS/WhatsApp default do seed CdT; produto = Worqera

## Fora do v1

White-label total, multi-loja no mesmo login (além do header), mobile, seats complexos, workers de PDF em fila (pode vir depois).

## Specs

| Onde | Uso |
|------|-----|
| [api/specs/](../../api/specs/) | Contrato, modeling, roadmap back |
| [web/specs/](../../web/specs/) | UI, integração browser, roadmap front |
| Este arquivo | Decisões de produto/arquitetura |
