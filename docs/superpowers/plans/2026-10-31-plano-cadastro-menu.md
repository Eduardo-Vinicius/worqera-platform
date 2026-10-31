# Plano, cadastro, desconto e menu — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar o e-mail de assinatura, a tela de Plano, o cadastro, o desconto do pedido e o menu lateral com acabamento profissional.

**Architecture:** E-mails da Worqera para o dono ganham um modo `platform` no `mailer` e modelos em `services/platformEmails.js`. A tela de Plano consome um endpoint novo de pagamentos. O menu ganha grupos (`matches`) e abas (`SectionTabs`) sem mudar rotas.

**Tech Stack:** Node/Express (`node --test`), Next.js 15, Flutter.

**Spec:** `docs/superpowers/specs/2026-10-31-plano-cadastro-menu-design.md`

## Global Constraints
- Anual = 10× o mensal, exibido como **−17%** e como valor por mês (`anual/12`).
- O pedido guarda o desconto em R$ (`pricing.discount`); % é só forma de digitar.
- Rotas não mudam (links antigos seguem valendo).
- Textos em português, curtos. Sem commits.
- Verificação: `cd api && npm test`; `cd web && npx tsc --noEmit -p . --incremental false`; `flutter analyze --no-fatal-infos lib`.

---

### Task 1: E-mail de assinatura com a marca da Worqera
**Files:** Create `api/src/v1/services/platformEmails.js`; Modify `api/src/v1/services/mailer.js` (modo `platform`), `api/src/v1/services/billingService.js` (`notifyBillingActivated` + `handleAsaasWebhook` passa o pagamento); Test `api/src/v1/__tests__/billing.test.js`.
**Interfaces:** `subscriptionActiveEmail({ ownerName, shopName, planName, cycle, amountBrl, paidUntil, method, billingUrl }) -> { subject, html, text }`; `sendMail({ ..., platform: true })` não usa nome/cores da loja; `notifyBillingActivated(shopId, sub, payment?)`.
- [ ] Teste: o modelo traz "Assinatura Worqera Pro ativa" no assunto, o valor `R$ 297,00`, "Pix", a data e o link `/billing`; sem `[loja]` e escapa HTML no nome da loja.
- [ ] Implementar `platformEmails.js` (layout próprio: cabeçalho roxo Worqera, cartão, tabela de detalhes, botão, rodapé) e `mailer` com `platform` (from "Worqera", assunto cru, html já pronto sem `wrapCompanyHtml`).
- [ ] `notifyBillingActivated` monta o e-mail com plano, ciclo, valor (`payment.value` ou preço do plano), forma (`payment.billingType` → Pix/Boleto/Cartão/Dinheiro) e `currentPeriodEnd`.
- [ ] `npm test` passa.

### Task 2: Últimos pagamentos (API)
**Files:** Modify `billingService.js` (`listPayments`, `paymentView`), `billingController.js`, `billingRoutes.js`; Test `billing.test.js`.
**Interfaces:** `paymentView(p) -> { id, dueDate, paidAt, value, status, statusLabel, method, invoiceUrl, receiptUrl }`; `GET /billing/payments` (dono/admin) → `{ payments: [] }`.
- [ ] Teste de `paymentView` (RECEIVED → "Pago", PENDING → "Em aberto", OVERDUE → "Vencido", REFUNDED → "Estornado", PIX → "Pix").
- [ ] Implementar e ligar a rota; sem assinatura Asaas → `[]`; erro do Asaas → `[]` com log.

### Task 3: Tela de Plano (site e app)
**Files:** Modify `web/lib/plans.ts` (`yearlyMonthly`, `YEARLY_OFF = 17`), `web/lib/apiV1.ts` (`listBillingPaymentsV1`), `web/app/(app)/billing/page.tsx`; `mobile/lib/features/ops/ops_screens.dart` (`BillingScreen`).
- [ ] Anual: preço por mês + "−17%" + "R$ X por ano"; botão com o total do ano.
- [ ] Seção "Últimos pagamentos" (data, valor, forma, status colorido, links "Fatura"/"Comprovante").
- [ ] Intenção de checkout (`wq-checkout-intent`): pré-seleciona plano e ciclo, mostra "Falta só o pagamento" e foca o CPF/CNPJ.
- [ ] tsc e flutter analyze.

### Task 4: Cadastro com "Testar" ou "Assinar agora" + faixa do teste
**Files:** Modify `web/app/signup/page.tsx`, `web/app/verify-email/page.tsx` (redireciona com a intenção), `web/components/shell/TrialBanner.tsx`; `mobile/lib/features/auth/account_screens.dart`.
- [ ] Escolha "Como quer começar?" (Testar 7 dias grátis / Assinar agora) e o texto do botão.
- [ ] Assinar agora → grava `wq-checkout-intent` e, após entrar, vai para `/billing`.
- [ ] `TrialBanner`: "Teste do {plano} · N dias restantes" + botão "Assinar"; com assinatura Asaas em teste: "Assinatura feita · 1ª cobrança em DD/MM".

### Task 5: Desconto do pedido em % ou R$
**Files:** Modify `web/components/orders/OrderForm.tsx:~2236`, `mobile/lib/features/orders/order_form_screen.dart:~136,485`.
- [ ] Chave %/R$ (padrão %), conversão sobre o subtotal, resumo "Desconto 10% (− R$ 15,00)"; ao editar pedido salvo, % calculado do R$.
- [ ] tsc e flutter analyze.

### Task 6: Menu lateral agrupado (site e app)
**Files:** Modify `web/components/shell/nav.ts`, `web/components/shell/AppSidebar.tsx` (filtro e `matches`); Create `web/components/shell/SectionTabs.tsx`; add `<SectionTabs group="…" />` nas páginas de Catálogo (`/admin/produtos`, `/settings/servicos`, `/settings/setores`, `/settings/marcas`, `/settings/acessorios`), Equipe (`/settings/equipe`, `/funcionarios`) e Relatórios (`/admin/metrics`, `/admin/atendimento`); título "Desempenho da equipe". App: `app_shell.dart`, `more_screen.dart` + `HubScreen`.
- [ ] Menu com as 4 seções; item do grupo ativo em qualquer rota do grupo; abas filtradas por papel.
- [ ] App com as mesmas seções e telas de grupo.
- [ ] tsc, flutter analyze, change-logs (api, web, mobile).
