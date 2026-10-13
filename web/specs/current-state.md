# Worqera Web — Estado atual

**Atualizado:** 2026-10-13 (preços Basic 97 · Pro 197 · Business 499 no site e na aba Plano)

## Em uma frase

Next.js 15 com **landing premium multi-ramo**, AppShell, kanban **1 card/item** + badge Sem foto, fotos/partida por par, **edição híbrida** de pedidos, financeiro owner/admin, catálogo de produtos só do admin Worqera, Loop do Cliente.

**Specs:** [landing premium](../../docs/superpowers/specs/2026-09-22-worqera-landing-premium-multiramo-design.md) · [verticais](../../docs/superpowers/specs/2026-09-18-worqera-verticais-candidatas.md) · [avaliações/setor público](../../docs/superpowers/specs/2026-09-19-avaliacoes-setor-publico-design.md)

## Stack

Next 15.2 / React 19 / Tailwind 4 / Radix · `--wq-*` · logo SVG Worqera · JetBrains Mono

## Mapa rápido

| Área | Status |
|------|--------|
| Landing `/` | LIVE (pedidos, produtos, estoque e vendas · filme do pedido no topo · Basic 97, Pro 197, Business 499) |
| Login `/login` · signup · `/privacidade` | LIVE |
| AppShell + logo + meV1 | LIVE |
| Equipe `/settings/equipe` | LIVE |
| Oficinas `/admin/shops` | LIVE (lista limpa; ajuste ao clicar) |
| Dashboard / Tour Loop | LIVE (compacto mobile + atalho Finanças) |
| Kanban + Avisar pronto | HIDDEN (`ENABLE_WA_ME=false`); **1 card por item** |
| Financeiro `/admin/financeiro` | LIVE (owner/admin; líquido em destaque; produtos só no admin Worqera) |
| Produtos `/admin/produtos` | LIVE local (só admin Worqera, dentro da oficina) |
| TV Financeiro `/tv-financeiro` | LIVE (owner/admin; meta 2× YTD) |
| AppShell mobile dock | LIVE |
| Novo pedido + `clientEmail` | LIVE (PDF/link auto) |
| Editar pedido `/pedidos/[id]/editar` | LIVE (form compartilhado; drawers quick-edit) |
| Serviços / Pedidos / etiqueta | LIVE (Zap/wa.me oculto) |
| Marcas `/settings/marcas` | LIVE (lista, renomear, ocultar, apagar) |
| Empresa vertical + itemLabel + e-mail toggle | LIVE |
| Setores + **Cliente vê** (`showOnPublic`) | LIVE |
| Avaliações `/avaliacoes` | LIVE |
| Consulta `/p/o/{token}` (antigo `/p/{slug}/{code}?t=` segue válido) + `#avaliar` | LIVE |
| Billing lock UX | LIVE (aba Plano do dono e do admin: Basic 97 até 100 pedidos, Pro 197, Business 499) |
| TV Cliente / TV Oficina | LIVE |

## Próximo

AbacatePay produção; WhatsApp Cloud quando ≥10 lojas; **app** seguir AS-IS `2026-09-18-worqera-app-asis-mirror.md`.
