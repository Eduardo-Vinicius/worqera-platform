# Worqera — Implementation plan (2026-09-14)

Execute until migration/modernization is landed. Order: QW → A0 → A1 → A2 → A3 → A5 → A4/TOPs + Web.

## Checkpoint rhythm

After each phase: update specs change-log/current-state; keep LEGADO routes working until cutover.

## Phase QW

Web: Toaster, `/pedidos` list, logout+cookie, nav TV/setores.  
API: WA require, password hash, metrics admin gate, clientPhone, upload limit, refresh role, no double email, strip template secrets.

## Phase A0–A2

New host `node src/server.js`, Mongo compose, `/api/v1`, signup/shop/trial, sectors CRUD, kanban board=sectors.

## Phase A3–A5 + Web

Sector memberships, AbacatePay stubs+webhook, web signup/billing/kanban v1 client.
