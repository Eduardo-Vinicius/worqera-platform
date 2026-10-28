# Worqera — Release notes · 28 de outubro de 2026

Quem atende, quem recupera e o que falta no estoque, com pouca digitação: tudo nasce marcado ou leva um toque.

## 1. "Aberto por" no topo do pedido (site e app)

- A primeira coisa do Novo pedido é a barra **Aberto por**, com o nome de cada pessoa que atende.
- Quem usou por último naquele aparelho já vem marcado. No balcão, quase sempre é zero toque.
- Dono e admin têm **+ Cadastrar** ali mesmo: digita o nome e já fica marcado.
- **Quando é obrigatório:** só quando a loja tem alguém marcado como "Atende no balcão". Pedidos antigos e o app sem atualizar continuam funcionando, como "Não informado".
- **Funcionários:** nova opção "Atende no balcão". Para quem atende, o setor é opcional.
- **Etapas sempre numeradas:** 1 Cliente · 2 Item · **3 Produtos da loja** · 4 Pagamento.
  - Sem produtos cadastrados, Pagamento volta a ser a 3.
  - Produtos da loja mostra o contador (ex.: "2 itens · R$ 40,00") no título, no resumo, na barra de baixo e na confirmação.
- O detalhe do pedido mostra "Aberto por". Trocar quem abriu fica registrado no histórico.

**Testar:**
1. Funcionários → marque duas pessoas em "Atende no balcão".
2. Novo pedido → confira que a barra aparece com elas e não deixa criar sem marcar.
3. Crie um pedido com produto da loja e veja o contador.
4. Abra outro Novo pedido: a mesma pessoa já vem marcada.

### Relatório de atendimento (site, dono/admin)

- **Gestão → Atendimento** no menu:
  - Escolha o período: 7 dias, 30 dias, 90 dias ou 1 ano.
  - Cards de pedidos, % com "Aberto por", nota do atendimento e recuperados.
  - Tabela por pessoa: pedidos, entregues, vendido, ticket, nota e recuperações.
  - "Ver pedidos" de cada pessoa e botão **Excel / CSV**.
- **Pedidos em andamento sem "Aberto por":** a lista fica no fim do relatório. Escolha quem atendeu e salve, e o pedido já entra na conta da pessoa.
- **Kanban:** no detalhe do pedido, toque em "Aberto por" e troque a pessoa. Se o pedido estiver sem ninguém, aparece em destaque.
- **Pedidos:** filtro "Aberto por" e o nome de quem abriu em cada linha.
- **Editar pedido:** trocar "Aberto por" agora salva. Antes o site descartava a mudança.

## 2. Recuperou? Conte como (site e app)

- Ao marcar **Recuperado** em Orçamentos, abre um diálogo curto, em qualquer um destes lugares: botão Fechou, etapa, lista ou arrastando no quadro.
  1. **O problema era:** já vem com o motivo da recusa e dá para corrigir.
  2. **Como reverteu:** Desconto, Prazo melhor, Nova proposta, Insistiu/retornou, Explicou o serviço ou Outro.
  3. **Quem ajudou:** já vem marcado quem aparece no histórico de contatos.
  4. **Detalhe:** opcional.
- O pedido volta para a fila com o selo **Recuperado** no kanban (site e app) e no cabeçalho do pedido.
- Orçamento de balcão recuperado abre o Novo pedido, e esse pedido já nasce marcado como recuperado.

**Testar:** recuse um pedido → Orçamentos → registre uma ligação → Fechou → preencha → veja o selo no kanban.

## 3. Recuperados e Financeiro (site)

- **Orçamentos → Recuperados** (aba nova) mostra:
  - Taxa de recuperação, média de contatos até fechar e de pessoas por lead.
  - **Problema → como reverteu**, ex.: "Preço: 5 recuperados, 3 com desconto".
  - Quem mais recupera e a lista completa.
  - Períodos: 30 dias, 90 dias ou 1 ano.
- **Financeiro:** mini card **Recuperado**, com quanto voltou e quantos tênis no período. Leva para a aba Recuperados.
- **Pedidos:** aba Recuperados.
- **Quem vê o quê:**
  - Dono e admin veem os totais.
  - Atendimento vê o valor de cada pedido, sem a soma do período.
  - Setor não vê.

## 4. Como foi o atendimento? (página do cliente, Métricas, Avaliações)

- Na página do pedido, o cliente dá estrelas para o atendimento (opcional) e lê "Você foi atendido por Ana". Só aparece o primeiro nome.
- **Métricas → Atendimento** (dono/admin), por pessoa:
  - Pedidos abertos, vendido e ticket médio.
  - Nota do atendimento e quantos clientes ajudou a recuperar.
  - Quanto dos pedidos tem "Aberto por" marcado.
- **Avaliações:** filtro "Atendido por" e a média do atendimento ao lado da nota geral.

**Testar:** abra o link público de um pedido pronto → avalie com estrelas no atendimento → Métricas → Atendimento.

## 5. Repor estoque com prazo do fornecedor (site e app)

- No produto, preencha **Prazo do fornecedor (dias)**, ex.: solado 35.
- **Hora de pedir:** quando o disponível chega em max(mínimo, uso por dia nos últimos 60 dias × prazo do fornecedor).
- O card **Repor estoque** no topo de Produtos tem três grupos:
  - **Atrasado:** passou da data prevista de chegada.
  - **Hora de pedir:** mostra quantos dias o estoque ainda dura.
  - **A caminho:** mostra a data prevista de chegada.
- **Pedi ao fornecedor:** informe a quantidade, e a data já vem como hoje + prazo. Em produto com variação, escolha qual.
- **Chegou:** soma no estoque, com o motivo "Chegou do fornecedor".
- No resumo do dia (dono/admin) aparece, por exemplo, "Pedir Solado X ao fornecedor" ou "Solado X atrasado no fornecedor".

**Testar:** cadastre "Solado X" com 3 unidades, mínimo 1 e prazo 35 → vá vendendo → Pedi → Chegou.

## 6. Pronto antigo? Confira e finalize (site e app)

- **Na prateleira da Visão geral** (dono), prontos há 7 dias ou mais aparecem no chip "**N para conferir**": talvez já tenham saído sem ninguém marcar.
- Cada pedido tem três ações:
  - **Conferir:** marca com uma bandeira, que também aparece no kanban.
  - **Já entregue:** pergunta se recebeu o saldo e finaliza como pago ou como entregue sem pagar.
  - **Lembrar:** continua como antes.
- **No kanban:** dono, admin e atendimento podem marcar "Conferir: será que já saiu?" no detalhe de um pronto.
- **No resumo do dia:** a nova ação "Conferir N prontos antigos".
- Entregar o pedido tira a marca.

---

## Verificado

- API: 29 testes.
- Teste em banco descartável com **36 checagens**, cobrindo:
  - "Aberto por": obrigatório, app antigo e funcionário inválido.
  - Recuperação, selo e pedido vindo do orçamento.
  - Relatório de recuperados e Financeiro.
  - Nota de atendimento, métricas e filtro de avaliações.
  - Repor estoque nos quatro estados.
  - Conferir e entregar.
- Site: typecheck completo. App: `flutter analyze` sem avisos.
- **Não verificado:** telas logadas no navegador e no celular. Antes de anunciar, abra o Novo pedido, Orçamentos → Recuperados, Produtos e a prateleira.

## Para anunciar

Admin Worqera → Notícias → modelo **"Aberto por, recuperados e repor estoque"** (o primeiro da lista) → Pré-visualizar → Publicar.
