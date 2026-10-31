# CRM, ramos e gestão: o que entrou e a onda 2

Referência: análise do procedy-platform (módulos de clientes, relacionamento, estoque e financeiro).

## Onda 1: entregue em 30/10

- **CRM:** cliente com aniversário (ano opcional), etiquetas, origem e observações (as observações eram descartadas antes).
  - `/crm/summary`, `/crm/list` (aniversariantes, sumidos, recorrentes, novos, VIP) e `/crm/insight` (IA no Business, com texto pronto sem IA).
  - Mensagem de WhatsApp pronta por cliente.
  - Ficha do cliente com histórico (`/clients/:id/overview`; `GET /clients/:id` também traz o histórico, para o app antigo).
  - Resumo do dia ganhou "Parabenizar aniversariantes".
- **Ramos:** `Shop.workflow`, com dois valores.
  - `receive`: o cliente traz o item.
  - `produce`: a empresa produz ou instala.
  - Kits novos: automotivo, marcenaria, gráfica e produção sob encomenda.
  - O ramo é escolhido no cadastro e em Empresa.
  - No pedido em `produce`, sai marca/modelo e entra "O que será feito", "Medidas e detalhes" e "Fotos de referência".
  - Corrigido: aplicar um kit podia deixar a empresa sem setores (slug repetido).
- **Menus:** Operação · Clientes · Estoque e cadastros · Gestão · Administração, iguais no site e no app.
- **Celular mais leve:**
  - Sem blur no topo e na barra de baixo no celular.
  - Rolagem nativa.
  - Lista de clientes do app só monta o que aparece na tela.
  - Cartões sem sombra borrada.

## Onda 2: próxima (não feita)

1. **Financeiro de verdade** (como o procedy):
   - Lançamentos a receber e a pagar, com vencimento, baixa, forma de pagamento e parcelas.
   - Fluxo de caixa com faixas de vencimento (vencido, 30, 60 e 90 dias) e baixa em lote.
   - Categorias configuráveis (o procedy usa lista fixa) e DRE simples do mês.
   - Os pedidos continuam gerando o "a receber" automaticamente; os lançamentos manuais cobrem aluguel, salário, fornecedor etc.
2. **Compras e fornecedores:**
   - Fornecedor, pedido de compra com itens e parcelas, e "recebi" que soma no estoque (liga com Repor estoque).
   - Custo do produto e margem.
3. **Estoque:** tela de movimentações com filtro, inventário (contagem) e custo médio.
4. **CRM, continuação:**
   - Tarefas e retornos por cliente (ligar dia X).
   - Campanhas pelo WhatsApp oficial respeitando opt-out.
   - Importar clientes por planilha.
   - Segmento VIP com régua de agradecimento.
5. **Ramos, continuação:**
   - Para `produce`: agenda de instalação/entrega e sinal obrigatório na aprovação.
   - Para o automotivo: placa como identificador do item.
   - Textos do e-mail e da página do cliente por ramo ("Recebemos seu tênis" → "Seu pedido entrou em produção").
6. **Performance:** paginação "carregar mais" nas listas grandes do site (pedidos e clientes acima de 200).
