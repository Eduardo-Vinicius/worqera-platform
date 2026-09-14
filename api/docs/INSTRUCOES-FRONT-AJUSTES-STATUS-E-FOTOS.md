# Ajustes Necessários no Frontend (Status + Fotos/PDF Presigned)

## Objetivo
Documentar exatamente o que o frontend precisa alterar para funcionar com o backend refatorado, sem quebra de fluxo.

---

## 1) Status: o que mudou

O backend agora centraliza status em um domínio único (Enum + aliases), com normalização automática.

### Impacto no front
- Continue enviando `status` como string.
- O backend normaliza valores legados para canônicos.
- Se o ambiente ativar `STRICT_STATUS_VALIDATION=true`, status fora da lista canônica será rejeitado com `400`.

### Status canônicos recomendados para o front usar
- Atendimento - Recebido
- Atendimento - Orçado
- Atendimento - Aprovado
- Lavagem - A Fazer
- Lavagem - Em Andamento
- Lavagem - Concluído
- Pintura - A Fazer
- Pintura - Em Andamento
- Pintura - Concluído
- Acabamento - A Fazer
- Acabamento - Em Andamento
- Acabamento - Concluído
- Costura - A Fazer
- Costura - Em Andamento
- Costura - Concluído
- Sapataria - A Fazer
- Sapataria - Em Andamento
- Sapataria - Concluído
- Atendimento - Finalizado
- Atendimento - Entregue

### Endpoint para colunas de status (kanban)
- `GET /status/columns` -> retorna todas as colunas
- `GET /status/columns/filtered` -> retorna colunas por role

Recomendação: parar de hardcode de colunas no front e usar o retorno desses endpoints.

---

## 2) Fotos/PDF: URLs presigned

Fotos e PDFs são retornados com links presigned (temporários).

### Impacto no front
- Não persistir URLs presigned em localStorage/DB.
- Sempre refetch ao abrir detalhes de pedido ou arquivos.
- Tratar falha de acesso (expiração) com refresh automático dos dados e nova tentativa.

### Endpoints envolvidos
- `GET /pedidos/:id` -> `fotos[]` assinadas
- `GET /pedidos` / `GET /pedidos/kanban/status` -> podem conter `fotos[]` assinadas
- `POST /upload/fotos` -> retorna `urls[]` assinadas
- `GET /pedidos/:id/pdfs` -> `pdfs[].url` assinado
- `POST /pedidos/document/pdf` -> gera PDF (agora tentando embutir fotos)
- `GET /pedidos/:id/fotos/zip` -> download ZIP de fotos

---

## 3) Checklist de implementação no front

1. **Status Kanban**
   - Buscar colunas por API (`/status/columns` ou `/status/columns/filtered`).
   - Usar labels exatamente como retornadas pela API.

2. **Atualização de status**
   - Ao mover card ou alterar status, enviar string de status no payload **e** o `funcionarioNome` digitado no modal.
   - Usar sempre o objeto completo retornado pela API (status, setorAtual, setoresHistorico, funcionarioAtual, prioridade, etc.) para reclassificar o card localmente.
   - Em caso de `400`, exibir erro de status inválido e manter card na coluna atual.

3. **Exibição de fotos**
   - Renderizar usando `pedido.fotos` da consulta atual.
   - Se imagem quebrar (403/AccessDenied), refazer `GET /pedidos/:id` e re-renderizar.

4. **Download de ZIP de fotos**
   - Chamar `GET /pedidos/:id/fotos/zip` com `responseType: 'blob'`.
   - Criar download com `URL.createObjectURL`.

5. **PDF**
   - Fluxo atual pode ser mantido.
   - Tratar geração/download com loading e erro.

6. **UX mínima recomendada**
   - Botão “Atualizar links” na tela de detalhes do pedido.
   - Indicador de expiração/recarga quando links falharem.

7. **Funcionalidade de funcionário**
   - Exibir `funcionarioAtual` no card e no detalhe do pedido.
   - Ao arrastar, exigir `funcionarioNome` (modal já existe) e enviar no payload.
   - Filtrar Kanban por funcionário usando `GET /pedidos/kanban/status?funcionario=<nome>` (consulta por atual ou histórico).
   - Para o seletor de funcionário em cada coluna, buscar via `GET /funcionarios?setorId=<setorId>&ativo=true` (novo cadastro de funcionários por setor).

---

## 7) Tela de consulta de pedidos (leve)

- Endpoint dedicado: `GET /pedidos/consulta`.
- Filtros suportados: `codigo`, `cliente`, `status`, `setor`, `funcionario`, `dataInicio`, `dataFim`, `limit`, `lastKey`.
- Resposta: `{ data: PedidoLite[], nextToken, count }` (payload leve, sem fotos).
- Padrão de paginação: use `nextToken` (base64) em `lastKey` na próxima chamada.
- Campos sugeridos para tabela: Código, Cliente, Status, Setor, Funcionário, Criado em, Prev. Entrega, Prioridade. Ação “Detalhes” chama `GET /pedidos/:id`.
- Uso sugerido para filtro rápido por funcionário: chamar `/pedidos/kanban/status?funcionario=<nome>` ou a nova `/pedidos/consulta` para listas grandes.

## 4) Tratamento de erros recomendado

- **400 status inválido**: mostrar mensagem da API e não atualizar UI otimisticamente.
- **401/403 em arquivos**: renovar dados do pedido/lista de PDFs e tentar novamente.
- **404 em fotos ZIP**: exibir “Pedido sem fotos para download”.
- **500**: toast + opção de tentar novamente.

---

## 5) Critérios de aceite (QA)

1. Kanban carrega colunas da API e não de lista fixa local.
2. Mudança de status funciona para fluxos principais sem inconsistência visual.
3. Fotos aparecem no detalhe do pedido após upload e após recarregar tela.
4. PDF baixa normalmente e fluxo permanece estável.
5. ZIP de fotos baixa corretamente com autenticação.
6. Front se recupera de link presigned expirado sem necessidade de hard refresh.

---

## 6) Observação técnica

Mesmo com normalização de status no backend, o ideal é o front já operar com os status canônicos para reduzir ambiguidades e evitar rejeições quando validação estrita estiver habilitada.
