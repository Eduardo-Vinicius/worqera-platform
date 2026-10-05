# Worqera — Quem fez o serviço no setor

**Data:** 2026-10-04  
**Status:** desenho (ainda não implementado). A primeira versão entra **oculta**: não pergunta e não trava a movimentação. A oficina liga na semana, como parâmetro.

**Relacionados:** [tenancy](./2026-09-14-worqera-saas-tenancy.md) · [plataforma](./2026-09-14-worqera-platform-design.md)

---

## 1) A ideia em uma frase

Um login por departamento. As pessoas do chão ficam na lista de funcionários, sem senha. Quando o parâmetro estiver ligado, mover o par pergunta **Quem fez?** e grava essa pessoa no histórico.

Enquanto o parâmetro estiver desligado, o kanban segue como hoje: arrasta, confirma se precisar, e o histórico mostra só a conta que moveu.

---

## 2) Por que separar login e pessoa

A bancada é um tablet compartilhado. Costura, Pintura e Acabamento não devem ter uma senha por pessoa.

| Coisa | Onde | O que é |
|-------|------|---------|
| Login do departamento | Configuração → Equipe, papel **setor**, setores daquela conta | Quem entra no Worqera e vê a coluna |
| Pessoa | Configuração → Funcionários, com o setor dela | Quem trabalhou naquele par, sem acesso |
| Dono, admin, atendimento | Equipe, login pessoal | Continuam como estão |

Não criar usuário para cada funcionário. Não criar um papel novo por coluna (`pintura`, `costura`). O papel continua `sector`, com a lista de setores da conta.

Cargo e observações do formulário de Funcionários continuam fora: a API não grava esses campos. Este corte não mexe nisso.

---

## 3) O que já existe e o que mente

A API de mover já aceita `employeeId` e `employeeName` e guarda os dois no histórico do item e no histórico do pedido. O kanban **não envia** nenhum dos dois. O histórico na tela mostra `movedByName` (o nome da conta) e só cai para `employeeName` se o primeiro vier vazio.

`assigneeEmployeeId` no pedido é outra coisa: um responsável único, usado na distribuição de métricas. Este corte **não** preenche esse campo e **não** muda o gráfico de desempenho. “Quem fez” é por movimentação, no histórico.

---

## 4) Parâmetro

Chave de serviço da plataforma: `whoDid`. Rótulo: **Quem fez**.

- Padrão: **desligado** para todas as oficinas.
- Vale o mesmo mecanismo dos outros itens do menu: geral, ou só numa oficina.
- Desligado: o kanban não abre a pergunta. A API aceita o move sem funcionário. Não devolve erro se `employeeId` vier vazio.
- Ligado: a pergunta aparece antes de confirmar o move. Aí sim a escolha passa a valer, nas regras da seção 6.

Não esconder atrás de constante no código do site. O interruptor é o parâmetro, para ligar na semana sem novo deploy da regra.

Enquanto estiver desligado, Funcionários e Equipe continuam utilizáveis. Cadastrar pessoas não muda o kanban.

---

## 5) Quando a pergunta aparece

Só com `whoDid` ligado, e só na hora de sair da coluna atual:

- Arrastar o card para outra coluna.
- Mover ou encaminhar pelo detalhe.
- Conta de setor encaminhando para a próxima coluna que ela não vê.

A pessoa escolhida é quem trabalhou **na coluna de onde o par está saindo**, não quem vai receber. A lista é os funcionários **ativos** cujo `sectorId` é essa coluna.

Exemplos:

- Conta “Costura” encaminha o par: a lista é quem está cadastrado em Costura.
- Admin arrasta de Pintura para Acabamento: a lista é quem está em Pintura.

Se a coluna de origem não tem funcionário ativo, o move segue sem pessoa. Não trava a oficina que ainda não preencheu a lista.

Fora do fluxo continua pedindo o comentário, como hoje. A pergunta de quem fez entra no mesmo passo, quando o parâmetro está ligado. Sem parâmetro, só o comentário de fora do fluxo, como hoje.

---

## 6) A escolha, quando estiver ligado

- Um nome só. Toque no nome e confirma o move.
- Se existe pelo menos um funcionário ativo na coluna de origem, **não conclui** sem escolha. Esse é o travamento. Ele não existe com o parâmetro desligado.
- Não digitar nome livre. Nome fora da lista não entra.
- Funcionário de outro setor não aparece.
- Funcionário oculto (`active: false`) não aparece.
- A conta logada continua no histórico como quem confirmou (`movedByName`). A pessoa escolhida entra em `employeeId` e `employeeName`.

Na tela do histórico, com os dois preenchidos, mostrar os dois: a conta e a pessoa. Exemplo: `Costura · João`. Sem pessoa, continua só o nome da conta.

O pedido guarda o id. Se a ficha for renomeada depois, o histórico novo usa o nome novo; o texto já gravado naquela linha do histórico permanece como foi salvo na hora.

Apagar (desativar) o funcionário não apaga o histórico.

---

## 7) API

`POST` de move do item e o move legado do pedido inteiro:

- Com `whoDid` desligado para a oficina: ignorar a obrigação. Se o cliente mandar `employeeId`, pode gravar; a tela não manda.
- Com `whoDid` ligado: se a coluna de origem tem funcionário ativo, `employeeId` é obrigatório, tem de ser dessa oficina, ativo, e do `sectorId` da coluna de origem. Senão, 400. Não aceitar só `employeeName` sem id.
- Sem funcionário ativo na origem: move sem pessoa, mesmo com o parâmetro ligado.

Quem pode mover não muda. Setor continua limitado às colunas da conta.

---

## 8) Fora deste corte

- Login por funcionário.
- Mais de um setor na mesma ficha. Quem trabalha em dois departamentos fica com duas fichas, ou fica para um corte depois.
- Preencher `assigneeEmployeeId` e o desempenho em Métricas a partir desses moves.
- Perguntar quem fez com o parâmetro desligado, ou recusar o move por falta de pessoa nesse estado.
- Cargo, observações e reescrita da tela de Funcionários.
- Escolher a pessoa na TV.

---

## 9) Como saber que ficou certo

Parâmetro desligado:

- Arrastar e encaminhar não mostram “Quem fez?”.
- Move sem funcionário na coluna de origem continua ok.
- Histórico mostra a conta, como hoje.

Parâmetro ligado, coluna com João e Maria ativos:

- O move não completa até escolher um dos dois.
- Histórico daquele passo mostra a conta e o nome escolhido.
- Maria, se estiver só em outro setor, não aparece na lista.
- Funcionário inativo não aparece.

Parâmetro ligado, coluna sem ninguém ativo:

- O move completa sem pergunta.
