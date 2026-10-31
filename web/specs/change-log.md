# Worqera Web — Change log

## 2026-10-31

- **Visão geral enxuta:** os três blocos sobre a operação (Resumo do dia, chips de próximas ações e "Hoje" com 4 números) viraram um só, **Operação de hoje** (`components/dashboard/OperationPanel.tsx`):
  - Frase da IA e dica, com "R$ em jogo" só para o dono.
  - Quatro números clicáveis: Em andamento, Atrasados (abre o kanban já filtrado, `/kanban?late=1`), Prontos para retirar e Ligar hoje.
  - "Comece por aqui" (as ações do resumo) e "Fila por setor" em barras (até 6 setores, "+N setores").
  - Se a IA falhar, aparece uma frase com os números do painel.
- **Saíram da Visão geral:** a faixa grande das TVs (continua em Configurações → TVs), os atalhos (já estão no menu), o cartão de assinatura (o trial aparece no subtítulo) e o bloco separado de carga por setor.
- **Abaixo do painel:** Pedidos recentes com bolinha de status (pronto em verde, atrasado em vermelho) e data. Prateleira e Indicação aparecem ao lado, só para o dono.
- **Topo:** botão das TVs discreto (só o ícone, "TVs" em tela larga) e "Digest" virou ícone de e-mail.
- `DailyBriefCard` removido. `useDailyBrief`, `ACTION_ICON` e `TONE` agora são exportados; `SectorBriefStrip` do kanban segue igual.
- **Orçamentos numa tela só (sem abas):**
  - Em cima, um painel com Ligar hoje, Na mesa, Recuperado em 30 dias e Taxa (`QuoteSummaryPanel`). Cada número leva à sua parte da tela, e embaixo fica o funil em uma barra colorida por etapa, com a legenda.
  - Depois, a busca em todos os orçamentos. Enquanto busca, a tela mostra só o resultado, de todas as etapas.
  - E, um embaixo do outro:
    - **Ligar hoje:** lista única por prioridade, 6 primeiros e "Ver mais".
    - **Funil:** o quadro com arrastar, abertos e fechados em 60 dias.
    - **Recuperados:** números num painel só e os 5 últimos com "Ver todos".
  - A linha do orçamento foi para `components/quotes/QuoteRow.tsx` e ficou mais compacta, numa lista só.
  - A tela carrega tudo numa chamada (`view=board`). "Ligar hoje" usa a mesma regra da API.
  - Links antigos `?view=recovered|board|today` rolam até a parte certa.

## 2026-10-30

- **Clientes virou CRM:**
  - Abas Visão da base, Aniversariantes, Sumidos, Recorrentes, Novos e Todos (`components/crm/*`).
  - Visão da base traz a leitura da IA, as ações da semana, os números clicáveis, "quantas vezes voltou" e a saúde da base.
  - As listas têm botões de WhatsApp: Dar parabéns, Chamar de volta e Agradecer.
  - Ficha do cliente nova: contato, WhatsApp, aniversário, etiquetas, origem, números, Raio-X, histórico de pedidos, orçamentos e "Novo pedido".
  - Aniversário (`BirthdayField`), origem e etiquetas no cadastro e na edição.
- **Ramos:**
  - O cadastro pergunta "O que a sua empresa faz?" (`BUSINESS_TYPES`).
  - Empresa: "Como funciona o seu serviço" (o cliente traz o item / eu produzo ou instalo) e os kits novos.
  - No pedido em "eu produzo", sai Marca e entram "O que será feito", "Medidas e detalhes" e "Fotos de referência".
- **Menu:** Operação · Clientes (Clientes e CRM, Avaliações, WhatsApp e e-mail) · Estoque e cadastros · Gestão (com Telas da loja) · Administração.
- **Celular:** topo, barra de baixo e rodapé do pedido sem blur no celular; rolagem nativa sem arrastar a página de trás.


## 2026-10-28

- **Telas da loja fáceis de achar:** na Visão geral, botão **Telas da loja** no topo (`TvLauncher`: Abrir, Copiar link, demonstração e Configurar) e a faixa com as TVs (`TvScreensStrip`). No menu lateral, **Telas da loja** em Operação, abrindo a página das TVs com os cartões no topo (antes era "TVs" em Administração). TV Financeiro só para dono/admin. Os atalhos de TV escondidos no fim da Visão geral saíram. Lista única em `components/shell/tvScreens.ts`.
- **TV Oficina (`/tv-dashboard`) refeita:** mesmo padrão nítido da TV Cliente (vmin, cores sólidas). No topo: Na produção, Atrasados (vermelho), Vencem hoje (amarelo) e Urgentes (roxo), além do relógio. Cada setor tem faixa na cor do setor, número grande da fila e os pedidos que precisam de mão primeiro (atrasados, urgentes, vencem hoje, mais tempo parado), com etiqueta "Atrasado 1d", "Parado 26h", "Vence hoje" ou "Urgente". Nada rola na TV: o que não cabe vira "+N na fila"; com mais de 12 setores, as páginas giram. Setor que recebe pedido acende com bipe baixo (como antes). `?hot=1` continua mostrando só o que pega fogo. `/tv-dashboard?demo=1` mostra uma demonstração sem dados reais. Componentes em `components/tv/floor/`.

- **Pedido com muitos itens (celular/tablet):** as abas dos itens agora quebram em grade (2, 3 ou 4 por linha) em vez de rolar de lado escondido, com número, "pronto" ou "falta modelo ou serviço", e um botão "+ Item N" sempre visível. No fim de cada item: "Item X de N", ← anterior / próximo → e "Adicionar mais um item", sem precisar subir a tela.
- **Orçamentos no celular:** as 4 abas (Ligar hoje, Quadro, Todos, Recuperados) cabem lado a lado, com ícone em cima e o texto embaixo. Recuperados reorganizado para tela estreita (período em 3 botões, cards sem estourar, motivo e como reverteu em etiquetas, detalhe quebrando linha). O diálogo "Como recuperou?" rola com o botão fixo embaixo.

- **TV Cliente (`/tv`) refeita:** tamanhos em `vmin` e cores sólidas (sem blur, gradiente nem texto pequeno), então fica nítida em TV 720p esticada para 4K. Painel **Pronto pra retirar** em destaque na cor da loja, com os maiores números; **Em andamento** em cards com o número, a etapa ("Em lavagem") e uma trilha Recebido → Produção → Pronto. Quando um pedido fica pronto com a TV ligada, aparece em tela cheia "Pedido pronto! 0685 · Pode retirar no balcão", com confete (respeita reduzir movimento). Rodapé com "N pedidos sendo cuidados agora" e QR (link do Google se houver, senão WhatsApp da loja). `/tv?demo=1` mostra uma demonstração sem dados reais (aberta, sem login) e tem botão em Configurações → TVs. Componentes em `components/tv/`. Só número e etapa aparecem na tela: nada de nome ou valor.

- **Gestão → Atendimento** (`/admin/atendimento`, dono/admin): relatório por quem abriu, com período (7 dias a 1 ano), cards (pedidos, % com "Aberto por", nota do atendimento, recuperados), tabela por pessoa com "Ver pedidos" e exportação CSV/Excel. Lista "Pedidos em andamento sem Aberto por" com escolha e Salvar na linha. Métricas → Atendimento leva para o relatório.
- **Corrigido:** editar "Aberto por" no formulário do pedido não chegava à API (`updateOrderService` descartava o campo). Agora passa `openedByEmployeeId`.
- **Kanban:** no detalhe do pedido, "Aberto por" virou um seletor; em pedido sem ninguém aparece em destaque ("quem? ▾").
- **Pedidos:** filtro "Aberto por" (chips, também via `?openedBy=`) e "aberto por Ana" na linha.

- **Novo pedido:** barra **Aberto por** no topo (`OpenedByBar`): chips de quem atende, o último usado no aparelho já vem marcado, dono/admin cadastram na hora. Obrigatório só quando a loja tem atendentes. Etapas numeradas sem pular: `1 Cliente · 2 Item · 3 Produtos da loja · 4 Pagamento` (sem produtos, Pagamento volta a ser 3). Produtos da loja com contador ("2 itens · R$ 40,00" / "Nenhum") no título, no resumo lateral, na barra de baixo e na confirmação.
- **Funcionários:** opção "Atende no balcão" e selo na lista; setor fica opcional para quem atende.
- **Orçamentos → Recuperado:** diálogo "Como recuperou?" (`RecoveryDialog`): problema real, como reverteu, quem ajudou, detalhe. Vale no botão Fechou, na etapa, na lista e no quadro. Nova visão **Recuperados** (`RecoveredView`): taxa, contatos até fechar, pessoas por lead, problema → como reverteu, ranking e lista. Pedido aberto pelo prefill leva `fromQuote`.
- **Kanban:** selos **Recuperado** e **Conferir** no card; no detalhe, "Aberto por" e o selo de recuperado no cabeçalho, e o botão "Conferir: será que já saiu?" em prontos.
- **Pedidos:** aba Recuperados (`?recovered=1`).
- **Financeiro:** mini card **Recuperado** (tênis que voltaram no período), leva a Orçamentos → Recuperados.
- **Métricas → Atendimento** (`AttendanceCard`): por quem abriu, pedidos, vendido, ticket, nota de atendimento e recuperações.
- **Página do pedido do cliente:** "Como foi o atendimento?" (estrelas, opcional) com "Você foi atendido por Ana". **Avaliações:** filtro "Atendido por" e média do atendimento.
- **Produtos:** card **Repor estoque** (`RestockCard`, âncora `#repor`): Atrasado / Hora de pedir / A caminho, com "Pedi ao fornecedor", "Chegou" e cancelar. Campo "Prazo do fornecedor (dias)" no cadastro e no detalhe.
- **Prateleira:** "Conferir" e "Já entregue" (pergunta se recebeu o saldo) em cada pronto, chip "N para conferir". Resumo do dia ganhou as ações Conferir e Repor.

## 2026-10-26

- **Resumo do dia por papel:** dono/admin continuam vendo valores. Atendimento vê Atrasados em primeiro e só os valores do balcão (orçamento a ligar, receber na retirada, cobrar), sem "em jogo hoje" e sem prateleira. Conta de setor ganhou uma faixa enxuta no topo do kanban (`SectorBriefStrip`): frase do dia e números da própria fila (atrasados, vencem hoje, amanhã), sem valores. `DailyBrief` virou união por `audience`.

- **Comunicação → WhatsApp → Proteção do número:** escolher quando a Worqera sugere mandar WhatsApp (pronto: seguro; criado: moderado; cada mudança de setor: alto volume, desligado por padrão), com dicas de balcão e link para o guia.

- **Comunicação** (menu próprio, `/comunicacao`, abas por `?tab=`):
  - WhatsApp: oficial (`WhatsAppCloudCard`) e "pelo celular da loja" (wa.me + telefone).
  - E-mail: liga e desliga, e explica o que é enviado.
  - Modelos: 4 textos com prévia estilo WhatsApp.
  - Automações: o que sai sozinho e se está ligado.
  - Sem bloqueio: `components/comunicacao/AntiBanGuide.tsx`.
  - Os blocos de e-mail, WhatsApp oficial e Status Pack saíram de Empresa, que ganhou um atalho; o salvar de Empresa não envia mais `notifications`. Conta de setor não abre a página.
- **IA:**
  - Financeiro: `ReceivablesCard` (Cobrança inteligente: total, entregues sem pagar, prontos com saldo, barra de idade, lista com botão Cobrar).
  - Cliente: `ClientInsightCard` (Raio-X: resumo, próximo passo, etiquetas, pedidos, gasto, ticket, volta a cada X dias).
  - Avisar: botão "Melhorar com IA" no texto (Business).

## 2026-10-25

- **Menu:** Operação · Cadastros · Gestão · Administração (Empresa, TVs, Equipe e acessos, Funcionários, Plano — os três últimos só dono/admin) · Worqera. Middleware bloqueia `/settings/equipe` e `/funcionarios` para atendimento.
- **Kanban — detalhe:** `components/kanban/OrderDetailHeader.tsx` (cliente, telefone, e-mail, editar contato, valor a receber, Avançar/Entregar, Avisar, Não fechou, Mover para) e `NotifyClientDialog.tsx` (mensagens prontas por momento, WhatsApp/e-mail/copiar). Drawer 580 px; "Cliente e prazo" virou "Prazo, prioridade e observação"; "Ações" virou "Mais ações".
- **Kanban — fechados no celular:** chips Entregues/Recusados depois dos setores abrem `ClosedColumn compact`; dados carregados uma vez por `useClosedOrders` (compartilhado com as faixas do desktop).
- **Notícias:** modelo "Tudo o que chegou em outubro" (6 passos, primeiro da lista).
- **Kanban — fechados:** `components/kanban/ClosedColumns.tsx` com faixas Entregues e Recusados (7/14/30 dias, abre/recolhe e lembra, abre o pedido, recusado abre no Orçamentos). Pedidos ganhou a aba Recusados e lê `?tab=`, `?refused=1`, `?status=delivered`.
- **Orçamentos — quadro:** `components/quotes/QuoteBoard.tsx` com DragOverlay, Mouse/Touch/Keyboard sensors, colisão por ponteiro e "Soltar em…".
- **Resumo do dia:** "R$ em jogo hoje", dica, 4 prioridades com ícone, cor e link (`DailyBrief.actions`, `stake`, `tip`). Prateleira tem âncora `#prateleira`.
- **Novidades:** animações (zoom, degradê, confete, troca de passo, progresso; respeita reduzir movimento). `ReleaseNotesDialog` reaproveitável; Notícias ganhou Pré-visualizar e o modelo "Kanban turbinado e R$ em jogo".

- **Produtos para todas as lojas:** "Produtos" entra no menu em Configuração (dono e admin), depois de Serviços. A página fala com a loja ("O que a loja vende…").
- **Pedido completo (cliente + loja):** o bloco Item continua só para o que o cliente trouxe. Logo abaixo, "Produtos da loja" (aparece só com produto ativo): busca com Enter, toque adiciona (repetir soma +1), linha com variação, − / +, preço unitário, total e disponível; o + trava no saldo. Produto da prateleira nasce pronto no setor final; "Passa pela produção" segue os setores. Só produto no pedido = "Cliente já levou — entregar agora" (padrão ligado): sem prazo, nasce entregue, baixa o estoque, sem e-mail. Confirmação lista os produtos e não cobra foto deles. Rascunho guarda os produtos.
- **Notícias:** três modelos prontos — "Produtos e venda no pedido", "Novidades da semana" (prateleira, Google, pedido em seções, produtos, orçamentos) e "Orçamentos e IA". O quadro de novidades não abre para conta de setor.
- **Site:** Produtos e estoque descrito como no ar (cadastro pela loja, venda no pedido); "Chegando" fica com WhatsApp oficial e app; home com Produtos em "Novo na Worqera".

- **Site institucional:** posicionamento "O orquestrador da fila de pedidos". Novo índice `/recursos` (grupos, tabela de planos, "Chegando") e 8 páginas `/recursos/[slug]` (kanban, CRM de orçamentos, WhatsApp, consulta e avaliações, financeiro e análise, IA, equipe e TVs, produtos e estoque), em pt e en. Home com pilares clicáveis, seção "Novo na Worqera", planos e FAQ atualizados; ramos com faixa de recursos; menu "Recursos"; rodapé em colunas. Middleware libera `/recursos`.

- **Confirmar e-mail:** cadastro novo leva a `/verify-email` com campo de código de 6 dígitos (envia sozinho ao completar), reenviar com contagem de 60 s, link do e-mail continua valendo. Confirmar já entra na conta (onboarding). Login de conta não confirmada vai direto para essa tela.
- **Na prateleira (só owner):** card no dashboard com prontos não retirados, parados 3+ dias, total a receber na retirada e botão "Lembrar" (WhatsApp com texto pronto; registra o lembrete).
- **Avaliação no Google:** campo "Link de avaliação no Google" em Empresa. Na página do pedido, quem dá nota 4 ou 5 vê "Avaliar no Google".

- **Novidades:** notícia com "Quadro no centro" abre uma vez por navegador, no meio da tela, com capa e tour passo a passo (cada passo pode levar para uma tela). Em Notícias, o admin Worqera escolhe o formato, monta os passos e tem o modelo pronto "Orçamentos e IA".
- **Kanban:** o detalhe do pedido fica em seções (Valor, Pares e serviços, Ações, Fila, Fotos e QR, Cliente e prazo, Observação, Histórico). Cabeçalho com setor, status, prazo e pares. QR recolhido. "Cliente não fechou → Orçamentos" e Ver etiqueta ficam em Ações; Excluir fica discreto no fim.

- **Limite de IA:** o Plano mostra "IA do mês: X de 1.000 usos". Perto do fim aparece quanto resta; ao acabar, um aviso explica que a IA volta no dia 1º e chama para falar com a Worqera. O site e o FAQ dizem 1.000 usos por mês no Business.
- **Worqera:** Oficinas ganha "+500 usos de IA este mês"; a Visão geral mostra usos/limite por loja.

## 2026-10-24

- **Início:** Resumo do dia no topo, com prontos para avisar, orçamentos para ligar, atrasados e o que vence amanhã. No Business, a frase vem da IA.
- **Financeiro:** Leitura da semana (Business).
- **Pedido:** "O que o cliente lê" — texto do laudo e da consulta pública, escrito pela IA no Business e editável.
- **Avaliações:** Sugerir resposta, para copiar ou mandar no WhatsApp.
- **Empresa:** WhatsApp oficial (em breve até a Worqera ligar a Meta): conectar número, autorização do cliente, aviso automático de pronto e uso do pacote.
- **Orçamentos:** com o WhatsApp oficial ativo, Retomar pelo WhatsApp oficial (até 2 por orçamento).
- **Worqera:** Visão geral mostra o custo de IA e o WhatsApp do mês por loja. Oficinas ganha preço de fundador e controles do WhatsApp (cartão, pausa, excedente pago, teto).
- **Planos:** Business R$ 697 no site, no checkout e na aba Plano; fundador aparece como R$ 499 até a data.
- **Orçamentos:** novo item no menu, depois de Pedidos. Abre em Ligar hoje, ordenado por prioridade, com o que está na mesa, o recuperado em 30 dias e a taxa de recuperação. Quadro arrastável por etapa e aba Todos.
- **Kanban e pedido:** botão Cliente não fechou, com motivo e dia de ligar. O pedido sai da fila, ganha a faixa Orçamento não fechado e abre em Orçamentos.
- **Ficha do orçamento:** WhatsApp com três textos prontos (IA quando ligada), ligar, adiar, anotar e histórico. Fechou reabre o pedido; sem pedido, abre Novo pedido com o cliente preenchido.
- **Cliente:** a ficha mostra os orçamentos daquela pessoa.

## 2026-10-23

- **Catálogo:** `/admin/produtos` lista produtos, saldo e valor. Cadastro em ficha, variação em linha. Fora do menu. O pedido continua só com item do cliente.
- **Worqera:** `/admin/plataforma` é a visão geral da plataforma. Oficinas em tabela, com plano e trial.
- **Site:** relatos que passam sozinhos (Casa do Tênis, Sapataria Paulista, Axisbyte). Páginas por ramo: `/sapataria`, `/lavanderia`, `/assistencia` e as outras da home.

## 2026-10-13

- **Planos:** site e aba Plano (dono e admin) mostram Basic R$ 97, Pro R$ 197 e Business R$ 499, com o teto de 100 pedidos no Basic e análises com IA no Business.
- **Produtos:** cadastro pede nome, preço e quantidade. O código interno fica em detalhes. O saldo aparece em disponíveis, reservados e em mãos. Dá para baixar o relatório de estoque, saídas e vendas.
- **Pedido:** o item do cliente continua igual. Produto da loja só aparece no botão Da loja, para o admin Worqera.
- **Plano:** oficina com plano vencido abre a tela de assinatura e para de recarregar.
- **Site:** o dia da operação anima de manhã até a entrega. O card Basic fala em pedidos limitados. O número 100 aparece no checkout.
- **Checkout:** a tela cumprimenta pelo nome, mostra a empresa no plano e os três momentos dos 7 dias. Sem cartão e sem slug.
- **FAQ:** saiu a pergunta de WhatsApp automático.
- **Site:** cores da Worqera (roxo e verde), modo escuro no canto do menu e WhatsApp flutuante.
- **Plano:** a tela da oficina mostra o plano aplicado no painel. Business deixa de aparecer como Pro.
- **Pedido:** a marca abre a lista da empresa. Dá para pesquisar e, se não existir, cadastrar ali.
- **Site:** a página pública passa a falar de pedidos, produtos, estoque e vendas para várias áreas. O quadro do topo anima o pedido entrando, andando, avisando por e-mail e saindo com baixa de estoque.
- **Produtos:** tela só do admin Worqera, com cadastro, variação, ajuste e histórico. No pedido, "Da loja" vende o item e entra no kanban. O financeiro mostra vendido, reservado e estoque.
- **Kanban:** no detalhe de um par, a observação que aparece é só a daquele par. Os outros pares continuam listados, sem a observação deles.

## 2026-10-08

- **Fotos:** o botão de adicionar não fica mudo depois da primeira. Se a rede cortar o envio, o aviso pede para tentar de novo em vez de travar o botão.
- **Menu lateral:** fica na altura da janela. O miolo da tela é que rola; o menu não some no fim da página.
- **Kanban:** o cartão só leva a tag "Pendente valor" ou "A pagar", sem botão. Abrir o pedido mostra se ainda falta receber. A pergunta "Já foi pago?" aparece ao marcar entregue na fila final.
- **Portal:** a lista E-mails mostra laudo, pronto e andamento, com o motivo quando não sai.
- **Kanban:** cada par mostra os serviços, a observação do serviço e a observação do par. Serviço sem preço fica como "Pendente valor" e o preço se grava ali.
- **Kanban:** pedido sem valor mostra "Pendente valor". No card, o preço se altera ali e pergunta se envia o laudo. O detalhe fica por cima do menu de baixo, então Excluir pedido não fica coberto.
- **Editar pedido:** o valor do pedido fica num campo próprio. Se mudar e salvar, pergunta se envia o laudo.

## 2026-10-07

- **Sino:** abaixo dos avisos novos fica o histórico do que já foi lido. Cada linha abre o pedido.
- **Novo pedido:** o preço pode ficar em zero. O total aparece como "A definir" e a tela avisa que o laudo espera o valor.

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
