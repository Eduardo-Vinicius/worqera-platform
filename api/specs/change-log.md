# Worqera API — Change log

## 2026-09-14

- **A0 bootstrap:** API v1 Node + Mongo em `src/app.js` / `src/server.js` / `src/v1/*` (auth signup/login/refresh/me, shops/members, sectors, kanban+move, clients, orders DDMMYY-SEQ, billing mock AbacatePay + webhook idempotente, dashboard, public order, services catalog).
- Legado Dynamo montado no mesmo Express (`handler.js` → `createExpressApp()`); `docker-compose` mongo:7 + `Makefile` (dev/health/seed); seed `casa-do-tenis`.
- Specs iniciais + **inventário legado** (`feature-inventory.md`).
- RFs expandidos: kanban RF-KAN-*, preservar ops LIVE, **TOP-01…10**, **QW-01…14**.
- Roadmap: quick-wins primeiro; A2 unifica coluna=setor; modeling orders enriquecido + `service_catalog`.
- Decisões: Node, Mongo, AbacatePay, trial 7d, kanban setores, CdT = seed.
- Design master atualizado com “não reinventar” + tops.