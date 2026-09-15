# Worqera Landing Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** LP at `/`, login at `/login`, Worqera logo/favicon across SaaS.

**Tech:** Next.js App Router in `web/`.

## Files

- Create: `docs/superpowers/specs/2026-09-15-worqera-landing-page.md` (done)
- Create: `web/components/brand/WorqeraLogo.tsx`
- Create: `web/components/landing/LandingPage.tsx` (+ small section helpers if needed)
- Create: `web/app/login/page.tsx` (move from `web/app/page.tsx`)
- Replace: `web/app/page.tsx` → LP
- Create/replace: `web/app/icon.svg`, copy `web/public/favicon.ico` from site
- Modify: `web/middleware.ts`, signup, sidebar, forgot/reset/invite links, `layout.tsx` metadata
- Update: `web/specs/change-log.md`, `current-state.md` briefly

## Tasks

1. Brand assets + `WorqeraLogo`
2. Middleware + move login + fix links
3. Landing page
4. Auth/shell logo polish
5. Specs changelog

## Done when

- `/` shows LP; `/login` authenticates; icons/logo consistent
