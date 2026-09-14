# Instruções para Integração Frontend: URLs Presigned, PDF com Fotos e ZIP

## Objetivo
Implementar no frontend a integração completa com as mudanças recentes da API de pedidos, com foco em:
- URLs presigned para fotos e PDFs
- Geração de PDF com fotos embutidas
- Download de fotos em arquivo ZIP

---

## Contexto Importante
- Fotos e PDFs agora são retornados com URL presigned (expiram).
- Não persistir URL presigned em armazenamento durável (localStorage, banco etc).
- Sempre recarregar dados do backend antes de abrir imagens/PDF, quando necessário.

---

## Endpoints Relevantes

### Pedidos
- GET /pedidos/:id
  - Retorna pedido com campo fotos já assinado.

- GET /pedidos
- GET /pedidos/kanban/status
  - Listagens podem vir com fotos assinadas.

### Upload
- POST /upload/fotos
  - FormData com pedidoId e fotos[]
  - Retorna urls já presigned para exibição imediata.

### PDF
- POST /pedidos/document/pdf
  - Gera PDF do pedido (agora com fotos embutidas quando existirem e forem válidas).
  - Resposta é o binário do PDF para download.

- GET /pedidos/:id/pdfs
  - Lista PDFs com url presigned.

### Fotos em ZIP
- GET /pedidos/:id/fotos/zip
  - Novo endpoint para baixar todas as fotos do pedido em um .zip.

---

## Regras de Implementação no Front
1. Sempre enviar Authorization: Bearer <token>.
2. Não armazenar URLs presigned por longo prazo.
3. Tratar expiração de link:
   - Se imagem/PDF falhar por acesso/expiração, refazer fetch do recurso (pedido ou lista de PDFs) e tentar novamente.
4. Para download de ZIP/PDF:
   - Usar responseType blob
   - Criar URL com URL.createObjectURL
   - Disparar download via link temporário
5. Evitar cache agressivo para recursos assinados.

---

## Mudanças Esperadas na Tela de Pedido
1. Galeria de fotos usando pedido.fotos.
2. Botão Atualizar links:
   - Refetch de GET /pedidos/:id.
3. Botão Baixar fotos (.zip):
   - Chama GET /pedidos/:id/fotos/zip.
4. Botão Gerar/Baixar PDF:
   - Mantém fluxo atual com POST /pedidos/document/pdf.
5. Estados visuais:
   - loading, sucesso e erro para upload, geração de PDF e download ZIP.

---

## Estrutura Recomendada
- Criar camada de serviço para pedidos/assets:
  - getPedido(id)
  - listPedidoPdfs(id)
  - uploadFotos(pedidoId, files)
  - generatePedidoPdf(pedidoId)
  - downloadPedidoFotosZip(pedidoId)

- Opcional recomendado:
  - Hook usePedidoAssets(pedidoId) para centralizar refresh de fotos e PDFs.

---

## Critérios de Aceite
1. Usuário consegue abrir fotos do pedido sem erro de acesso.
2. Se link expirar, frontend se recupera automaticamente com refetch.
3. Usuário consegue baixar PDF atualizado normalmente.
4. Usuário consegue baixar ZIP com as fotos do pedido.
5. Não há persistência indevida de URLs presigned.
6. Fluxo mantém o design atual sem mudanças visuais desnecessárias.

---

## Observações de UX/Negócio
- PDF com fotos melhora muito a experiência para envio ao cliente e documentação.
- ZIP de fotos cobre cenário operacional/técnico (originais separadas).
- Modelo híbrido recomendado:
  - PDF com fotos como padrão
  - ZIP opcional para necessidade específica

---

## Entrega esperada do Front
Ao final, retornar um resumo com:
- Arquivos alterados
- Serviços/hooks criados
- Fluxos de erro tratados
- Evidências rápidas de teste manual (ex.: upload, abrir foto, gerar PDF, baixar ZIP)
