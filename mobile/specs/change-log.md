# App celular

## 2026-10-08

- **Fotos:** se o botão for tocado de novo com a câmera ainda aberta, avisa em vez de ficar mudo.
- **Kanban:** o nome e o detalhe de cada serviço ficam logo abaixo do cliente, em texto normal.
- **Pedido:** a observação do serviço grava no serviço, e a do par grava no par. O kanban e a ficha mostram as duas.
- **Kanban:** pedido sem valor mostra "Pendente valor".
- **Editar pedido:** campo Valor do pedido. Se o preço mudar, pergunta se envia o laudo.

## 2026-10-07

- **Sino:** a folha de avisos mostra o histórico do que já foi lido. Tocar na linha abre o pedido.
- **Novo pedido:** dá para criar sem valor. O total mostra "A definir" e o laudo fica em espera até alguém colocar o preço.

## 2026-10-06

- **Início:** a visão geral segue a do site: o que fazer agora, atalhos, fila recente e carga por setor. Novo pedido, kanban, consultas e clientes abrem de verdade.
- **Kanban:** some o segundo menu. A busca fica numa linha e a data de entrada na de baixo.
- **Cliente:** no pedido, em Clientes e em Consultas, a busca vai na lista inteira enquanto se digita. Nome, telefone, CPF e e-mail batem com ou sem acento e pontuação.
- **Kanban:** o chip Data filtra a fila pelo dia em que o pedido entrou. Tocar de novo limpa.
- **Novo pedido:** o pedido é criado e a tela de sucesso abre na hora. As fotos de cada item sobem juntas. O e-mail do laudo sai depois, já com elas.
- **Setores:** ordem, QR público, e-mail ao entrar e ocultar. Serviços gravam o preço que a API espera. Marcas e acessórios podem ficar inativos.
- **Cliente:** a ficha mostra endereço e observação, e o pedido abre no mesmo lugar.
- **Funcionários:** filtro por setor e por ativo.
- **Oficinas:** busca, trial, pagas, suspensas e selos. Notícia escolhe a plataforma e pode ser apagada.
- **Avaliações:** distribuição das notas, críticas e tags.

- **Pedidos:** dono copia o CSV. Quem não é setor cria um pedido de exemplo.
- **Avaliações:** período 30, 90 ou tudo, página seguinte e CSV.
- **Métricas:** 7, 30 ou 90 dias.
- **Plano:** mostra quantos dias de trial restam.

- **Avisos:** abrir o sino marca como lido de verdade. O número some e a lista antiga não volta. Só entra o que acontecer depois.
- **Portal:** oficinas em risco, chamadas de 24h, falhas 5xx e módulos desligados numa tela. Atualiza no botão, sem ficar pedindo a API sozinho.

## 2026-10-05

- **Menu:** o item escolhido troca o conteúdo na mesma tela. O dock e a barra Worqera ficam. A seta de voltar só aparece quando se entra num detalhe (cliente, pedido, TV).
- **Equipe:** convite com papel e setores, editar papel, desativar e reativar.
- **Funcionários:** nome, telefone, e-mail, setor e ativo.
- **Pedidos:** filtro por data e carregar mais.
- **Empresa:** identidade, kit inicial, logo e paletas no mesmo cartão da marca.

- **Faixa do plano:** some no simulador e no ambiente local, porque a API não bloqueia fora de produção. Em produção ela fica abaixo do relógio.
- **Pedido:** confirmar o cliente ou a marca não descarta o campo enquanto a folha ainda está fechando.

- **Folha de baixo:** cliente, marca, acessório, setor, serviço, equipe e funcionário sobem um painel em vez de formulário no meio da lista. Editar preço, cor e telefone vai no mesmo painel.
- **Empresa:** nome no e-mail, tipo de negócio, prévia da marca, logo (enviar e remover), cores em `#RRGGBB`, WhatsApp com telefone e textos, código de parceiro e link de indicação. O slug fica marcado como interno.
- **Marca:** o menu mostra o logo da empresa quando existe. Sem logo, o W roxo. Conta só de plataforma não vê o menu da oficina.
- **Privacidade:** tela no login e no menu. CPF na lista fica só com os dois últimos dígitos. O app não pede localização. Sair manda o refresh para a API revogar a sessão.
- **Menu:** clientes, consultas, avaliações, kanban, TVs, financeiro e métricas somem se o módulo estiver desligado. O mesmo vale em Mais.

- **Novo pedido:** o cadastro segue o site em três passos (cliente, item, pagamento). Busca e cadastro rápido de cliente, vários itens, marca, serviços com preço, partida, fotos, acessórios, garantia, desconto, sinal, prazo e prioridade. Criar pede confirmação. O total fica fixo embaixo.
- **Consulta pública:** o link e o QR usam `/p/o/{token}`, sem o nome da empresa. Ler esse QR ainda acha o pedido. Link antigo com slug continua.
- **Sino:** abrir marca os avisos como lidos. O número zera até chegar algo novo.

- **Paridade com o site:** pedido em uma página com busca de cliente e tela de sucesso (QR, PDF, WhatsApp, etiqueta e pares). Ficha com fotos, laudo e consulta pública. Kanban avisa ao mover, pede comentário fora do fluxo e mostra o selo de pares. Pedidos filtra garantia. Início tem checklist, trial e atalhos. Topo tem código, sino de prontos, tema e faixa de plano. Clientes com CEP, máscara e edição. Empresa envia logo. TVs com carrossel e ajustes. Financeiro com mais períodos, lucro, setores e exportação. Métricas com atraso médio. Oficinas estendem trial, revogam, selo e nota. Portal lista endpoints e 4xx. Cadastro, convite e onboarding. Menu respeita o módulo desligado.
- **Visual:** raio de 10 px, cartão com borda, Novo em verde-água, código em JetBrains Mono.

- **Pedido:** o formulário grava vários itens de uma vez, com serviços, setores e fotos em cada um.
- **Etiqueta:** a ficha abre o QR da consulta pública para imprimir.
- **Financeiro e métricas:** barras por dia, status, serviço e quem participou, no período de 7, 30 ou 90 dias.
- **TVs:** cliente, oficina e financeiro abrem no app.
- **Oficinas:** suspender, reativar e aplicar Basic, Pro ou Business.
- **Tema:** claro e escuro, no mesmo par do site. O menu troca.

- **Menu:** o lateral segue o site (Operação, Configuração, Gestão, Plataforma). Atendimento vê configuração e não vê plano, financeiro nem métricas.
- **Barra de baixo:** Início, Kanban, Novo pedido e Ler QR. Pedidos fica no menu lateral e nos atalhos do início.
- **Visual:** cartões com sombra, títulos maiores, transições no estilo iOS, login e início com o roxo da marca, dock flutuante.
- **Cores e fonte:** `mobile/lib/brand/tokens.dart` copia o `:root` do site. A fonte passou a ser Inter, como no web.
- **Laudo:** reenviar na ficha não espera o Gmail. O aviso diz que está a caminho.
- **Atendimento:** em Mais, vê Configuração (empresa, marcas e o restante). Plano, financeiro e métricas ficam só para admin e dono.
- **Kanban:** a soma da coluna fica oculta, inclusive para admin e dono.

## 2026-10-05

- Visual alinhado ao site: papel, roxo, cartões, menu e as mesmas seções (operação, configuração, gestão e portal). Visão geral, pedidos, clientes, consultas, avaliações, empresa, setores, serviços, marcas, acessórios, equipe, funcionários, TVs, plano, financeiro, métricas, oficinas, parâmetros e notícias.

## 2026-10-04

O app passou de Expo para Flutter (`mobile/`), no fluxo de simulador da Procedy.

Cobre login por papel, kanban com chips de setor e uma coluna, confirmação de entrega com saldo, pedidos com falta pagar, cadastro em três passos, clientes, consultas, QR, configuração e portal. Cores do site: papel `#F4F5F7`, roxo `#7D26DE`, ação `#0D9488`.
