# Laudo PDF + export Avaliações

**Data:** 2026-09-19  
**Status:** implementado

## Laudo

- PDF profissional por par (`effectiveItems`): cliente só campos preenchidos, serviços, fotos, totais.
- Gerado no **create** (sempre, fire-and-forget) e via `POST /orders/:id/pdf`.
- Detalhe do pedido e kanban: listar/abrir laudos + gerar/baixar.

## Avaliações

- Filtro `score=1` … `5` ou `1,2,3` (críticas).
- `GET /alerts/feedback/export.csv` → CSV para Excel.
