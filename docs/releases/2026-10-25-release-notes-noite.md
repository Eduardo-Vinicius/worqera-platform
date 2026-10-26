# Worqera — Release notes · 25 de outubro de 2026 (noite)

Pacote C, em cima dos pacotes A e B de `2026-10-25-release-notes.md`. Tudo local, sem commit. Não há migração de banco nem cron novo.

**Publicar:** API + site + app (a API mudou: colunas Entregues/Recusados, filtro de recusados e o resumo do dia novo).

---

## 1. Menu lateral mais limpo (site e app)

- **Operação:** Visão geral, Kanban, Pedidos, Orçamentos, Clientes, Consultas, Avaliações.
- **Cadastros:** Serviços, Produtos, Marcas, Acessórios, Setores.
- **Gestão** (dono e admin): Financeiro, Métricas, TV Financeiro.
- **Administração** (no fim): Empresa, TVs e, só para dono e admin, **Equipe e acessos**, **Funcionários** e **Plano**.
- **Worqera** (só admin Worqera): Visão geral, Oficinas, Parâmetros, Notícias.
- Atendimento não abre mais Equipe e Funcionários nem pelo endereço.
- O menu lateral do app ganhou **Orçamentos**, que faltava.

**Testar:** entrar como dono e como atendimento e comparar o menu.

## 2. Detalhe do pedido no kanban com cara de ficha (site e app)

- **Topo:** iniciais e nome do cliente, código, **telefone** (toque liga), **e-mail** (toque abre o e-mail), botão Editar, setor, status, prazo (vermelho se atrasado) e **quanto falta receber**.
- **Botões grandes:**
  - **Avançar · próximo setor**, ou **Entregar** quando está no final.
  - **Avisar:** mensagem pronta para o momento (pronto, vai atrasar, andamento, link, agradecer), editável, enviada por **WhatsApp**, **e-mail** ou **copiar**.
  - **Não fechou:** vai para Orçamentos.
- **Mover para:** todos os setores em uma linha, um toque muda o pedido de lugar.
- Embaixo continuam Valor, Itens, Fila, **Mais ações** (link, laudo, imprimir, etiqueta), Fotos e QR, **Prazo, prioridade e observação** (salva tudo junto) e Histórico.
- No site o drawer ficou mais largo (580 px).

**Testar:** abrir um pedido no kanban → Avisar → escolher "Pronto para retirar" → WhatsApp. Avançar → o card muda de coluna. Editar o telefone no topo → Salvar.

## 3. Colunas Entregues e Recusados (site no computador, site no celular e app)

- **Celular (site e app):** dois chips a mais depois dos setores, **Entregues** (verde) e **Recusados** (vermelho), com a contagem. Tocar abre a lista em tela cheia, com 7, 14 ou 30 dias. No app, "Abrir no Orçamentos" abre a ficha do orçamento.

- Duas faixas no fim do quadro: **Entregues** (verde) e **Recusados** (vermelho), com a contagem. Um toque abre a coluna.
- **Entregues:** o que saiu nos últimos 7, 14 ou 30 dias, com valor e nota da avaliação.
- **Recusados:**
  - Mostram o motivo (Preço, Prazo…) e a etapa no Orçamentos (Retorno 28/10, Recuperado…).
  - Botão **Abrir no Orçamentos**.
- Tocar no card abre o detalhe do pedido. A coluna lembra se estava aberta.
- **Ver todos em Pedidos:** em Pedidos e em **Consultas → Pedidos** há a aba nova **Recusados** (selo vermelho), além de Finalizados (selo verde).
- Conta de setor não vê essas colunas.

**Testar:** entregar um pedido → abrir Entregues no fim do kanban. Fazer "Não fechou" em outro → abrir Recusados → Abrir no Orçamentos.

## 4. Orçamentos → Quadro sem travar (site)

- O card arrastado flutua por cima de tudo (antes sumia atrás das colunas).
- Funciona com mouse, toque (segurar um instante) e teclado.
- A coluna de destino acende e mostra "Soltar em …".
- O quadro saiu da página e virou um componente próprio (`components/quotes/QuoteBoard.tsx`).
- **Ligar hoje** continua sendo a tela inicial de Orçamentos.

**Testar:** Orçamentos → Quadro → arrastar de Novo para Em contato e de Retorno para Perdido. No celular, segurar e arrastar.

## 5. Resumo do dia que mostra o dinheiro (site e app)

- No topo, **"R$ X em jogo hoje"**: orçamentos para ligar + prontos para receber + entregues sem pagar.
- Frase de abertura e **dica do dia**. No Business, a IA escreve citando nomes e valores; sem IA, uma frase pronta com os mesmos números.
- **4 prioridades com botão**, da que vale mais para a que vale menos:
  - Ligar para fulano (valor, motivo, atrasado).
  - Avisar prontos (quanto a receber).
  - **Cobrar entregues sem pagar** (pagamentos pendentes).
  - Lembrar parados na prateleira.
  - Destravar atrasados (o mais antigo).
  - Dar preço a pedidos sem valor.
  - Preparar as entregas de amanhã.
- O custo de IA é o mesmo de antes (no máximo 1 texto a cada 3 horas, ou ao tocar em atualizar).

**Testar:** Visão geral → conferir o valor em jogo e tocar em cada prioridade (leva a Orçamentos, Kanban, Pedidos → Entregue sem pagar ou à Prateleira).

## 6. Novidades com mais vida (site e app)

- O quadro entra com zoom, o cabeçalho tem degradê em movimento e luzes, sai confete ao abrir e ao terminar o tour.
- Os passos trocam deslizando, com barra de progresso e bolinhas clicáveis. No fim: "Tudo pronto" e o botão **Bora usar**.
- Quem desliga animações no sistema vê a versão parada.
- **Admin Worqera → Notícias:** botão **Pré-visualizar**, para ver exatamente como fica antes de publicar.
- Modelos novos:
  - **"Tudo o que chegou em outubro"** (o primeiro da lista, recomendado para publicar), com 6 passos: Orçamentos, pedido-ficha com Avisar, produtos no pedido e venda de balcão, Entregues/Recusados, R$ em jogo com prateleira, e Google com IA no Business.
  - **"Kanban turbinado e R$ em jogo"**, só desta rodada.
  - Continuam os modelos Produtos, Novidades da semana e Orçamentos e IA.

**Testar:** Notícias → "Tudo o que chegou em outubro" → Pré-visualizar → percorrer o tour → Publicar.

## 7. Comunicação (menu novo, site) · 26/10

- No menu lateral, a seção **Comunicação → WhatsApp e e-mail** tem cinco abas:
  - **WhatsApp:** o oficial (conectar, automático, pacote) e o "pelo celular da loja".
  - **E-mail:** liga e desliga, e o que é enviado.
  - **Modelos:** as 4 mensagens com prévia.
  - **Automações:** o que sai sozinho e o status de cada uma.
  - **Sem bloqueio:** o guia para não cair o número.
- Esses blocos saíram de Empresa, que ganhou um atalho para Comunicação.

**Testar:** Comunicação → Modelos → editar "Pronto para retirar" → ver a prévia → Salvar → abrir um pedido → Avisar e conferir o texto.

## 8. Mais IA que vale a pena · 26/10

- **Financeiro → Cobrança inteligente:**
  - Quanto há a receber, quanto é de pedido já entregue e a idade da dívida (até 7 dias, 8 a 30 e mais de 30).
  - A lista vem na ordem de cobrança, com o botão **Cobrar**: a mensagem sobe o tom conforme o atraso.
  - No Business, a IA escreve o plano do dia.
- **Ficha do cliente → Raio-X:**
  - Quantos pedidos, quanto gastou, ticket médio, de quanto em quanto tempo volta e o que mais pede.
  - Etiquetas (Cliente fiel, Sumido há X dias, Deve R$ X, Ama a loja) e o **próximo passo** com ele.
- **Avisar → Melhorar com IA** (Business): reescreve a mensagem no tom da loja sem mexer no código, nos valores e no link.
- Custo: 1 texto por uso, com cache (cobrança 6 h, cliente 1 dia), dentro dos 1.000 usos do Business.

---

## Verificado

- API: 29 testes; teste em banco descartável do resumo do dia (valores, prioridades, texto sem IA) e das colunas Entregues/Recusados, incluindo a conta de setor e `?refused=1` (14 checks).
- Site: typecheck. App: `flutter analyze` sem avisos.
- **Não verificado:** telas logadas no navegador e no celular (abrir o kanban, o resumo e o quadro antes de anunciar).

## Planejado (ainda não feito)

Ver `docs/superpowers/plans/2026-10-25-proximas-ondas.md`:
- Conversa dentro do pedido.
- Chat da equipe.
- Caixa de entrada de e-mail e WhatsApp.
- Agenda e contact center.
- Onde mais plugar IA, com custo por loja.
