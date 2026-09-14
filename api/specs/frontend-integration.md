# Worqera API — Frontend integration (ondas)

**Atualizado:** 2026-09-14

Contrato HTTP: [backend.endpoints.md](./backend.endpoints.md).  
UI: [`../../web/specs/`](../../web/specs/).

## Ondas

| Onda | Quando | Front faz |
|------|--------|-----------|
| W0 | Agora | Continua LEGADO; specs alinhadas |
| W1 | Pós A1 | Signup/login novos; cookie refresh; gate trial UI |
| W2 | Pós A2 | Kanban consome `GET /kanban` + move; CRUD setores (admin) |
| W3 | Pós A5 | Billing AbacatePay + tela bloqueio pós-trial |
| W4 | Pós A3 | UX conta de setor (board filtrado) |
| W5 | Pós A4 | Clients/orders/PDF no `/api/v1`; desligar paths LEGADO |

## Smoke (alvo)

1. Signup → entra no portal em trial  
2. Admin cria setores → kanban mostra colunas  
3. Cria pedido → aparece na 1ª coluna → admin move para qualquer  
4. (A3) User setor só vê sua coluna  
5. Expira trial (dev) → bloqueio → checkout AbacatePay (ou dev complete) → volta  
