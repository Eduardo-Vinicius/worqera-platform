# Worqera — Branding por loja (design)

**Data:** 2026-09-17  
**Status:** aprovado (manda bala) · implementação imediata

## Objetivo

Cada oficina tem cara própria: **logo + cores** configuráveis em Empresa, aplicadas com qualidade em **mobile e desktop** nas superfícies que o cliente e a equipe veem.

## Modelo `Shop.branding`

| Campo | Tipo | Uso |
|-------|------|-----|
| `displayName` | string | Nome público |
| `logoUrl` | string | URL pública do logo |
| `primaryColor` | `#RRGGBB` | Cor principal (headers, links, accent) |
| `accentColor` | `#RRGGBB` | CTA / ação (opcional; fallback = primary) |
| phone, address, emailFromName, legacyBrand | existentes | inalterados |

Validação: hex `#RGB` ou `#RRGGBB`; vazio = tokens Worqera padrão.

## Upload de logo

- `POST /api/v1/shops/current/logo` (owner/admin, multipart, ≤2MB, png/jpeg/webp)
- Storage key: `shops/{shopId}/branding/logo.{ext}`
- `logoUrl` = URL absoluta via `PUBLIC_API_URL` + `/api/v1/public/files/...`
- Serve público **somente** prefixo `shops/*/branding/` (sem auth)
- Arquivos de pedido continuam autenticados

## Superfícies

| Superfície | Logo | Cores | Mobile |
|------------|------|-------|--------|
| Empresa (config + preview live) | upload + URL | pickers + swatches | ok |
| Consulta `/p/...` | header | primary/accent + soft bg | ok |
| TV Cliente | já tem | primary no accent | landscape |
| TV Oficina | adicionar | primary | landscape |
| Etiqueta impressão | header | tinta QR/borda primary | print A4 |
| Shell SaaS (sidebar/header) | logo loja se houver | `--wq-brand*` override | drawer |

## Fora de escopo

Domínio custom, CSS livre, multi-tema dark por loja, Meta API.

## QWs emendados

1. Nota interna por shop no platform admin  
2. Public payload com branding completo  
3. localStorage brand sync (`shopLogoUrl`, `shopPrimaryColor`, `shopAccentColor`)
