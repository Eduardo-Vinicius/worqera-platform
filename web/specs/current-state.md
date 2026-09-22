# Worqera Web — Estado atual

**Atualizado:** 2026-09-22 (landing premium multi-ramo)

## Em uma frase

Next.js 15 com **landing premium multi-ramo** (fila + consulta), AppShell (Sair fixo + bottom dock), kanban, financeiro owner/admin, Loop do Cliente (laudo+QR+consulta; wa.me oculto).

**Specs:** [landing premium](../../docs/superpowers/specs/2026-09-22-worqera-landing-premium-multiramo-design.md) · [verticais](../../docs/superpowers/specs/2026-09-18-worqera-verticais-candidatas.md) · [avaliações/setor público](../../docs/superpowers/specs/2026-09-19-avaliacoes-setor-publico-design.md)

## Stack

Next 15.2 / React 19 / Tailwind 4 / Radix · `--wq-*` · logo SVG Worqera · JetBrains Mono

## Mapa rápido

| Área | Status |
|------|--------|
| Landing `/` | LIVE (premium multi-ramo · ink/papel) |
| Login `/login` · signup | LIVE |
| AppShell + logo + meV1 | LIVE |
| Equipe `/settings/equipe` | LIVE |
| Oficinas `/admin/shops` | LIVE (allowlist) |
| Dashboard / Tour Loop | LIVE (compacto mobile + atalho Finanças) |
| Kanban + Avisar pronto | HIDDEN (`ENABLE_WA_ME=false`) |
| Financeiro `/admin/financeiro` | LIVE (owner/admin; líquido em destaque) |
| TV Financeiro `/tv-financeiro` | LIVE (owner/admin; meta 2× YTD) |
| AppShell mobile dock | LIVE |
| Novo pedido + `clientEmail` | LIVE (PDF/link auto) |
| Serviços / Pedidos / etiqueta | LIVE (Zap/wa.me oculto) |
| Empresa vertical + itemLabel + e-mail toggle | LIVE |
| Setores + **Cliente vê** (`showOnPublic`) | LIVE |
| Avaliações `/avaliacoes` | LIVE |
| Consulta `/p/{slug}/{code}?t=` + `#avaliar` | LIVE |
| Billing lock UX | LIVE (AbacatePay) |
| TV Cliente / TV Oficina | LIVE |

## Próximo

AbacatePay produção; WhatsApp Cloud quando ≥10 lojas; **app** seguir AS-IS `2026-09-18-worqera-app-asis-mirror.md`.
