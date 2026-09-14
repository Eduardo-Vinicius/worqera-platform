# Worqera — Requisitos de produto (API)

**Atualizado:** 2026-09-14

## Visão

Worqera permite que oficinas controlem clientes, pedidos e um **kanban excelente por setores**, com trial gratuito e assinatura via AbacatePay. Casa do Tênis é o primeiro cliente (seed), não a marca do produto.

## RF — Identidade e loja

| ID | Requisito |
|----|-----------|
| RF-AUTH-01 | Signup cria shop + user owner + subscription trial 7 dias |
| RF-AUTH-02 | Login com e-mail/senha; senhas com hash (nunca plaintext) |
| RF-AUTH-03 | Access JWT curto; refresh via cookie HttpOnly no web |
| RF-AUTH-04 | Memberships ligam user↔shop com role |
| RF-AUTH-05 | Isolamento: nenhum dado operacional sem `shopId` do contexto |
| RF-AUTH-06 | Rotas operacionais exigem subscription `trialing` ou `active` |

## RF — Setores e Kanban (carro-chefe)

| ID | Requisito |
|----|-----------|
| RF-SEC-01 | Cada shop cadastra seus setores (nome, ordem, cor, ativo) |
| RF-SEC-02 | Kanban monta colunas a partir dos setores ativos do shop |
| RF-SEC-03 | Owner/admin vê todas as colunas e move pedido para qualquer setor ativo |
| RF-SEC-04 | Pedido registra `currentSectorId` e histórico de movimentos |
| RF-SEC-05 | Membership `sector` + `sectorIds` vê apenas esses setores no kanban |
| RF-SEC-06 | Conta de setor só move a partir do seu setor conforme regra do shop (default: próximo na ordem ou qualquer destino liberado por config) |
| RF-SEC-07 | Seed CdT cria setores do fluxo legado (`legacy-brand`) |

## RF — Pedidos e clientes

| ID | Requisito |
|----|-----------|
| RF-ORD-01 | CRUD clientes por shop |
| RF-ORD-02 | CRUD pedidos por shop (código único no escopo do shop) |
| RF-ORD-03 | Upload de fotos do pedido (storage com prefixo `shopId`) |
| RF-ORD-04 | Geração de PDF do pedido |
| RF-ORD-05 | Consulta/busca de pedidos no shop |

## RF — Billing

| ID | Requisito |
|----|-----------|
| RF-BILL-01 | Trial 7 dias automático no signup |
| RF-BILL-02 | Checkout / assinatura via AbacatePay |
| RF-BILL-03 | Webhook idempotente atualiza subscription |
| RF-BILL-04 | Sem assinatura válida: portal operacional bloqueado (só auth + billing) |
| RF-BILL-05 | Um plano pago v1: `WORQERA_PRO` |

## RF — Dashboard

| ID | Requisito |
|----|-----------|
| RF-DASH-01 | Indicadores básicos por shop (contagens por setor, pedidos do dia, etc.) |
| RF-DASH-02 | Métricas admin só para roles admin/owner |

## Não-requisitos (v1)

- White-label completo white-glove
- App mobile
- Multi-loja avançada (além de header de shop)
- Marketplace / pedidos do consumidor final self-service
