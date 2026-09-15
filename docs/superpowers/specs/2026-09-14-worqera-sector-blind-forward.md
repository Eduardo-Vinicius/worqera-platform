# Encaminhamento cego por setor (blind forward)

**Atualizado:** 2026-09-14  
**Status:** implementado

## Decisão

Conta `role: sector`:

1. **Vê** só as filas dos seus `sectorIds` no kanban.
2. **Não vê** cards de outras filas.
3. No **detalhe do pedido**, pode **encaminhar** para qualquer setor ativo (lista só de nomes).
4. Cada handoff grava auditoria em `sectorHistory`: quem, de onde → para onde, quando, `action: forward|move|create`, nota se fora do plano.

Admin / owner / atendimento continuam movendo com visão completa (board + DnD).

## API

- `GET /kanban` → `{ columns, forwardTargets, role }`
- `POST /kanban/orders/:id/move` — sector: origem deve ser setor permitido; destino = qualquer ativo

## Fora de escopo

- Ver cards da fila destino
- Subdomínio / invite branding
