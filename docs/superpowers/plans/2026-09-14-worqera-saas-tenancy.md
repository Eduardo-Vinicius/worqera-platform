# Worqera SaaS Tenancy — Implementation Plan (Fases 1–2)

> Execute without commits unless asked. Skip Fase 3–4 (invite branding / subdomain).

**Goal:** Self-serve SaaS control: signup harden, super-admin, trial/billing UX, equipe UI, sector role kanban.

**Security:** rate-limit signup; platform admin via env allowlist; RBAC on members; no secrets in repo.

## Tasks

1. [x] Signup: reject if email already owns a shop; in-memory rate limit
2. [x] Platform admin: `PLATFORM_ADMIN_EMAILS` + `/api/v1/platform/*` + `/admin/shops` UI
3. [x] Billing: harden webhook HMAC; trial banner + force billing when gate fails; AbacatePay env-ready
4. [x] Equipe: `/settings/equipe` using members API
5. [x] A3: filter kanban + move for `role:sector`; nav hide admin/empresa for sector
6. [x] Docs

**Done 2026-09-14.** Skip Fase 3–4 until asked.
