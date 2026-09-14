# Resumo: Funcionários + Consulta de Pedidos

## O que mudou no backend
- Nova tabela DynamoDB: `ShoeRepairFuncionarios` (env: `DYNAMODB_FUNCIONARIO_TABLE`), com GSI `setorId-index` para listar por setor e ativo.
- Novos endpoints (autenticados):
  - `POST /funcionarios` — criar (campos: nome*, setorId*, email?, telefone?, cargo?, observacoes?, ativo?).
  - `GET /funcionarios` — lista, filtros: `setorId`, `ativo`, `limit`.
  - `GET /funcionarios/:id` — detalhe.
  - `PATCH /funcionarios/:id` — atualizar campos.
  - `DELETE /funcionarios/:id` — desativação lógica (`ativo=false`).
- Kanban/status já aceita `funcionarioNome` e retorna `funcionarioAtual`/histórico; mover dentro do mesmo setor continua funcionando.
- Nova rota leve de consulta: `GET /pedidos/consulta` com filtros (`codigo`, `cliente`, `status`, `setor`, `funcionario`, `dataInicio`, `dataFim`, `limit`, `lastKey`) e paginação via `nextToken`.

## O que o front precisa fazer
- **Cadastro de Funcionários**: tela CRUD usando os endpoints acima; associar funcionário a `setorId` (usar lista de setores existente) e permitir ativar/desativar.
- **Modal de movimentação no Kanban**: ao abrir, buscar funcionários do setor da coluna via `GET /funcionarios?setorId=<setorId>&ativo=true`; selecionar um e enviar como `funcionarioNome` no payload de drag/status.
- **Exibição**: mostrar `funcionarioAtual` no card e no detalhe do pedido.
- **Filtros**: permitir filtrar Kanban por funcionário com `?funcionario=...`; para listas grandes, usar a tela de consulta com `/pedidos/consulta`.
- **Tela de consulta de pedidos**: tabela leve com filtros (código, cliente, status, setor, funcionário, data início/fim), paginação usando `nextToken`, ação “Detalhes” chamando `GET /pedidos/:id`.

## Referências de arquivos alterados
- Infra: `template.yaml`
- Rotas: `handler.js`, `src/routes/funcionarioRoutes.js`, `src/routes/pedidoRoutes.js`
- Controllers: `src/controllers/funcionarioController.js`, `src/controllers/pedidoController.js`
- Serviços: `src/services/funcionarioService.js`, `src/services/pedidoService.js`
- Doc front: `docs/INSTRUCOES-FRONT-AJUSTES-STATUS-E-FOTOS.md`
