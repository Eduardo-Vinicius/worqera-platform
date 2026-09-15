# Worqera API — Change log

## 2026-09-15

- **Carga CdT:** scripts `extract-cdt-report001.py`, `import-cdt-report001.js`, `import-cdt-open-snapshot.js`; histórico `delivered` com códigos `NNNN-26`; guia PRD em `docs/ops/cdt-historical-import-prd.md`.
- **Consultas API:** `listClients` com `q` + cursor/limit; `listOrders` status CSV + code prefix; index `{shopId,status,createdAt}`.

## 2026-09-14

- **Kanban UX:** comentários em lista (`POST /orders/:id/comments`); move no plano vs fora do plano separados; card inteiro arrastável.
- **Product + Fase 3:** Shop branding (logo/phone/address), tvSettings, WhatsApp wa.me prefs, partnerCode; mailer Gmail-first + subject `[Empresa]`; AbacatePay soft-off (`WORQERA_AbacatePay__Enabled=false`); `.env.prod.example`; seed-catalog endpoint.
- **Onboarding→TOP-05:** shop.onboarding; invites; member reset-password; TOP-04 sectorPathHint no create order; alerts delays+digest; mailer SES/Gmail/console; billing receipt e-mail.
- **P0:** AbacatePay `subscriptions/create` quando ApiKey+ProductId; webhook exige secret+HMAC em produção; `forgot/reset-password`; refresh cookie; public order exige shop slug se ambíguo; `node --test` isolamento/HMAC.
- **Blind forward:** `GET /kanban` + `forwardTargets`; sector move para qualquer destino ativo; `sectorHistory` com `fromSectorId`, `movedByName/Email`, `action`.
- **SaaS Fases 1–2:** rate limit signup/login; `PLATFORM_ADMIN_EMAILS` + `/platform/shops`; members role/`sectorIds`; webhook HMAC + fail-closed; `me.platformAdmin`; kanban sector ACL.
- **Near-QW 2:** `listOrders` aceita `clientId`; web auto-refresh em 401.
- **QW pack:** `ensureWarranty` no create (+3 meses se ativa sem data); serialize `warranty`/`garantia`; QW-13/14 fechados.
- **Kanban labels:** `nextOrderCode` shop-wide (`0001`, pad 4); `Order.plannedSectorIds`; move off-path exige `note`.
- **Ops UX Onda C:** `Order.items[]`, fotos por item, `itemCount`. Billing stub.
