# Worqera API — Change log

## 2026-09-14

- **A4 Mongo cutover ops:** storage local/S3 (`storageService`), `GET /files/*`, order photos/PDF/ZIP, employees CRUD, listOrders filters+cursor, legacy serializers, dashboard (`/` + `/setores`), metrics v1, `GET /sectors/stats`. Dynamo `mountLegacyRoutes` removido.
- **A0–A2 + billing stub:** API v1 Node + Mongo (`src/app.js`, `src/server.js`, `src/v1/*`) — signup/trial 7d, shops/members, sectors CRUD, kanban+move (admin full / sector filter), clients, orders `DDMMYY-SEQ`, billing AbacatePay mock+webhook, dashboard, public order, services catalog.
- Legado Dynamo no mesmo Express; `docker-compose` mongo + `Makefile`; seed Casa do Tênis.
- **Quick-wins:** bcrypt (+rehash legado), metrics admin gate, WhatsApp require, upload×8, clientPhone, no double e-mail, refresh com role, secrets fora do `template.yaml`.
- Specs + inventário + RFs/TOPs/QWs.
