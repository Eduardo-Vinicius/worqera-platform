# Design: Subitens no kanban (mesmo pedido)

**Data:** 2026-09-22  
**Status:** em implementação  
**Decisões:** ready só quando **todos** os itens no terminal (1A); entrega só do **pedido inteiro** (2A).

## Modelo

- Um `Order` / um `code` / um laudo / uma entrega
- Cada `items[]` tem `currentSectorId`, `plannedSectorIds`, `sectorHistory`
- `Order.currentSectorId` = rollup (primeiro item não-terminal pela ordem dos setores; senão terminal)
- Kanban: **1 card por item** (`orderId` + `itemId`, label `code-N`)

## Etiqueta

- Pares: N QRs com `?item=N`
- Layout: código → **modelo destacado** → QR → pedido/cliente
- URL estável p/ app futuro interceptar o mesmo QR

## Notify

- Create: e-mail pedido (como hoje)
- Move item: sem spam por coluna; e-mail “pronto” só quando o pedido vira `ready`
