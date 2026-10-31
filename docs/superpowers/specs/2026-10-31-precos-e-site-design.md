# Preços novos e site mais direto

Data: 31/10/2026 · Meta: **R$ 10 mil de MRR**.

## 1. Decisões

| Tema | Decisão |
| --- | --- |
| Escada | **Basic R$ 147 · Pro R$ 297 · Business R$ 597** por mês |
| Anual | 10× o mensal (2 meses grátis): R$ 1.470 · R$ 2.970 · R$ 5.970 |
| Implantação | Avulsa, **R$ 497** uma vez: setores, carga do histórico do sistema antigo e treinamento |
| Business | Self-serve (IA + WhatsApp oficial), sem depender do tempo do Eduardo. Serviço humano é a implantação |
| IA | Em todos os planos, com cota que cresce: Basic 50 · Pro 300 · Business 1.500 usos/mês. No trial, 30 usos |
| Trial | 7 dias em todos os planos, inclusive o Business. WhatsApp oficial só liga depois de assinar |
| Pagamento | **Asaas** no lugar do AbacatePay (desligado hoje em produção, sem assinante). A loja escolhe Pix, boleto ou cartão na fatura do Asaas |
| Clientes atuais | Poucas lojas: todas vão para a tabela nova. Quem tem preço de fundador no Business (R$ 499) mantém até a data combinada |
| Números do site | Fixos, atualizados à mão: **700+ pedidos por mês · R$ 450 mil+ por mês em pedidos · 7.000+ pedidos e 6.000+ clientes na base** |

Os números vêm da base de produção em 31/10 (`api/scripts/site-numbers.mongo.js` e o agrupamento por mês). Outubro, 100% operado na Worqera: 761 pedidos e R$ 463 mil. Os 7.000 pedidos e 6.000 clientes incluem o histórico importado, por isso o texto diz "na base" e nunca "gerados" ou "operados". O "no prazo" (53%, com base de só 165 pedidos) e a nota (5★ com 6 avaliações) ficam fora do site.

### Conta da meta

| Mix | Ticket médio | Lojas para R$ 10 mil |
| --- | --- | --- |
| 25% Basic · 55% Pro · 20% Business | R$ 320 | ~32 |
| Só Pro | R$ 297 | 34 |

Implantação e anual entram como caixa, não como MRR.

## 2. O que cada plano entrega

| | Basic R$ 147 | Pro R$ 297 | Business R$ 597 |
| --- | --- | --- | --- |
| Frase de valor | "Um orçamento recuperado no mês já paga o plano." | "O caixa, a prateleira e o estoque na sua mão." | "O WhatsApp avisa sozinho e a IA escreve com você." |
| Kanban por setores, TVs, consulta, QR, etiqueta | ✓ | ✓ | ✓ |
| CRM de orçamentos e clientes, WhatsApp com texto pronto | ✓ | ✓ | ✓ |
| Pedidos por mês | até 150 | sem limite | sem limite |
| Financeiro, métricas, TV financeiro, estoque, marca, resumo semanal | — | ✓ | ✓ |
| IA (resumo do dia, mensagens, Raio-X, cobrança, respostas) | 50 usos | 300 usos | 1.500 usos + leitura semanal |
| WhatsApp oficial automático (1.000 avisos + 100 retomadas) | — | — | ✓ |
| Suporte | normal | normal | prioritário |

Custo estimado por loja: IA ≈ R$ 2 / R$ 15 / R$ 75; WhatsApp oficial ≈ R$ 32 no Business (os 1.000 primeiros avisos são grátis na Meta).

## 3. Mudanças técnicas

**API**
- `billingService.PRODUCTS`: preços 14700 / 29700 / 59700 (anual 147000 / 297000 / 597000) e as descrições novas. `FOUNDER_PRICE_CENTS` (49900) segue para quem já tem fundador.
- `planCap`: `BASIC_ORDER_CAP` 100 → 150. `planHas(sub, 'ai')` libera a IA em todos os planos pagos e no trial; `'whatsapp'` continua só no Business e fora do trial.
- Cota de IA por plano: `aiService.monthlyCap(planCode, status)` → trial 30, Basic 50, Pro 300, Business 1.500 (envs `WORQERA_AI_CAP_TRIAL|BASIC|PRO|BUSINESS`; a cota extra do admin continua valendo). A leitura semanal da IA segue só no Business.

**Asaas** (`services/asaas.js` para as chamadas HTTP, `billingService` para as regras)
- Ambiente por variável: `WORQERA_Asaas__Env=sandbox|production` → `https://api-sandbox.asaas.com/v3` ou `https://api.asaas.com/v3`. Chave em `WORQERA_Asaas__ApiKey` (header `access_token`). Sem chave, o checkout cai no fluxo manual de hoje ("Fale com a Worqera").
- **Checkout** (`POST /billing/checkout-sessions` com `planCode`, `cycle: monthly|yearly` e `cpfCnpj`):
  1. Valida o CPF/CNPJ (dígitos verificadores) e guarda em `Shop.billing.cpfCnpj`.
  2. Cria ou reaproveita o cliente no Asaas (`POST /customers` com nome da loja, CPF/CNPJ, e-mail do dono, `externalReference = shopId`) e guarda `providerCustomerId`.
  3. Cria a assinatura (`POST /subscriptions`): `billingType UNDEFINED`, `value` do plano, `cycle MONTHLY|YEARLY`, `externalReference = shopId`, `description "Worqera Pro"`, `callback.successUrl` de volta ao `/billing`. **Primeiro vencimento:** o fim do trial, se ainda estiver em trial; senão, hoje.
  4. Busca a primeira cobrança (`GET /subscriptions/{id}/payments`) e devolve o `invoiceUrl` para o site/app abrir.
  5. Se a loja já tem assinatura no Asaas e troca de plano ou de ciclo, atualiza a existente (`POST /subscriptions/{id}` com `updatePendingPayments: true`) em vez de criar outra.
- **Webhook** `POST /api/v1/webhooks/asaas`:
  - Só aceita com o header `asaas-access-token` igual a `WORQERA_Asaas__WebhookToken` (comparação em tempo constante). Em produção, sem token configurado, recusa tudo.
  - Idempotente pelo `id` do evento (`WebhookEvent`, provider `Asaas`); responde 200 rápido e não quebra com campos novos.
  - Acha a loja pelo `providerSubscriptionId` (ou `externalReference`) e aplica:
    - `PAYMENT_CONFIRMED` / `PAYMENT_RECEIVED` → `active`, plano e ciclo da assinatura, `currentPeriodEnd` = próximo vencimento (+1 mês ou +1 ano), e-mail "assinatura ativa" com o nome certo do plano.
    - `PAYMENT_OVERDUE` → `past_due`.
    - `PAYMENT_REFUNDED`, `PAYMENT_CHARGEBACK_REQUESTED` → `past_due`.
    - `SUBSCRIPTION_DELETED`, `SUBSCRIPTION_INACTIVATED` → `canceled`.
- **Cancelar:** `POST /billing/cancel` (dono) → `DELETE /subscriptions/{id}`; a loja usa até o fim do período pago.
- `Subscription`: `provider` aceita `Asaas`; novos `cycle` (`monthly|yearly`) e `lastInvoiceUrl` (para "pagar fatura em aberto" no `/billing`).
- Sai: o código do AbacatePay (checkout, HMAC, chave pública embutida, rota `/webhooks/abacatepay` e variáveis). Os registros antigos com `provider: 'AbacatePay'` continuam válidos.
- Testes: webhook (token errado, evento repetido, cada evento muda o status certo), cálculo do primeiro vencimento, validação de CPF/CNPJ, e as chamadas ao Asaas com `fetch` simulado.
- Testes: `planCap.test.js` e o de cota de IA ajustados aos valores novos.

**Site (app web)**
- `/billing`, `/signup` e os textos de plano usam os preços e frases novos; o aviso de limite fala em 150 pedidos.
- `/billing`: escolha do plano e de Mensal/Anual, campo CPF/CNPJ (com máscara), botão "Assinar" que abre a fatura do Asaas, "Pagar fatura em aberto" quando houver, e "Cancelar assinatura".
- Avisos de IA (`AiQuotaNotice`) passam a falar "limite do seu plano" e sugerem o próximo plano, em vez de "faz parte do Business".

**App**
- Cadastro (`account_screens.dart`) e telas de plano com os preços novos; os avisos de IA e de "só no Business" ficam como no site.
- Tela de plano: mesmo fluxo do `/billing` (plano, Mensal/Anual, CPF/CNPJ), abrindo a fatura do Asaas no navegador.

**Landing (home)**, de 12 para 6 seções:
1. **Hero:** título direto ("Pedido organizado, cliente avisado e orçamento que volta."), "Testar 7 dias grátis" e, logo abaixo, os três números. Os ramos viram uma linha de etiquetas (sapataria · lavanderia · assistência · oficina · gráfica · marcenaria), cada uma levando à página do ramo. Abaixo dos números: "Trazemos seu histórico: você não começa do zero."
2. **Três pontos principais:** Fila por setor · Cliente avisado sozinho · Dinheiro que volta (orçamento, cobrança, prateleira). Link "Ver todos os recursos".
3. **Quem usa:** depoimentos, mais compactos.
4. **Preços:** os 3 planos com a frase de valor, chave Mensal/Anual, Pro como "Recomendado" e a implantação como item à parte. Todos com "Testar 7 dias" (o Business também passa a ter trial, sem WhatsApp oficial até assinar).
5. **FAQ**, mais curto, com "Atende o meu ramo?".
6. **Chamada final + rodapé.**

Saem da home: News, Why, Loop, DayReel, Practice e Ramos. As páginas de ramo (`/[slug]`) e `/recursos` continuam. Os componentes que ficarem sem uso são apagados. PT e EN no `i18n.ts`.

**Documentos**
- `docs/superpowers/plans/2026-09-17-worqera-pricing-and-change-script.md` reescrito com a tabela nova, scripts de venda e a conta da meta.
- Change-logs (api, web, mobile).

## 4. Fora deste trabalho
- Contador ao vivo no site.
- Cobrança da implantação dentro do sistema (fecha por Pix, ou como cobrança avulsa criada no painel do Asaas).
- Nota fiscal automática pelo Asaas (dá para ligar depois no painel).

## 5. Passos manuais do Eduardo
1. Abrir a conta Asaas (CNPJ da Axisbyte) e, primeiro, uma conta **Sandbox** para testar.
2. Gerar a chave de API (Integrações → Chaves de API) e colocar em `WORQERA_Asaas__ApiKey`, com `WORQERA_Asaas__Env=sandbox`.
3. Criar o webhook (Integrações → Webhooks): URL `https://<PUBLIC_API_URL>/api/v1/webhooks/asaas`, um token de 32+ caracteres (`openssl rand -hex 32`) em `WORQERA_Asaas__WebhookToken`, e os eventos de cobrança (`PAYMENT_*`) e de assinatura (`SUBSCRIPTION_*`).
4. Testar no Sandbox: assinar, pagar a fatura de teste, ver a loja ficar ativa.
5. Repetir chave e webhook na conta de **produção** e trocar para `WORQERA_Asaas__Env=production`.
6. Avisar as lojas atuais da tabela nova, com a data em que ela passa a valer.
