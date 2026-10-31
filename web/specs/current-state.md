# Worqera Web — Estado atual

**Atualizado:** 2026-10-28 ("Aberto por" no pedido e etapas numeradas; Recuperados em Orçamentos e no Financeiro; Métricas → Atendimento; Repor estoque; Conferir prontos)

## Em uma frase

Next.js 15 com **landing premium multi-ramo**, AppShell, kanban **1 card/item** + badge Sem foto, fotos/partida por par, **edição híbrida** de pedidos, financeiro owner/admin, produtos da loja (Configuração → Produtos, venda no pedido com "Da loja"), Loop do Cliente.

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
| Oficinas `/admin/shops` | LIVE (KPIs + tabela; ajuste ao clicar) |
| Visão geral `/admin/plataforma` | LIVE (admin Worqera: KPIs da semana, saúde 0–100, insights, pendências) |
| Métricas `/admin/metricas` | LIVE (Tecnologia · Negócio · Produto, períodos com comparação) |
| Análises `/admin/analises` | LIVE (Produto: ativação, coortes, uso · Transações · Lojas: estágio e risco; `?tab=`) |
| Operação `/admin/operacao` | LIVE (filas com prazo; +7 dias de teste e Entrar na loja) |
| Contas `/admin/contas` | LIVE (segmentos, busca, conta 360° em `/admin/contas/[id]`) |
| Portal técnico `/admin/plataforma/portal` | LIVE (tela anterior: IA, WhatsApp, e-mails, endpoints) |
| Dashboard / Tour Loop | LIVE (compacto mobile + atalho Finanças) |
| Kanban + Avisar pronto | HIDDEN (`ENABLE_WA_ME=false`); **1 card por item** |
| Financeiro `/admin/financeiro` | LIVE (owner/admin; líquido em destaque; produtos só no admin Worqera) |
| Produtos `/admin/produtos` | LIVE (menu Configuração, dono/admin; pedido com item "Da loja") |
| Orçamentos `/orcamentos` | LIVE (menu Operação; Ligar hoje · Quadro · Todos · Recuperados; "Como recuperou?" ao fechar; Cliente não fechou no kanban e no pedido) |
| IA Business | LIVE com `OPENAI_API_KEY` (resumo do dia, leitura da semana, texto do cliente, resposta de avaliação, orçamento) |
| WhatsApp oficial `/settings/empresa` | PRONTO, desligado até `META_*` na API ([setup](../../docs/ops/ia-e-whatsapp-setup.md)) |
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
| Billing lock UX | LIVE (aba Plano: Basic 147 até 150 pedidos, Pro 297, Business 597; anual −17%; Asaas; últimos pagamentos) |
| TV Cliente / TV Oficina | LIVE |

## Próximo

AbacatePay produção; WhatsApp Cloud quando ≥10 lojas; **app** seguir AS-IS `2026-09-18-worqera-app-asis-mirror.md`.
