# Worqera Kanban Flow + Labels — Design Spec (2026-09-14)

## Em uma frase

Numeração sequencial da loja, tela pós-criar com etiquetas/QR, e kanban com detalhe + caminho planejado + move livre (confirmação e histórico quando fora do fluxo).

## Relação com specs anteriores

- Ops UX: [2026-09-14-worqera-ops-ux-pass.md](./2026-09-14-worqera-ops-ux-pass.md) — multi-item, shell slim, TVs
- UI redesign: [2026-09-14-worqera-ui-redesign.md](./2026-09-14-worqera-ui-redesign.md) — tokens/kanban híbrido
- Este ciclo **não reabre** paleta, multi-item model, nem layout de TVs

## Decisões fechadas

| Tema | Decisão |
|------|--------|
| Move fora do plano | **B**: livre; destacar plano; confirmar + comentário obrigatório; registrar no histórico |
| Numeração | **A**: contador da loja desde 1, padding 4 (`0001`…); sem reset diário |
| Etiqueta QR | **C**: número grande + QR → `/p/{code}` |
| Etiquetas pares | **C**: etiqueta do pedido sempre; “Imprimir pares” sob demanda (`00042-1`…) |
| Entrega | Ondas **1**: número+sticky → etiqueta pós-criar → kanban detalhe/move |
| Copy UI | pt-BR |
| API | Inglês; `plannedSectorIds[]` novo; `code` único por shop |

## Fora de escopo

- Impressora térmica SDK / ZPL nativo (só `window.print` + CSS)  
- Conta `role: sector` regras RF-SEC (move já restringe role sector no API)  
- Reescrever códigos de pedidos antigos  
- WhatsApp / e-mail com etiqueta  
- Dark mode  

---

## 1. Numeração + sticky no cadastro

### API — `nextOrderCode`

- Substituir seq diária (`dayKey` DDMMYY) por contador **por shop**:
  - `OrderCounter`: `{ shopId, dayKey: "shop" }` **ou** schema com `scope: "shop"` único por loja
  - `$inc: { seq: 1 }`, `upsert: true`
  - Formato: `String(seq).padStart(4, "0")` → `0001`, `0002`… (se `seq > 9999`, string sem truncar)
- Pedidos existentes com códigos `140926-001` **permanecem**; só creates novos usam o formato
- Índice único `{ shopId, code }` já existente cobre colisões

### Cadastro — sticky CTA

- Em `/pedidos/novo`: barra fixa no rodapé (`sticky`/`fixed` acima do safe-area)
  - Mostra total · sinal (compacto) · botão teal **Criar pedido**
- Botão submit no fim do form permanece (mesma ação)
- Não altera blocos cliente / tênis / pagamento já entregues

---

## 2. Tela pós-criar + etiquetas

### Rota

- Após create bem-sucedido: `router.push(/pedidos/{id}/etiqueta)` (não ir direto ao kanban)
- Página: `web/app/(app)/pedidos/[id]/etiqueta/page.tsx`
- Fora do fluxo de edição; chrome mínimo; classe `print:hidden` no shell actions

### Conteúdo

| Elemento | Detalhe |
|----------|---------|
| Código | Mono gigante (`text-5xl+`) |
| Cliente | Nome |
| Pares | Contagem + lista curta de modelos |
| QR | Encode URL absoluta `{origin}/p/{code}` |
| Ações | Imprimir · Imprimir pares · Ir ao kanban · Novo pedido |

### Etiquetas dos pares

- Códigos derivados: `{orderCode}-{index1based}` (ex. `00042-1`) — **só para impressão/UI**; não cria orders separados
- Cada bloco: código do par · modelo · QR (mesmo `/p/{code}`; opcional query `?item=n` se a pública aceitar sem quebrar)
- CSS print: esconder nav/botões; uma etiqueta por bloco ou grade A4

### Persistência do plano no create

- Hoje o form manda `departamentosSelecionados` (slugs/nomes) mas o create **não persiste** caminho planejado
- Novo campo Order: `plannedSectorIds: ObjectId[]` (ref Sector)
- No create: resolver slugs/`departamento` options → IDs de setores ativos; se vazio, default `[startSector]`
- Serializer expõe `plannedSectorIds` (+ opcional `plannedSectors: [{ id, name }]`)

---

## 3. Kanban — detalhe + move B + histórico

### Detalhe

- Clique no card abre **drawer** (preferir evoluir `CardDetalhesPedido` ou drawer dedicado kanban)
- Conteúdo: código, cliente, items/pares, serviços, fotos, prioridade, dueAt
- **Caminho planejado:** chips na ordem de `plannedSectorIds`; atual = lilac; visitados (em `sectorPath`/`sectorHistory`) com check
- **Histórico:** lista de `sectorHistory` (setor, enteredAt, leftAt, note, employee)

### Move

- Continua híbrido: DnD nos chips + ←/→ + lista de setores no detalhe
- Destino **no plano**: move direto (note opcional / automática `moved`)
- Destino **fora do plano**: modal
  - Título: “Mover para {setor} (fora do fluxo)?”
  - Comentário **obrigatório**
  - API: `POST/PATCH move` com `note` (prefixo ou campo `offPath: true` + `note`)
  - Gravar em `sectorHistory` entry: `note` = comentário do usuário (ex. `"fora do fluxo: {motivo}"`)

### Visual card

- Código mono destacado; cliente; badge `N pares`; ponto/ícone se tem plano com >1 setor
- Sem board horizontal largo

### API move

- Já permite qualquer setor para owner/admin/atendimento
- Aceitar/exigir `note` quando `toSectorId` ∉ `plannedSectorIds` (se planned vazio, tratar como livre sem modal — ou planned = todos visitáveis)
- Role `sector` mantém regras atuais de restrição

---

## Ondas de entrega

### Onda A — Número + sticky

1. `nextOrderCode` shop-wide padding 4  
2. Sticky CTA em `/pedidos/novo`  
3. Smoke: criar pedido → código `0001`-like  

### Onda B — Etiqueta + plannedSectorIds

1. Schema + create resolve `plannedSectorIds`  
2. Página `/pedidos/[id]/etiqueta` + QR + print  
3. Redirect pós-create; botões kanban / novo / imprimir pares  

### Onda C — Kanban detalhe + move B

1. Drawer detalhe com plano + histórico  
2. Modal off-path + note no move  
3. Polish visual chips/card  

---

## Critérios de sucesso

1. Novo pedido recebe código sequencial da loja (`0001`…), legível no balcão  
2. Sticky “Criar pedido” visível ao rolar o form  
3. Após criar, tela de etiqueta com número + QR abrindo `/p/{code}`  
4. “Imprimir pares” gera uma etiqueta por item (`code-1`, `code-2`…)  
5. Kanban: abrir detalhe mostra caminho planejado e histórico  
6. Mover para setor fora do plano exige comentário e aparece no histórico  
7. Move dentro do plano continua com um clique/DnD sem atrito  

## Referências de implementação

- Counter: `api/src/v1/models/OrderCounter.js`, `orderService.nextOrderCode`  
- Create form: `web/app/(app)/pedidos/novo/page.tsx`  
- Kanban: `web/app/(app)/kanban/page.tsx`, `api/src/v1/services/kanbanService.js`  
- Detalhe: `web/components/CardDetalhesPedido.tsx`  
- Pública: `web/app/p/[codigo]/`  
- Move API: `web/lib/apiV1.ts` → `moveKanbanOrderV1`
