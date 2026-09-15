# Worqera Web — Change log

## 2026-09-15

- **LP conversão:** hero full-viewport com mock kanban; tema claro/escuro (toggle); Axisbyte só como cliente; bloco AbacatePay/pagamento/usabilidade; CTAs “Testar grátis”; sem crédito “produto Axisbyte”.
- **ACL:** Financeiro + Métricas só `owner` (nav, middleware, API metrics).
- **Copy:** removido “chão” da UI (Equipe → “Setor”).
- **Mobile SaaS:** padding shell/dashboard/pedidos/kanban (`100dvh`, menos min-height no mobile).
- **Landing + branding:** `/` = LP; login em `/login`; logo SVG + favicon; auth/shell alinhados às cores do site.
- **Consultas:** hub com Finalizados; pedidos com tabs Ativos/Finalizados/Todos, debounce, carregar mais; clientes com busca server-side (`q`) + paginação.

## 2026-09-14

- **Kanban UX:** comentários no drawer; destinos no plano / fora do plano; drag no card inteiro; dark mode slate + visão geral reforçada.
- **Product + Fase 3:** tokens worqera.com + tema claro/escuro; dashboard densificado; Empresa (nome/slug/WA/partner); `/settings/tv`; TVs com branding; billing manual UX; signup `?ref=` + slug; onboarding catálogo padrão; WhatsApp no detalhe do pedido.
- **Onboarding→TOP-05:** wizard `/onboarding`; Equipe edit/invite/reset; serviços `sectorPathHint`; banner atrasos + digest; invite público.
- **P0:** AbacatePay checkout real (ApiKey+ProductId); webhook HMAC base64 + secret em prod; forgot/reset password; refresh cookie HttpOnly; consulta pública por shop slug; testes isolamento.
- **UX:** kanban full-bleed colunas largas; Financeiro/Métricas redesenhados (tokens Worqera).
- **Blind forward:** conta `sector` vê só a fila; no detalhe encaminha para qualquer setor (nomes); histórico com quem/quando/`action`.
- **SaaS Fases 1–2:** `/settings/equipe`; `/admin/shops` (platform allowlist); middleware sector + platform; trial banner locked; billing lock UX; `meV1` no AppShell.
- **Near-QW 2:** templates pedido rápido (localStorage); busca código no kanban; refresh JWT em 401; `clientId` em `listOrders`; `lib/setores` só `MAX_FOTOS`.
- **Kanban + consultas UX:** board multi-coluna desktop com `@dnd-kit`; mobile 1 coluna; consultas split (`/consultas` hub, `/consultas/clientes`, `/consultas/pedidos`); **TV Chão → TV Oficina**.
- **QW pack:** cortou `/emails`; `/settings/servicos` CRUD; atalhos kanban; setores API; garantia + filtros.
- **Kanban labels / Ops UX:** código loja, etiqueta/QR, multi-item, shell slim. AbacatePay stub.
