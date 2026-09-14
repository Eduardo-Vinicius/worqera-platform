# Worqera Web — Arquitetura front

**Atualizado:** 2026-09-14

## Pastas (atual)

```
web/
  app/           # App Router pages
  components/    # UI + domínio
  hooks/
  lib/           # apiService, setores (legado), utils
  styles/
  middleware.ts  # gate cookie/JWT
```

## Alvo

- `lib/api/` — client tipado `/api/v1`, correlation id, tratamento Problem Details
- `lib/auth/` — session, refresh, shop context
- `lib/kanban/` — tipos coluna/card, DnD helpers
- Fonte de verdade de setores = API (não `lib/setores` hardcoded)

## Auth client (alvo)

1. Access token em memória ou cookie curto  
2. Refresh HttpOnly via `/auth/refresh`  
3. `GET /auth/me` hidrata user, memberships, subscription  
4. Header `X-Worqera-Shop` quando houver mais de um shop  
5. Middleware: rotas protegidas; `/billing` acessível com JWT mesmo se subscription inactive; operacional bloqueado se inactive  

## Kanban UX

- Colunas = setores ativos ordenados
- Admin: board completo + move livre
- Sector role: uma (ou N) colunas; UI enxuta
- Performance: listas virtuais se volume crescer (depois)

## Branding

- Produto: Worqera (`NEXT_PUBLIC_APP_NAME`)
- CdT só como dados do shop seed / `legacyBrand` — não hardcode de marketing no shell
