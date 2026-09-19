# Worqera Web — Change log

## 2026-09-19

- **Avaliações:** nav `/avaliacoes` (média, distribuição, lista com estrelas); FeedbackBell → “Ver todas”.
- **Setores:** toggle “Cliente vê” (`showOnPublic`) — oculta nome no link/QR público.
- **Consulta pública:** `/p/{slug}/{código}?t=token` obrigatório; QR etiqueta, Zap e “Copiar link” incluem o token.
- **Platform admin:** login sem membership → home `/admin/shops` (console Worqera); JWT `platformAdmin`; botão Ativar Premium.
- **Onboarding:** 2 passos; “configurar depois”; link Setores não entra em loop; tour dashboard discreto (3 itens); removido banner WhatsApp.
- **Trial banner:** texto explícito + âmbar nos últimos 7 dias (não dispensável).
- **Verificar e-mail:** signup manda link; login bloqueia até confirmar; `/verify-email` + reenvio.
- **Novo pedido:** envia `clientEmail`; aviso se cliente sem e-mail (PDF/link automático).
- Empresa: copy do e-mail (PDF no create + avaliação no pronto).

## 2026-09-18 (noite+)

- **Starter Kits:** `POST /shops/current/apply-starter-kit` (general/footwear/laundry/repair).
- **QW web:** renomear setor no clique; Empresa — kits + copiar link `/p/{slug}/`.
- **Ops:** `docs/ops/trial-reminders.md`.

## 2026-09-18 (noite)

- **QW:** logout → `POST /auth/logout`; employees API owner/admin; MW bloqueia atendimento em settings/billing/admin.
- **Status Pack:** banner no dashboard se WA off; Empresa renomeia seção WhatsApp → Status Pack.
- **Docs:** escala + Status Pack; **AS-IS app mirror** completo (auth→financeiro).

## 2026-09-18

- **Loop do Cliente:** etiqueta com “Avisar no WhatsApp” (template `created`); kanban “Avisar pronto” sticky na coluna terminal; drawer usa templates da Empresa; consulta com CTA avisar pronto.
- **Tour:** SetupChecklist vira “Tour da operação” (setores → marca/item → pedido → etiqueta → Zap → equipe).
- **Dashboard:** chips “o que fazer agora” (atrasados / avisar prontos / novo pedido); copy neutra.
- **Multi-vertical:** Empresa — tipo de negócio + `itemLabel`/`itemLabelPlural`; copy core sem “tênis” obrigatório.
- **Setores:** copy deixa claro que o fluxo é único por empresa.

## 2026-09-17

- **Dashboard:** layout mais compacto; TV em card destacado (fora do tour); tour sem passo “abrir TV” que nunca marcava.
- **TV Cliente:** padrão **8** pedidos/tela + carrossel; legenda de páginas.
- **Financeiro:** caixa do dia (entregue/sinais/a receber), período Hoje, top serviços com `items[]`, status em PT, export CSV.
- **QW práticos:** ⌘K busca pedido; drawer kanban (link/WA/imprimir); novo pedido com data +3/+5/+7 e clientes recentes.
- **Novo pedido:** pares em abas (1 formulário por vez) + botão “Adicionar par”; rota/acessórios sempre visíveis (sem `<details>`).
- **Dashboard:** checklist vira faixa compacta colapsável; indicação vai para o rodapé da coluna direita (discreta).
- **Kanban reopen/deliver:** badge Reaberto no card; atalho “Marcar entregue” na coluna final; sino de inbox (feedback + prontos + reabertos) no AppHeader.
- **Setores:** copy deixa claro que todo pedido termina em setor Final.
- **Cliente notify:** e-mail create/move/ready; toggle por setor (`notifyEmailOnEnter` + `isTerminal`); master em Empresa; feedback CSAT 1–5 na consulta pública; reabrir ready/delivered (mesmo código).
- **QW:** badge Sistema ok no AppHeader; etiqueta auto-print `?print=1` + CSS print.
- **Branding por loja:** Empresa — upload logo, cores primary/accent, presets, preview; shell aplica CSS vars; sidebar com logo; consulta `/p` brandada (mobile full-bleed); etiqueta + TVs com logo/cor; checklist “logo e cores”.
- **Platform:** nota interna (`adminNote`) em `/admin/shops`.
- **Wow:** digest semanal (botão dashboard owner); toast “Avisar no WhatsApp” ao mover no kanban (wa.me + templates da Empresa).
- **Mobile SaaS:** AppHeader empilha; bleed sync; banners wrap; sidebar truncate; safe-area; FAB kanban; listas/clientes/pedidos/consultas sem overflow; sticky novo pedido.
- **QW:** empty states + pedido demo; export CSV finalizados (owner); skeletons em loading; `/forbidden` + `not-found`; PWA manifest; billing UX (AbacatePay + o que inclui); onboarding com exemplo.
- **LP conversão + ACL owner** (carry da sessão anterior).

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
