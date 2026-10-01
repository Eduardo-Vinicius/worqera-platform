# Worqera — Produtos e estoque como origem do pedido

**Data:** 2026-10-01  
**Status:** desenho (ainda não implementado)  
**Para consultar depois.** Este texto é a referência de produto. A implementação segue isto; o que estiver fora da seção “Fora deste corte” não entra no primeiro código.

**Relacionados:** [verticais candidatas](./2026-09-18-worqera-verticais-candidatas.md) · [posicionamento](./2026-09-22-worqera-publicos-posicionamento-design.md) · [escala / o que não era estoque](./2026-09-18-worqera-escala-status-pack.md)

---

## 1) A ideia em uma frase

O pedido e o kanban continuam iguais. Muda só **de onde o item nasce**: o cliente trouxe, ou a loja já tinha (ou vai produzir) um produto seu.

Worqera não vira ERP. Continua sendo a fila: pedido, setores, pronto, QR, aviso. Estoque existe para a linha do pedido não mentir quando a loja vende algo que é dela.

Um spec de 2026-09-18 deixava estoque de fora, junto com NF-e. Esta decisão abre **catálogo + saldo + linha do pedido**. Não abre nota fiscal, compra de fornecedor nem depósito.

---

## 2) O que não muda

- Um pedido, um cliente (nome na hora continua valendo), um código, um prazo, pagamento, garantia, PDF, QR, e-mail.
- Kanban: um card por item do pedido. Arrastar, prioridade, atraso, setor, histórico.
- Loja que só recebe peça do cliente (sapataria, funilaria, grooming) não é obrigada a cadastrar produto. A origem padrão é **Do cliente**.
- Casa do Tênis não é regra do core. Nome do item segue o `itemLabel` da loja (peça, tênis, roupa, equipamento).

---

## 3) Duas origens, um item

Cada item do pedido tem origem:

| Origem | Quem é o dono da coisa | O que a tela pede | Estoque |
|--------|------------------------|-------------------|---------|
| **Do cliente** | O cliente trouxe | Nome livre (hoje “modelo”), serviços, fotos, observações, caminho de setores | Não mexe |
| **Da loja** | A loja vende ou fabrica | Produto do catálogo, variação se houver, quantidade | Depende do produto |

As duas podem estar no **mesmo pedido**. Dois cards no mesmo kanban.

Exemplos:

- Sapataria que também vende palmilha: par do cliente (lavagem) + palmilha da loja.
- Oficina de bike: bicicleta do cliente (revisão) + câmara da loja.
- Loja de roupa: só itens da loja.
- Impressão 3D: só itens da loja, em geral sem saldo (faz na hora).
- Atelier: vestido do cliente (ajuste) + vestido pronto da arara.

Serviços, fotos e observações **não somem** no item da loja. São opcionais. Servem para personalizar: estampa, pintura, “sem lactose”, foto de referência do cliente. O que troca é a identidade do item (produto em vez de nome livre), não o card inteiro.

Quantidade maior que 1 continua **um card** (`Camiseta · M · 2`). Não vira dois cards. Peça do cliente segue quantidade 1: cada par, cada carro, cada animal é um item.

---

## 4) Dois jeitos de produto

O mesmo cadastro. Um interruptor: **controla estoque**.

### Prateleira (`trackStock: true`)

A loja tem unidades físicas. Roupa, palmilha, tela de celular, bolo já pronto, peça de bike, joia.

- Ao criar o pedido, a quantidade fica **reservada**.
- Enquanto o pedido está aberto, em andamento ou pronto, essa reserva segura o saldo para não vender duas vezes.
- Ao entregar, a reserva vira **baixa** (sai do físico).
- Ao cancelar, apagar o item, diminuir a quantidade ou apagar o pedido, a reserva **volta**.
- Saldo insuficiente **bloqueia** a linha, com mensagem do tipo “Camiseta M: só tem 1 disponível”. Não vende negativo.

Disponível = físico − reservado.

### Sob encomenda (`trackStock: false`)

Não há saldo. O produto é o que a loja sabe fazer ou vende sob pedido: impressão 3D, bolo encomendado, chave copiada, camisa feita na hora, serviço empacotado com nome e preço fixos.

Vira item do pedido e anda no kanban como produção. Setores sugeridos do produto entram no caminho do card, do mesmo jeito que o serviço já sugere setores hoje.

A loja pode ter os dois tipos no catálogo. Uma gráfica vende caderno em estoque e também impressão sob encomenda.

---

## 5) Variação

Entra no primeiro corte. Sem isso, roupa e assistência não fecham.

Um produto pode ter uma lista simples de variações, cada uma com nome, SKU opcional, preço e (se controla estoque) saldo próprio.

Exemplos de nome de variação, todos válidos, sem grade pronta:

- P, M, G
- Preto / M
- iPhone 13
- 20 cm
- Sem lactose

Sem variação, o saldo e o preço ficam no produto. Não há gerador de grade (cor × tamanho automático), código de barras nem foto por variação neste corte. A foto é do produto.

Preço da variação, se preenchido, vale na hora da venda. Se vazio, usa o preço do produto.

---

## 6) Como cada frente usa a mesma coisa

O loop é um só. A loja escolhe setores e o que cadastra. Nada disso é um app separado nem um catálogo oficial da indústria.

### Quem só recebe coisa do cliente

Não precisa de produto. O pedido de hoje continua o caminho feliz.

| Frente | Item do cliente | Produto da loja (se quiser, depois) |
|--------|-----------------|--------------------------------------|
| Sapataria / restauração | Tênis, bota | Palmilha, cadarço, kit de tinta |
| Lavanderia / tinturaria | Roupa, edredom | Em geral não usa |
| Funilaria / estética automotiva | Carro | Cera, produto de detalhe vendido à parte |
| Pet grooming | Animal | Shampoo ou acessório vendido na saída |
| Ótica (conserto) | Óculos do cliente | Armação da loja, se vender |
| Assistência (só mão de obra) | Celular, notebook, bike | Pode ficar sem produto |

O nome livre do item continua sendo o campo de hoje (modelo, placa, nome do pet, IMEI anotado no nome). Não criamos campo especial por vertical.

### Quem mistura peça do cliente e peça da loja

O caso mais importante para não quebrar a sapataria ao abrir a porta da loja de roupa.

| Frente | Card “do cliente” | Card “da loja” |
|--------|-------------------|----------------|
| Bike / assistência | Equipamento + serviços (troca de tela, revisão) | Peça de reposição (tela, câmara, corrente) com saldo |
| Atelier / costura | Roupa para ajustar | Peça pronta da arara |
| Sapataria com vitrine | Par para lavar | Produto de prateleira |
| Joalheria | Peça para polir | Anel do mostruário |

A peça de reposição é um **item**, não um insumo escondido dentro do serviço. Assim ela tem card, prazo e QR se a loja quiser, e o saldo baixa de verdade. Insumo consumido sem venda (cola, filamento, solvente) fica para um corte futuro. Ver seção 12.

### Quem vende da prateleira

O kanban vira a fila de separar, embalar e avisar que pode retirar ou que saiu para entrega. Os setores são da loja: Separar, Embalar, Pronto. Não há setor obrigatório chamado “estoque”.

| Frente | Produto | Variação típica | Estoque |
|--------|---------|-----------------|---------|
| Roupa / brechó | Camiseta, calça | Tamanho ou cor/tamanho | Sim |
| Acessórios, papelaria | Caderno, caneca | Cor, se houver | Sim |
| Joalheria / ótica (venda) | Armação, anel | Modelo ou aro | Sim |
| Mercado pequeno / conveniência leve | Item com preço | Em geral sem | Sim |

Um pedido de 3 camisetas iguais é um card com quantidade 3. Três modelos diferentes são três cards.

### Quem produz sob encomenda

O catálogo é a vitrine do que a loja faz. O kanban é a produção.

| Frente | Produto | Estoque | O que anda no card |
|--------|---------|---------|-------------------|
| Impressão 3D | “Suporte de fone”, “Peça sob desenho” | Não | Nome, quantidade, foto de referência, observação, setores (modelar, imprimir, acabamento) |
| Gráfica / impressão | Cartão, banner, camisa estampada | Às vezes o cartão pronto sim; a arte sob encomenda não | Arquivo/foto + prazo |
| Confeitaria | Bolo 2 kg | Não, se for encomenda; sim, se for bolo de vitrine | Observação (massa, recheio) |
| Chaveiro | Cópia de chave Yale | Não | Quantidade |
| Marcenaria pequena / brinde | Porta-retrato, troféu | Não | Personalização em observação |

“Peça sob desenho” pode ser um produto genérico sob encomenda, com o detalhe na observação e na foto. Não é obrigatório cadastrar cada STL.

### Quem faz os dois no mesmo dia

Gráfica, confeitaria e loja de camisetas: parte do catálogo controla estoque, parte não. O interruptor é por produto, não por loja. A loja não escolhe “eu sou varejo” e perde a peça do cliente. Uma sapataria pode ligar o módulo sem mudar o vertical.

---

## 7) Saldo, na prática

Números guardados por produto ou por variação (quando existe variação, o saldo da variação manda; o do pai fica vazio):

- **Físico:** o que está na loja.
- **Reservado:** soma das linhas de pedidos ainda não entregues e não cancelados.
- **Disponível:** físico − reservado. É o número que a tela mostra como “pode vender”.

Movimentos, sempre com quem fez, quando, motivo e, se veio de pedido, o pedido e o item:

| Movimento | Quando | Efeito |
|-----------|--------|--------|
| Entrada / ajuste | Alguém lança na ficha (+ compra, − perda, contagem) | Muda o físico. Motivo obrigatório |
| Reserva | Pedido criado ou quantidade aumentada | Sobe o reservado. Não mexe no físico |
| Estorno de reserva | Cancelou, apagou item, diminuiu quantidade, pedido foi para a lixeira | Desce o reservado |
| Baixa | Pedido entregue | Desce o físico e desce o reservado, na mesma quantidade |
| Reabertura | Pedido entregue volta a aberto | Desfaz a baixa (físico volta) e reserva de novo. Se o disponível não alcançar, a reabertura dessa linha é bloqueada |

Pedido antigo, sem origem, conta como **Do cliente**. Nenhum saldo é recalculado para trás.

Editar a linha:

- Trocar variação ou produto: estorna a reserva antiga e reserva a nova. Se a nova não tem saldo, a troca não grava.
- Pedido já entregue: continua sem mudança estrutural do item, como hoje.

Apagar produto: se ainda há reserva ou pedido aberto usando ele, responde como o setor em uso (não apaga, explica). Pedido já entregue guarda o **nome copiado** e não depende do cadastro continuar lá.

Estoque mínimo é só aviso (lista de produtos e, se couber no mesmo corte, um aviso na visão geral). Não bloqueia venda.

Dois pedidos ao mesmo tempo no último item: a reserva precisa ser atômica. O segundo recebe a mensagem de saldo, não os dois ficam com a peça.

---

## 8) O que fica gravado no item

Além do que o item já tem (serviços, fotos, notas, setor, histórico):

- `origin`: `brought` (padrão) ou `stock`
- `productId` e `variantId`, quando a origem é da loja
- `quantity`, padrão 1
- `snapshot`: nome do produto, nome da variação, preço unitário, SKU se houver

O card, o PDF, a etiqueta e a consulta pública leem o snapshot. Se amanhã o preço do cadastro mudar, o pedido antigo não muda.

Total do pedido: soma dos serviços, mais quantidade × preço unitário dos itens da loja, mais garantia se houver. Sinal e restante continuam como hoje. O bloco de pagamento aparece se essa soma for maior que zero, não só quando há serviço.

---

## 9) Telas

### Produtos (configuração, ao lado de Serviços)

Quem vê: dono e admin, como Serviços.

- Lista: nome, preço, se controla estoque, disponível, aviso se disponível ≤ mínimo, variação resumida (“3 variações”).
- Ficha: nome, SKU, preço, descrição, foto, controla estoque, mínimo, setores sugeridos, ativo, variações.
- Ajuste: quantidade (+/−) e motivo. Histórico curto dos últimos movimentos na própria ficha.
- Apagar: some do catálogo. Não apaga pedido antigo.

Loja sem nenhum produto: a lista vazia explica em uma frase que isso é para vender ou produzir algo da própria loja, e que pedido de peça do cliente não precisa daqui.

### Novo pedido / editar

Em cada item, dois modos, com rótulo que não cita tênis:

- **Do cliente** — formulário atual.
- **Da loja** — busca do produto, variação, quantidade, preço (editável na linha, para desconto na hora), serviços opcionais, fotos, observação.

O preço editado na linha é o que entra no snapshot. Não altera o cadastro.

### Kanban, consulta, etiqueta, laudo

- Do cliente: título como hoje (modelo / itemLabel).
- Da loja: `Nome · Variação · N un` (omite variação ou quantidade quando não fizer falta; quantidade 1 pode aparecer só como o nome).
- Foto de capa: foto do item se anexaram; senão a foto do produto copiada no snapshot.
- QR continua um por item e um do pedido. A página pública mostra o nome do snapshot, a quantidade e os serviços.

TV e financeiro não ganham tela nova neste corte. O valor do pedido já cai no financeiro porque o total do pedido muda.

---

## 10) API (primeiro corte)

Por loja, no mesmo estilo do catálogo de serviços:

- `GET /products` e `GET /products/:id`
- `POST /products` e `PATCH /products/:id`
- `DELETE /products/:id` — 409 se houver reserva ou pedido aberto
- `POST /products/:id/adjust` — corpo com quantidade (positiva ou negativa) e motivo
- `GET /products/:id/movements` — últimos lançamentos

Pedido:

- Criar e editar item aceita `origin`. `stock` exige produto ativo e, se houver variações, uma variação.
- Reserva, estorno e baixa acontecem dentro da mesma operação que grava o pedido. Se a reserva falha, o item não é criado.
- Cancelar, entregar, reabrir e apagar item disparam o movimento correspondente.

Nada de endpoint público de catálogo neste corte. A consulta pública continua sendo do pedido, não uma vitrine.

---

## 11) Primeiro corte, em ordem

1. Cadastro de produto, variação, saldo e ajuste, com movimento auditável.
2. Origem no item do pedido: reservar, baixar na entrega, estornar no cancelamento ou na exclusão.
3. Tela Produtos e o seletor de origem no pedido.
4. Kanban, laudo, etiqueta e consulta leem o snapshot.

Loja existente: zero produto, todo item antigo `brought`. Nenhum comportamento atual muda até alguém escolher “Da loja”.

---

## 12) Fora deste corte

De propósito, para não virar ERP:

- NF-e, NFC-e, imposto.
- Pedido de compra, fornecedor, custo médio, margem.
- Vários depósitos ou lojas compartilhando saldo.
- Código de barras, balança, frente de caixa, cupom.
- Grade automática cor × tamanho, kit/combo, foto por variação.
- Insumo: “ao lançar o serviço Pintura, baixar 10 g de tinta”. A peça vendida é item do pedido; o material gasto na bancada fica para depois.
- Vitrine pública / loja online. O cliente final continua acompanhando o pedido, não comprando sozinho.
- Pedido sem pessoa: balcão anônimo pode usar um nome (“Balcão”) como já dá para fazer hoje.
- Importar planilha de estoque. Dá para lançar ajuste um a um no primeiro corte.

---

## 13) Frases de produto (para a tela, não para a landing)

- Lista vazia: “Produtos são o que a loja vende ou fabrica. Pedido de algo que o cliente trouxe não precisa daqui.”
- Interruptor: “Controla estoque”. Ligado: “A quantidade reserva quando o pedido é aberto e sai quando é entregue.” Desligado: “Sob encomenda. Entra no pedido sem mexer em saldo.”
- Saldo curto: “Só tem N disponível.”
- Apagar em uso: “Ainda tem pedido em aberto com este produto.”

A landing e o pitch principal continuam os da fila (“o cliente para de ligar”). Estoque é capacidade da loja que vende ou produz, não um segundo produto com outro nome.
