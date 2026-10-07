# Worqera Web — Change log

## 2026-10-06

- **Celular:** busca, data e lixeira cabem na tela. Marca, serviço e acessório usam olho para ocultar e lixeira para apagar. Marca também tem lápis para editar o nome.
- **Cliente no pedido:** a busca consulta a lista inteira da empresa, não só os 200 mais recentes. Telefone e CPF batem com ou sem pontuação.
- **Site:** a página inicial mostra fila, avisos e o histórico do cliente, com o quadro e o aviso em movimento.
- **Kanban:** um campo discreto de data filtra os cartões pelo dia em que o pedido entrou.
- **Novo pedido:** o pedido é criado e a tela segue. As fotos de cada item sobem juntas, sem travar o sucesso. O e-mail do laudo espera essas fotos.
- **Sino:** abrir marca a leitura e o número zera. A lista que estava aberta continua visível; a próxima busca não traz o mesmo aviso.
- **Portal:** atualiza a cada 60s, e só com a aba visível.

## 2026-10-05

- **Sessão:** sair envia o refresh guardado, para a API invalidar a conta mesmo com o acesso vencido.
- **Privacidade:** `/privacidade` descreve conta, clientes, pedidos, link público e que o produto não lê localização. O login aponta para essa página.

- **Consulta pública:** QR, WhatsApp, etiqueta e copiar link usam `/p/o/{token}`. A página não coloca o nome da empresa na barra de endereço. Link antigo continua válido.
- **Sino:** abrir o aviso marca como lido. O número some e só volta quando entra pedido pronto, reaberto ou avaliação nova.

- **Pedido:** criar e reenviar o laudo não esperam o Gmail. A tela avisa que o e-mail está a caminho.
- **Portal:** a tabela mostra a porcentagem de 4xx. A lista de erros inclui 4xx e 5xx, com quantas vezes a mesma falha se repetiu.
- **Sessão:** uma renovação que falha não é tentada de novo na mesma aba. O sino de avisos para no 401/403, não consulta com a aba escondida e espera 3 minutos. `/auth/me` roda uma vez por abertura, não a cada tela. Configuração da plataforma no máximo a cada 5 minutos.
- **Atendimento:** vê Configuração (empresa, setores, serviços, marcas, acessórios, equipe, funcionários e TVs). Plano, financeiro, métricas e TV financeiro continuam só para admin e dono.
- **Kanban:** a soma da coluna (total e a pagar) fica oculta, inclusive para admin e dono. O valor do pedido na ficha continua.

## 2026-10-04

- **Landing:** a home fala de empresas com fila, vários ramos e o item de cada um. Prova de 1.000+ pedidos e R$ 200 mil+ gerados. Parceiros em destaque. Login e cadastro deixam de dizer “oficina”. Logo, cores e fontes iguais.

- **Acessórios:** Configuração → Acessórios. No pedido, Outro grava o nome na lista da loja e já deixa marcado para os próximos.

- **Marca:** combo no item do pedido. Digita, escolhe, ou cadastra na hora. O modelo continua em texto.
- **Marcas:** Configuração → Marcas lista, renomeia, oculta e apaga. Corrigir o nome também corrige os pedidos que usam essa marca.

- **Kanban:** admin vê o total e o que falta pagar em cada coluna. Card em aberto ganha a marca A pagar.
- **Entrega:** se ainda falta pagar, marcar como entregue abre a confirmação. Dá para registrar que o cliente pagou o restante ou entregar mesmo assim.
- **Pedidos:** filtros Falta pagar (qualquer etapa) e Entregue sem pagar.
- **Portal:** time Worqera vê uso da API, erros e última posição. Parâmetros ligam função, serviço e selo na hora. Notícia da plataforma aparece no app. Sair da conta invalida o token.
- **Portal:** a home junta oficinas, chamadas em 1h/24h/30 dias, tempo médio, últimos 100 erros e o que está desligado ou no ar.
- **Parâmetros:** o menu da oficina (kanban, pedidos, clientes, consultas, avaliações, financeiro, métricas, TVs), a página pública do pedido e o e-mail do laudo. O selo continua na oficina. WhatsApp ficou de fora: o botão ainda está desligado no produto, então um interruptor não mudaria nada.
- **Oficinas:** lista em uma linha (plano, situação, pedidos abertos). Plano, trial, suspensão e nota abrem ao clicar.

## 2026-10-03

- **Laudo:** no kanban e no pedido dá para corrigir o e-mail e reenviar o mesmo aviso da criação (PDF do laudo e link do QR).
- **Valores no cadastro:** preço, desconto, garantia e sinal não ficam mais com zero à esquerda enquanto digita.
- **Pedido:** desconto em reais no cadastro e na edição. O total acompanha subtotal menos desconto, e o sinal de 50% ou 100% usa esse total. Falta pagar aparece no formulário, no kanban, na lista, na consulta e no detalhe.
- **Kanban:** topo de cada coluna (e o chip no celular) mostra a soma em reais dos cards visíveis.
- **Kanban:** o detalhe do par mostra as fotos daquele item mesmo quando elas só estavam na cópia do pedido, e o caminho do pedido quando o par ficou só com atendimento e final. O pedido inteiro continua mostrando a foto que estava só na cópia geral.

## 2026-10-01

- **TV Financeiro:** número do líquido (e os outros destaques da marca) clareia quando a cor da empresa é escura, para não sumir no fundo da TV.
- **Novo pedido:** abre vazio (sem rascunho, template nem chips de clientes recentes); partida só em cada par; obs. do fluxo removida; garantia, pagamento e prazo em blocos separados.
- **Serviços e setores:** apagar remove de verdade (não só desativa). Setor bloqueia se a coluna ainda tem pedido. Tela de setores com interruptores de QR, e-mail e coluna final.
- **Fotos na edição:** gravar no par certo sem recriar o item; salvar o pedido não apaga foto recém-anexada. Kanban: QR só do par aberto; pedido inteiro mostra todos.
- **Kanban:** no celular o card não arrasta (mover no detalhe); busca filtra cliente/código/modelo no board; QR e link de cada par no detalhe.

## 2026-09-24

- **Editar pedido (híbrido):** `/pedidos/[id]/editar` reusa o form do cadastro (pai + filhos); drawer consulta/kanban com quick-edit + **Editar completo**.
- **Fotos por item:** máx. 10/par; compressão no upload; galeria por par no detalhe + remover foto; kanban drawer também remove foto; badge **Sem foto**; laudo com fotos certas por par.
- **Partida independente por par** no cadastro; resumo união no pagamento; kanban “no plano / fora” usa o caminho do item.
- **Pedidos / lixeira:** Excluir → lixeira; Recuperar ou **Apagar permanente** (owner/admin).
- **Subitens kanban:** cards por item (`code-N`); entrega só com pedido `ready`.

## 2026-09-22

- **Subitens kanban / landing / pricing / mobile dock:** ver entradas anteriores do dia; fotos/partida consolidados em 2026-09-24.
- **Landing / pricing:** Basic 147 · Pro 297 · Business 499; copy multi-público sem “chão”.
- **Landing premium multi-ramo:** visual ink/papel sem glow roxo; hero + loop + ramos + prática + prova social; copy “fila sob controle”; fontes Instrument Sans + IBM Plex; sem theme toggle.
- **WhatsApp wa.me:** oculto no produto (`ENABLE_WA_ME=false`) — botões/toasts/Status Pack/consulta pública; código permanece para religar depois. Contato comercial Worqera (landing/billing) mantido.
- **TV Financeiro** (`/tv-financeiro`): painel full-screen privado (owner/admin) — líquido/bruto do ano, meses, meta anual (= 2× bruto YTD; override `?meta=`), refresh 60s; links em Financeiro e Configuração → TVs.
- **Financeiro (owner/admin):** UI limpa com hero de **líquido**, bruto, vendidos, setores e top serviços; CSV; middleware/nav só Gestão.
- **Sidebar:** `Sair` fixo no rodapé (`h-dvh` + footer sticky) — sem scroll no menu; Visão geral em primeiro; seções com divisor.
- **Mobile:** bottom dock (Kanban / Pedidos / Novo / Início); padding safe-area; kanban altura ajustada.
- **Dashboard:** KPIs mais compactos no celular; TVs só no desktop (TV Oficina, sem “chão”).

## 2026-09-19

- **Auth:** login liberado sem verificar e-mail (toast + banner dismissível); confirmação continua opcional.
- **Layout:** shell/header até 1600px; dashboard mais largo; mobile — menu touch, novo pedido (pares/serviços/fotos/CTA sticky) e tabs de pedidos.
- **Kanban:** drawer mostra fotos do pedido; botão Excluir → lixeira.
- **Pedidos:** aba Lixeira + Recuperar (soft-delete).
- **Pós-criar pedido:** `/pedidos/[id]/sucesso` — QR + preview do laudo (imprimir/baixar) + Zap / e-mail rascunho / etiqueta; create redireciona pra cá; status `emailNotify` + botão Reenviar.
- **Kanban:** atrasado com borda/badge rosa (como reaberto); observação do pedido editável + anotações.
- **Fotos:** adapter prefixa `NEXT_PUBLIC_API_URL` em paths relativos; API passa a assinar URLs.
- **Laudo:** seção no detalhe do pedido (listar/abrir + gerar); botão Laudo no kanban; PDF no create.
- **Avaliações:** filtro por estrela / críticas (1–3) + Exportar Excel (CSV).
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
