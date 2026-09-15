# Worqera Landing Page + Branding (SaaS)

**Date:** 2026-09-15  
**Status:** Approved  
**Scope:** `web/` only

## Goal

`/` becomes the product landing page that explains who Worqera is, why workshops need it, and pushes **trial signup**. Login moves to `/login`. Brand logo/colors from `worqera-site` land in the SaaS (auth screens, shell, favicon).

## Routing

| Path | Role |
|------|------|
| `/` | Marketing LP |
| `/login` | Auth (former `/`) |
| `/signup` | Trial signup (unchanged URL) |

- Unauthenticated access to protected routes → `/login`
- Authenticated visit to `/` or `/login` → `/dashboard` (or `/kanban` for `sector` if already handled elsewhere; default `/dashboard`)
- Logout may land on `/` (LP) or `/login` — prefer `/login` for returning users

## Landing sections (PT)

1. Header — logo, anchors, **Começar grátis** → `/signup`, **Entrar** → `/login`
2. Hero — brand-forward, one headline, one supporting line, primary CTA signup, secondary login
3. Quem somos — Worqera / Axisbyte; product for service workshops
4. Por que precisam — chaos of WhatsApp/spreadsheets; lost orders; no visibility
5. Como resolve — sector kanban, public tracking, alerts, team roles
6. Parceiros — A Casa do Tênis, Sapataria Paulista, Axisbyte + short quotes
7. Financeiro — AbacatePay for subscription / PIX in-product
8. Como começar — 3 steps → account in minutes
9. Trial — 7 days free → `/signup`; compact plans (Starter / Professional / Enterprise style, “comece grátis”)
10. FAQ + final CTA
11. Footer — WhatsApp secondary only

**Out of scope:** EN i18n, YouTube embed, full security encyclopedia, white-label.

## Visual

- LP uses marketing dark palette from site: `#110f17` bg, `#7D26DE` / `#AE50FD` accents, `#161222` surfaces, `#2b2142` borders
- App shell keeps existing light/dark product tokens; brand purple already aligned
- Logo: SVG `WorqeraLogo` (purple gradient + W mark) from `worqera-site`
- Favicon / app icon from site assets (`favicon.ico`, branded SVG)

## Branding touchpoints

- `WorqeraLogo` shared component
- `/login`, `/signup`, forgot/reset as needed — dark brand panel + logo
- `AppSidebar` logo mark
- Root metadata icons

## Success criteria

- Visitor opens `/` and can reach signup/login in one click
- Login no longer lives at `/`
- Logo consistent on LP, auth, and in-app shell + tab icon
