# Worqera API — Estado atual

**Atualizado:** 2026-09-14 (pós implementação)

## Em uma frase

**Dois mundos no mesmo host:** `/api/v1` (Mongo SaaS — signup, trial, setores, kanban) **LIVE** + rotas **legado** Dynamo/Lambda-compat ainda montadas para CdT.

## Onde estamos

| Área | Status |
|------|--------|
| Host Node `:3001` + `/health` | **LIVE** |
| Mongo + `/api/v1` auth/shop/sectors/kanban/orders/clients/billing | **LIVE** |
| Trial 7d + gate subscription | **LIVE** |
| Seed Casa do Tênis | **LIVE** (`make api-seed`) |
| Conta role `sector` (filtro kanban) | **LIVE** (API) |
| AbacatePay real | **STUB** (dev complete + webhook skeleton) |
| Fotos S3 / PDF / WA / metrics ricos no v1 | **legado only** |
| Dynamo legado | **LIVE** paralelo |
| Front signup/billing/kanban/settings | **LIVE** |

## Próximo

1. Migrar fotos/PDF/consulta/TV/metrics para v1 (A4)
2. AbacatePay produção (A5)
3. UI admin criar membership sector (W4)
4. Cutover CdT do Dynamo → Mongo + desligar Lambda
