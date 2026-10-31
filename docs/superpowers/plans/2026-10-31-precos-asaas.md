# Preços novos + Asaas — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar a tabela para Basic 147 / Pro 297 / Business 597 (anual 10×), dar IA a todos os planos com cota por plano, e cobrar pelo Asaas (Pix, boleto ou cartão na fatura), removendo o AbacatePay.

**Architecture:** `lib/planCap.js` concentra o que cada plano libera; `services/asaas.js` é só o cliente HTTP do Asaas; `services/billingService.js` tem as regras (checkout, cancelamento, webhook) e expõe funções puras testáveis (`firstDueDate`, `priceCents`, `webhookUpdate`). Site e app só mudam o `/billing`, o cadastro e os textos de IA.

**Tech Stack:** Node 22 + Express + Mongoose (API, testes com `node --test`), Next.js 15 (site), Flutter (app).

**Spec:** `docs/superpowers/specs/2026-10-31-precos-e-site-design.md`. A landing nova é o plano 2; aqui a landing só recebe os preços novos.

## Global Constraints

- Preços (centavos): Basic 14700, Pro 29700, Business 59700; anual 147000, 297000, 597000. Fundador Business segue 49900 até `founder.until`.
- Basic: até **150** pedidos por mês.
- Cota de IA por mês: trial 30, Basic 50, Pro 300, Business 1.500. Envs `WORQERA_AI_CAP_TRIAL|BASIC|PRO|BUSINESS` sobrescrevem; `WORQERA_AI_MONTHLY_CAP` continua valendo só para o Business (legado). A cota extra do admin (`Shop.aiQuota`) continua.
- WhatsApp oficial e leitura semanal da IA: só Business (o WhatsApp oficial também fora do trial).
- Asaas: `WORQERA_Asaas__ApiKey`, `WORQERA_Asaas__Env=sandbox|production`, `WORQERA_Asaas__WebhookToken` (32+ caracteres). Header de API `access_token`; header do webhook `asaas-access-token`. Base `https://api-sandbox.asaas.com/v3` ou `https://api.asaas.com/v3`.
- Assinatura no Asaas: `billingType: 'UNDEFINED'`, `cycle: 'MONTHLY' | 'YEARLY'`, `externalReference = shopId`.
- Tolerância de pagamento: **5 dias** depois do vencimento antes de bloquear (fatura atrasada ou trial que já assinou e ainda não pagou). Cancelada continua usando até o fim do período pago.
- Textos para o usuário em português, curtos. Sem commits: o Eduardo commita.
- Verificação: `cd api && npm test`; `cd web && npx tsc --noEmit -p . --incremental false`; `flutter analyze --no-fatal-infos lib` (binário em `/Users/eduardo/Documents/Repo/procedy-platform/.tools/flutter/bin/flutter`).

---

### Task 1: O que cada plano libera (planCap + cota de IA)

**Files:**
- Modify: `api/src/v1/lib/planCap.js`
- Modify: `api/src/v1/services/aiService.js:35-39,65-85`
- Modify: `api/src/v1/controllers/aiController.js:41-47` (leitura semanal)
- Modify: `api/src/v1/__tests__/planCap.test.js`, `api/src/v1/__tests__/aiWhatsapp.test.js:9-26`

**Interfaces:**
- Produces: `planTier(code) -> 'basic'|'pro'|'business'|null`; `planHas(sub, 'ai'|'whatsapp'|'weekly') -> boolean`; `BASIC_ORDER_CAP = 150`; `aiService.monthlyCap(planCode?, status?) -> number`; `quotaFor(shopId)` passa a ler o plano da `Subscription`.

- [ ] **Step 1: Testes que falham** — em `planCap.test.js`, trocar `assert.equal(BASIC_ORDER_CAP, 100)` por `150` e acrescentar:

```js
test('every paid plan has AI; WhatsApp and the weekly reading stay in Business', () => {
  const { planHas, planTier } = require('../lib/planCap');
  assert.equal(planTier('WORQERA_BASIC'), 'basic');
  assert.equal(planTier('worqera_premium'), 'business');
  assert.equal(planTier('WORQERA_EARLY'), 'pro');
  assert.equal(planTier('nope'), null);
  assert.equal(planHas({ planCode: 'WORQERA_BASIC', status: 'active' }, 'ai'), true);
  assert.equal(planHas({ planCode: 'WORQERA_PRO', status: 'trialing' }, 'ai'), true);
  assert.equal(planHas({ planCode: 'WORQERA_PRO', status: 'active' }, 'whatsapp'), false);
  assert.equal(planHas({ planCode: 'WORQERA_BUSINESS', status: 'trialing' }, 'whatsapp'), false);
  assert.equal(planHas({ planCode: 'WORQERA_BUSINESS', status: 'active' }, 'whatsapp'), true);
  assert.equal(planHas({ planCode: 'WORQERA_PRO', status: 'active' }, 'weekly'), false);
  assert.equal(planHas({ planCode: 'WORQERA_BUSINESS', status: 'trialing' }, 'weekly'), true);
});
```

Em `aiWhatsapp.test.js`, trocar o primeiro teste pelo de cima (as linhas de `planHas` para Pro/Basic mudam de `false` para `true` em `'ai'`) e o `monthlyCap()` por:

```js
  assert.equal(monthlyCap(), 1500);
  assert.equal(monthlyCap('WORQERA_BASIC', 'active'), 50);
  assert.equal(monthlyCap('WORQERA_PRO', 'active'), 300);
  assert.equal(monthlyCap('WORQERA_BUSINESS', 'trialing'), 30);
```

- [ ] **Step 2: Rodar e ver falhar** — `cd api && npm test` → falha em `BASIC_ORDER_CAP`, `planTier is not a function`, `monthlyCap` 1000.

- [ ] **Step 3: Implementar `planCap.js`**

```js
const BASIC_ORDER_CAP = 150;

const TIER = {
  WORQERA_BASIC: 'basic',
  WORQERA_PRO: 'pro',
  WORQERA_EARLY: 'pro',
  WORQERA_BUSINESS: 'business',
  WORQERA_PREMIUM: 'business',
};

function planTier(code) {
  return TIER[String(code || '').trim().toUpperCase()] || null;
}
function isBasicPlan(code) {
  return planTier(code) === 'basic';
}
function isBusinessPlan(code) {
  return planTier(code) === 'business';
}

/**
 * `ai`: every paid plan and the trial (the quota is what changes).
 * `whatsapp`: Business, not during the trial. `weekly`: Business.
 * The Worqera admin visiting a shop and non-production runs see everything.
 */
function planHas(subscription, feature) {
  const sub = subscription && typeof subscription === 'object' ? subscription : { planCode: subscription };
  if (sub.platformVisit || sub.devBypass) return ['ai', 'whatsapp', 'weekly'].includes(feature);
  if (feature === 'ai') return Boolean(planTier(sub.planCode));
  if (feature === 'weekly') return isBusinessPlan(sub.planCode);
  if (feature === 'whatsapp') return isBusinessPlan(sub.planCode) && sub.status !== 'trialing';
  return false;
}
```

`isBasicPlan('WORQERA_EARLY')` continua `false` (pioneiro é Pro). Exportar `planTier` junto com o resto.

- [ ] **Step 4: Cota por plano em `aiService.js`**

```js
const CAP_DEFAULTS = { trial: 30, basic: 50, pro: 300, business: 1500 };

/** AI uses per month for the plan; the trial has its own small quota. */
function monthlyCap(planCode, status) {
  const key = status === 'trialing' ? 'trial' : planTier(planCode) || 'business';
  const fromEnv = Number(process.env[`WORQERA_AI_CAP_${key.toUpperCase()}`]);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  if (key === 'business') {
    const legacy = Number(process.env.WORQERA_AI_MONTHLY_CAP);
    if (Number.isFinite(legacy) && legacy > 0) return legacy;
  }
  return CAP_DEFAULTS[key];
}
```

Em `quotaFor`, antes de calcular `base`:

```js
  const Subscription = require('../models/Subscription');
  const sub = await Subscription.findOne({ shopId }).select('planCode status').lean();
  const base = Number(q.monthlyCap) > 0 ? Number(q.monthlyCap) : monthlyCap(sub?.planCode, sub?.status);
```

Importar `planTier` de `../lib/planCap` no topo.

- [ ] **Step 5: Leitura semanal só no Business** — em `aiController.insights`, trocar `if (!aiAllowed(req))` por `if (!planHas(req.subscription, 'weekly'))` (importar `planHas` de `../lib/planCap`). O comentário de `quotaOf` passa a dizer "null sem plano".

- [ ] **Step 6: Rodar** — `cd api && npm test` → tudo passa.

---

### Task 2: Catálogo, CPF/CNPJ e campos novos

**Files:**
- Create: `api/src/v1/lib/cpfCnpj.js`
- Create: `api/src/v1/__tests__/billing.test.js`
- Modify: `api/src/v1/services/billingService.js:5-45` (PRODUCTS)
- Modify: `api/src/v1/models/Subscription.js`, `api/src/v1/models/Shop.js` (campo `billing`)
- Modify: `api/src/v1/services/authService.js:70-74` (cadastro aceita Business)

**Interfaces:**
- Produces: `normalizeCpfCnpj(value) -> string|null` (só dígitos, válido); `priceCents(planCode, cycle) -> number|null`; `Subscription.cycle ('monthly'|'yearly')`, `Subscription.lastInvoiceUrl`, `provider` aceita `'Asaas'`; `Shop.billing.cpfCnpj`.

- [ ] **Step 1: Teste que falha** — `billing.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeCpfCnpj } = require('../lib/cpfCnpj');

test('CPF and CNPJ are checked by their digits', () => {
  assert.equal(normalizeCpfCnpj('529.982.247-25'), '52998224725');
  assert.equal(normalizeCpfCnpj('11.222.333/0001-81'), '11222333000181');
  assert.equal(normalizeCpfCnpj('529.982.247-24'), null);
  assert.equal(normalizeCpfCnpj('111.111.111-11'), null);
  assert.equal(normalizeCpfCnpj('11.222.333/0001-80'), null);
  assert.equal(normalizeCpfCnpj(''), null);
});

test('catalog prices: monthly and yearly (10x)', () => {
  const { priceCents } = require('../services/billingService');
  assert.equal(priceCents('WORQERA_BASIC', 'monthly'), 14700);
  assert.equal(priceCents('WORQERA_PRO', 'yearly'), 297000);
  assert.equal(priceCents('WORQERA_PREMIUM', 'monthly'), 59700);
  assert.equal(priceCents('WORQERA_X', 'monthly'), null);
});
```

- [ ] **Step 2: Rodar e ver falhar** — `npm test` → `Cannot find module '../lib/cpfCnpj'`.

- [ ] **Step 3: `lib/cpfCnpj.js`**

```js
function digits(value) {
  return String(value || '').replace(/\D/g, '');
}

function cpfOk(d) {
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const check = (len) => {
    let sum = 0;
    for (let i = 0; i < len; i += 1) sum += Number(d[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return check(9) === Number(d[9]) && check(10) === Number(d[10]);
}

function cnpjOk(d) {
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const check = (len) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < len; i += 1) sum += Number(d[i]) * weights[i];
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return check(12) === Number(d[12]) && check(13) === Number(d[13]);
}

/** Digits of a valid CPF or CNPJ, or null. */
function normalizeCpfCnpj(value) {
  const d = digits(value);
  if (cpfOk(d) || cnpjOk(d)) return d;
  return null;
}

module.exports = { normalizeCpfCnpj };
```

- [ ] **Step 4: PRODUCTS e `priceCents`** — em `billingService.js`, substituir o array:

```js
const PRODUCTS = [
  {
    code: 'WORQERA_BASIC',
    name: 'Worqera Basic',
    description: 'A fila no ar: kanban, consulta do cliente, CRM de orçamentos e IA no resumo do dia. Até 150 pedidos por mês',
    priceCents: 14700,
    yearlyPriceCents: 147000,
    currency: 'BRL',
    interval: 'month',
  },
  {
    code: 'WORQERA_PRO',
    name: 'Worqera Pro',
    description: 'Sem limite de pedidos: financeiro, métricas, estoque, marca e IA com 300 usos por mês',
    priceCents: 29700,
    yearlyPriceCents: 297000,
    currency: 'BRL',
    interval: 'month',
  },
  {
    code: 'WORQERA_BUSINESS',
    name: 'Worqera Business',
    description: 'Tudo do Pro, WhatsApp oficial avisando sozinho, IA com 1.500 usos e leitura semanal, suporte prioritário',
    priceCents: 59700,
    yearlyPriceCents: 597000,
    currency: 'BRL',
    interval: 'month',
  },
];

function priceCents(planCode, cycle = 'monthly') {
  const plan = PRODUCTS.find((p) => p.code === normalizePlanCode(planCode));
  if (!plan) return null;
  return cycle === 'yearly' ? plan.yearlyPriceCents : plan.priceCents;
}
```

Exportar `priceCents`. O comentário do `founder` no model passa a dizer "R$ 499 por 12 meses para quem já era cliente".

- [ ] **Step 5: Campos novos**
  - `Subscription.js`: `provider: { type: String, enum: ['Asaas', 'AbacatePay', 'Manual', 'Dev'], default: 'Manual' }`, `cycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' }`, `lastInvoiceUrl: { type: String, default: null }`.
  - `Shop.js`, ao lado de `aiQuota`: `billing: { cpfCnpj: { type: String, default: null } }`.
  - `authService.signupPlanCode`: aceitar Business.

```js
function signupPlanCode(planCode) {
  const code = String(planCode || '').trim().toUpperCase().replace(/^WORQERA_/, '');
  if (code === 'BASIC') return 'WORQERA_BASIC';
  if (code === 'BUSINESS') return 'WORQERA_BUSINESS';
  return 'WORQERA_PRO';
}
```

- [ ] **Step 6: Rodar** — `npm test` → passa.

---

### Task 3: Cliente HTTP do Asaas

**Files:**
- Create: `api/src/v1/services/asaas.js`
- Modify: `api/src/v1/__tests__/billing.test.js`

**Interfaces:**
- Produces (todas `async`, devolvem o JSON do Asaas e lançam `err.code = 'BILLING_PROVIDER_ERROR'`): `configured() -> boolean`, `createCustomer(body)`, `createSubscription(body)`, `updateSubscription(id, body)`, `deleteSubscription(id)`, `listSubscriptionPayments(id, status?) -> { data: Payment[] }`. Todas aceitam `opts.fetchImpl` para teste.

- [ ] **Step 1: Teste que falha**

```js
test('Asaas client sends access_token to the right environment and surfaces errors', async () => {
  process.env.WORQERA_Asaas__ApiKey = 'key_test';
  process.env.WORQERA_Asaas__Env = 'sandbox';
  const asaas = require('../services/asaas');
  const calls = [];
  const ok = async (url, init) => {
    calls.push({ url, init });
    return { ok: true, status: 200, json: async () => ({ id: 'cus_1' }) };
  };
  const res = await asaas.createCustomer({ name: 'Loja', cpfCnpj: '52998224725' }, { fetchImpl: ok });
  assert.equal(res.id, 'cus_1');
  assert.equal(calls[0].url, 'https://api-sandbox.asaas.com/v3/customers');
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers.access_token, 'key_test');

  await asaas.updateSubscription('sub_1', { value: 297 }, { fetchImpl: ok });
  assert.equal(calls[1].init.method, 'PUT');
  assert.equal(calls[1].url, 'https://api-sandbox.asaas.com/v3/subscriptions/sub_1');

  const bad = async () => ({ ok: false, status: 400, json: async () => ({ errors: [{ description: 'CPF inválido' }] }) });
  await assert.rejects(asaas.createCustomer({}, { fetchImpl: bad }), (err) => err.code === 'BILLING_PROVIDER_ERROR' && err.message === 'CPF inválido');
});
```

- [ ] **Step 2: Rodar e ver falhar** — `Cannot find module '../services/asaas'`.

- [ ] **Step 3: `services/asaas.js`**

```js
/** Asaas REST client. Only HTTP here; the billing rules live in billingService. */
const BASE = {
  sandbox: 'https://api-sandbox.asaas.com/v3',
  production: 'https://api.asaas.com/v3',
};

function config() {
  const env = process.env.WORQERA_Asaas__Env === 'production' ? 'production' : 'sandbox';
  return { apiKey: process.env.WORQERA_Asaas__ApiKey || '', env, baseUrl: BASE[env] };
}

function configured() {
  return Boolean(config().apiKey);
}

async function request(method, path, body, { fetchImpl = fetch } = {}) {
  const { apiKey, baseUrl } = config();
  const res = await fetchImpl(`${baseUrl}${path}`, {
    method,
    headers: { access_token: apiKey, 'Content-Type': 'application/json', 'User-Agent': 'Worqera/1.0' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.errors?.[0]?.description || `Asaas HTTP ${res.status}`);
    err.status = res.status >= 400 && res.status < 500 ? 400 : 502;
    err.code = 'BILLING_PROVIDER_ERROR';
    throw err;
  }
  return data;
}

module.exports = {
  config,
  configured,
  createCustomer: (body, opts) => request('POST', '/customers', body, opts),
  createSubscription: (body, opts) => request('POST', '/subscriptions', body, opts),
  updateSubscription: (id, body, opts) => request('PUT', `/subscriptions/${encodeURIComponent(id)}`, body, opts),
  deleteSubscription: (id, opts) => request('DELETE', `/subscriptions/${encodeURIComponent(id)}`, null, opts),
  listSubscriptionPayments: (id, status, opts) =>
    request('GET', `/subscriptions/${encodeURIComponent(id)}/payments${status ? `?status=${encodeURIComponent(status)}` : ''}`, null, opts),
};
```

- [ ] **Step 4: Rodar** — passa.

---

### Task 4: Checkout e cancelamento pelo Asaas (sai o AbacatePay)

**Files:**
- Modify: `api/src/v1/services/billingService.js` (reescrever checkout; remover AbacatePay)
- Modify: `api/src/v1/controllers/billingController.js`, `api/src/v1/routes/billingRoutes.js`
- Modify: `api/src/v1/__tests__/billing.test.js`

**Interfaces:**
- Consumes: `asaas.*` (Task 3), `normalizeCpfCnpj`, `priceCents` (Task 2), `saoPauloDayKey` (planCap).
- Produces: `firstDueDate(sub, now) -> 'YYYY-MM-DD'`; `createCheckoutSession(shopId, { planCode, cycle, cpfCnpj, successUrl }, { ownerEmail })` → `{ provider: 'Asaas', url: invoiceUrl, planCode, cycle }` ou `{ provider: 'manual', url: null, configured: false, message }`; `cancelSubscription(shopId)` → assinatura atualizada. Rota `POST /billing/cancel` (dono).

- [ ] **Step 1: Teste que falha (função pura)**

```js
test('first charge waits for the end of the trial', () => {
  const { firstDueDate } = require('../services/billingService');
  const now = new Date('2026-10-31T15:00:00.000Z');
  assert.equal(firstDueDate({ status: 'trialing', trialEndsAt: new Date('2026-11-05T15:00:00.000Z') }, now), '2026-11-05');
  assert.equal(firstDueDate({ status: 'trialing', trialEndsAt: new Date('2026-10-20T15:00:00.000Z') }, now), '2026-10-31');
  assert.equal(firstDueDate({ status: 'active' }, now), '2026-10-31');
});
```

- [ ] **Step 2: Rodar e ver falhar** — `firstDueDate is not a function`.

- [ ] **Step 3: Implementar** — em `billingService.js`, apagar `ABACATE_PUBLIC_KEY`, `API_BASE`, `abacateEnabled`, `verifyWebhookSecret`, `verifyWebhookHmac`, `authorizeWebhook`, `extractShopId`, `handleAbacateWebhook` e o `createCheckoutSession` antigo. Acrescentar:

```js
const asaas = require('./asaas');
const Shop = require('../models/Shop');
const { normalizeCpfCnpj } = require('../lib/cpfCnpj');
const { saoPauloDayKey } = require('../lib/planCap');

const MANUAL = {
  provider: 'manual',
  url: null,
  configured: false,
  message: 'Pagamento online desligado. Fale com a Worqera para ativar ou estender o trial.',
};

function fail(status, message, code = 'VALIDATION_ERROR') {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

/** The first charge falls on the last day of the trial, so nobody loses free days. */
function firstDueDate(sub, now = new Date()) {
  const trialEnd = sub?.status === 'trialing' && sub?.trialEndsAt ? new Date(sub.trialEndsAt) : null;
  return saoPauloDayKey(trialEnd && trialEnd > now ? trialEnd : now);
}

async function openInvoiceUrl(subscriptionId) {
  const pending = await asaas.listSubscriptionPayments(subscriptionId, 'PENDING');
  const overdue = pending?.data?.length ? null : await asaas.listSubscriptionPayments(subscriptionId, 'OVERDUE');
  const first = (pending?.data || [])[0] || (overdue?.data || [])[0];
  return first?.invoiceUrl || null;
}

async function createCheckoutSession(shopId, { planCode, cycle, cpfCnpj, successUrl } = {}, { ownerEmail } = {}) {
  const code = normalizePlanCode(planCode || 'WORQERA_PRO');
  const period = cycle === 'yearly' ? 'yearly' : 'monthly';
  const cents = priceCents(code, period);
  if (!cents) throw fail(400, 'Plano inválido');
  if (!asaas.configured()) return { ...MANUAL, planCode: code, cycle: period };

  const shop = await Shop.findById(shopId).select('name billing').lean();
  const doc = normalizeCpfCnpj(cpfCnpj || shop?.billing?.cpfCnpj);
  if (!doc) throw fail(400, 'Informe um CPF ou CNPJ válido para emitir a cobrança');
  if (doc !== shop?.billing?.cpfCnpj) await Shop.updateOne({ _id: shopId }, { $set: { 'billing.cpfCnpj': doc } });

  const sub = await Subscription.findOne({ shopId }).lean();
  const founder = code === 'WORQERA_BUSINESS' && period === 'monthly' ? effectivePrice({ ...sub, planCode: code }) : null;
  const value = (founder?.founderUntil ? founder.priceCents : cents) / 100;
  const description = `Worqera ${PRODUCTS.find((p) => p.code === code).name.replace('Worqera ', '')}${period === 'yearly' ? ' anual' : ''}`;

  let customerId = sub?.provider === 'Asaas' && sub?.providerCustomerId && doc === shop?.billing?.cpfCnpj ? sub.providerCustomerId : null;
  if (!customerId) {
    const customer = await asaas.createCustomer({
      name: shop?.name || 'Empresa Worqera',
      cpfCnpj: doc,
      email: ownerEmail || undefined,
      externalReference: String(shopId),
    });
    customerId = customer.id;
  }

  let subscriptionId = sub?.provider === 'Asaas' && sub?.providerSubscriptionId && customerId === sub.providerCustomerId ? sub.providerSubscriptionId : null;
  const body = {
    billingType: 'UNDEFINED',
    value,
    cycle: period === 'yearly' ? 'YEARLY' : 'MONTHLY',
    description,
    externalReference: String(shopId),
  };
  if (subscriptionId) {
    await asaas.updateSubscription(subscriptionId, { ...body, updatePendingPayments: true });
  } else {
    // New payer (CPF/CNPJ changed): the old subscription must stop, or the shop pays twice.
    if (sub?.provider === 'Asaas' && sub?.providerSubscriptionId) {
      await asaas.deleteSubscription(sub.providerSubscriptionId).catch(() => {});
    }
    const created = await asaas.createSubscription({
      ...body,
      customer: customerId,
      nextDueDate: firstDueDate(sub),
      callback: successUrl ? { successUrl, autoRedirect: true } : undefined,
    });
    subscriptionId = created.id;
  }

  const url = await openInvoiceUrl(subscriptionId);
  await Subscription.updateOne(
    { shopId },
    {
      $set: {
        planCode: code,
        cycle: period,
        provider: 'Asaas',
        providerCustomerId: customerId,
        providerSubscriptionId: subscriptionId,
        lastInvoiceUrl: url,
      },
    },
    { upsert: true }
  );
  return { provider: 'Asaas', url, planCode: code, cycle: period };
}

async function cancelSubscription(shopId) {
  const sub = await Subscription.findOne({ shopId }).lean();
  if (sub?.provider === 'Asaas' && sub.providerSubscriptionId) {
    await asaas.deleteSubscription(sub.providerSubscriptionId);
  }
  return Subscription.findOneAndUpdate({ shopId }, { $set: { status: 'canceled', lastInvoiceUrl: null } }, { new: true }).lean();
}
```

`completeCheckoutDev` fica (só fora de produção). `notifyBillingActivated` passa a usar o nome do plano: `const plan = PRODUCTS.find((p) => p.code === normalizePlanCode(sub?.planCode))?.name || 'Worqera'` no assunto/texto ("Sua assinatura ${plan} está ativa"). Exportar `firstDueDate`, `cancelSubscription`, `priceCents`.

- [ ] **Step 4: Controller e rota**

```js
exports.createCheckoutSession = wrap(async (req, res) => {
  const User = require('../models/User');
  const owner = req.auth?.userId ? await User.findById(req.auth.userId).select('email').lean() : null;
  const session = await billingService.createCheckoutSession(req.shopId, req.body || {}, { ownerEmail: owner?.email });
  res.status(201).json(session);
});

exports.cancelSubscription = wrap(async (req, res) => {
  res.status(200).json({ subscription: await billingService.cancelSubscription(req.shopId) });
});
```

Apagar `exports.abacateWebhook`. Em `billingRoutes.js`: `router.post('/checkout-sessions', ...shopGuard, requireRole('owner', 'admin'), …)` e `router.post('/cancel', ...shopGuard, requireRole('owner'), billingController.cancelSubscription)` (importar `requireRole` de `../middleware/requireRole`).

- [ ] **Step 5: Rodar** — `npm test` (o teste antigo "AbacatePay webhook auth" em `tenantIsolation.test.js` sai nesta task: apagar o `describe` e o `require` de `authorizeWebhook`/`verifyWebhookHmac`). Passa.

---

### Task 5: Webhook do Asaas

**Files:**
- Modify: `api/src/v1/services/billingService.js`, `api/src/v1/controllers/billingController.js`, `api/src/v1/index.js:31-32`, `api/src/v1/models/WebhookEvent.js:5`
- Modify: `api/src/v1/__tests__/billing.test.js`

**Interfaces:**
- Produces: `authorizeAsaasWebhook(token) -> boolean`; `webhookUpdate(event, payload, sub, now) -> object|null` (o `$set` a aplicar); `handleAsaasWebhook(payload)` → `{ ok, duplicate }`. Rota `POST /api/v1/webhooks/asaas`.

- [ ] **Step 1: Testes que falham**

```js
test('webhook token is required and compared safely', () => {
  const billing = require('../services/billingService');
  process.env.WORQERA_Asaas__WebhookToken = 'a'.repeat(40);
  assert.equal(billing.authorizeAsaasWebhook('a'.repeat(40)), true);
  assert.equal(billing.authorizeAsaasWebhook('b'.repeat(40)), false);
  assert.equal(billing.authorizeAsaasWebhook(''), false);
  delete process.env.WORQERA_Asaas__WebhookToken;
  assert.equal(billing.authorizeAsaasWebhook('anything'), false);
});

test('each Asaas event moves the subscription to the right state', () => {
  const { webhookUpdate } = require('../services/billingService');
  const now = new Date('2026-11-05T12:00:00.000Z');
  const sub = { cycle: 'monthly' };
  const paid = webhookUpdate('PAYMENT_RECEIVED', { payment: { dueDate: '2026-11-05', invoiceUrl: 'u' } }, sub, now);
  assert.equal(paid.status, 'active');
  assert.equal(paid.trialEndsAt, null);
  assert.equal(paid.currentPeriodEnd.toISOString().slice(0, 10), '2026-12-05');
  const yearly = webhookUpdate('PAYMENT_CONFIRMED', { payment: { dueDate: '2026-11-05' } }, { cycle: 'yearly' }, now);
  assert.equal(yearly.currentPeriodEnd.toISOString().slice(0, 10), '2027-11-05');
  assert.deepEqual(webhookUpdate('PAYMENT_OVERDUE', { payment: { invoiceUrl: 'u2' } }, sub, now), { status: 'past_due', lastInvoiceUrl: 'u2' });
  assert.deepEqual(webhookUpdate('PAYMENT_CREATED', { payment: { invoiceUrl: 'u3' } }, sub, now), { lastInvoiceUrl: 'u3' });
  assert.equal(webhookUpdate('PAYMENT_REFUNDED', { payment: {} }, sub, now).status, 'past_due');
  assert.equal(webhookUpdate('SUBSCRIPTION_DELETED', { subscription: {} }, sub, now).status, 'canceled');
  assert.equal(webhookUpdate('PAYMENT_CHECKOUT_VIEWED', { payment: {} }, sub, now), null);
});
```

- [ ] **Step 2: Rodar e ver falhar** — `authorizeAsaasWebhook is not a function`.

- [ ] **Step 3: Implementar**

```js
function authorizeAsaasWebhook(token) {
  const expected = process.env.WORQERA_Asaas__WebhookToken || '';
  if (!expected || !token) return false;
  return timingSafeEqualString(token, expected);
}

function addCycle(dateKey, cycle) {
  const d = new Date(`${dateKey}T12:00:00.000Z`);
  if (cycle === 'yearly') d.setUTCFullYear(d.getUTCFullYear() + 1);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d;
}

/** What an Asaas event changes on our Subscription, or null to ignore it. */
function webhookUpdate(event, payload, sub, now = new Date()) {
  const payment = payload?.payment || {};
  switch (event) {
    case 'PAYMENT_CONFIRMED':
    case 'PAYMENT_RECEIVED':
      return {
        status: 'active',
        trialEndsAt: null,
        currentPeriodEnd: addCycle(payment.dueDate || saoPauloDayKey(now), sub?.cycle),
        lastInvoiceUrl: null,
      };
    case 'PAYMENT_CREATED':
      return payment.invoiceUrl ? { lastInvoiceUrl: payment.invoiceUrl } : null;
    case 'PAYMENT_OVERDUE':
      return { status: 'past_due', lastInvoiceUrl: payment.invoiceUrl || null };
    case 'PAYMENT_REFUNDED':
    case 'PAYMENT_CHARGEBACK_REQUESTED':
      return { status: 'past_due' };
    case 'SUBSCRIPTION_DELETED':
    case 'SUBSCRIPTION_INACTIVATED':
      return { status: 'canceled', lastInvoiceUrl: null };
    default:
      return null;
  }
}

async function handleAsaasWebhook(payload) {
  const eventId = String(payload?.id || '');
  const event = String(payload?.event || '');
  if (!eventId || !event) throw fail(400, 'Invalid webhook payload');
  try {
    await WebhookEvent.create({ provider: 'Asaas', eventId, type: event, processedAt: new Date(), payload });
  } catch (e) {
    if (e.code === 11000) return { ok: true, duplicate: true };
    throw e;
  }
  const subscriptionId = payload.payment?.subscription || payload.subscription?.id || null;
  const shopRef = payload.payment?.externalReference || payload.subscription?.externalReference || null;
  const sub = subscriptionId
    ? await Subscription.findOne({ providerSubscriptionId: subscriptionId }).lean()
    : shopRef
      ? await Subscription.findOne({ shopId: shopRef }).lean()
      : null;
  if (!sub) return { ok: true, duplicate: false, matched: false };
  const set = webhookUpdate(event, payload, sub);
  if (!set) return { ok: true, duplicate: false, matched: true };
  const updated = await Subscription.findOneAndUpdate({ _id: sub._id }, { $set: set }, { new: true }).lean();
  if (set.status === 'active' && sub.status !== 'active') await notifyBillingActivated(sub.shopId, updated).catch(() => {});
  return { ok: true, duplicate: false, matched: true };
}
```

Controller:

```js
exports.asaasWebhook = wrap(async (req, res) => {
  if (!billingService.authorizeAsaasWebhook(req.headers['asaas-access-token'])) {
    return sendError(res, 401, { title: 'Unauthorized', detail: 'Invalid webhook token', code: 'UNAUTHORIZED' });
  }
  res.status(200).json(await billingService.handleAsaasWebhook(req.body || {}));
});
```

`index.js`: trocar a rota do AbacatePay por `router.post('/webhooks/asaas', billingController.asaasWebhook);`. `WebhookEvent.provider`: `default: 'Asaas'`. Exportar `authorizeAsaasWebhook`, `webhookUpdate`, `handleAsaasWebhook`.

- [ ] **Step 4: Rodar** — passa.

---

### Task 6: Tolerância de 5 dias no bloqueio

**Files:**
- Modify: `api/src/v1/middleware/subscriptionGate.js`
- Modify: `api/src/v1/__tests__/billing.test.js`

**Interfaces:**
- Produces: `canUse(sub, now) -> boolean` exportado do gate.

- [ ] **Step 1: Teste que falha**

```js
test('the shop keeps working 5 days after a missed due date', () => {
  const { canUse } = require('../middleware/subscriptionGate');
  const now = new Date('2026-11-10T12:00:00.000Z');
  const day = 86400000;
  assert.equal(canUse({ status: 'active' }, now), true);
  assert.equal(canUse({ status: 'past_due', currentPeriodEnd: new Date(now - 3 * day) }, now), true);
  assert.equal(canUse({ status: 'past_due', currentPeriodEnd: new Date(now - 6 * day) }, now), false);
  assert.equal(canUse({ status: 'trialing', trialEndsAt: new Date(now + day) }, now), true);
  assert.equal(canUse({ status: 'trialing', trialEndsAt: new Date(now - day) }, now), false);
  assert.equal(canUse({ status: 'trialing', trialEndsAt: new Date(now - 2 * day), providerSubscriptionId: 'sub_1' }, now), true);
  assert.equal(canUse({ status: 'canceled', currentPeriodEnd: new Date(now + 10 * day) }, now), true);
  assert.equal(canUse({ status: 'canceled', currentPeriodEnd: new Date(now - day) }, now), false);
  assert.equal(canUse(null, now), false);
});
```

- [ ] **Step 2: Rodar e ver falhar** — `canUse is not a function`.

- [ ] **Step 3: Implementar** — no gate:

```js
const GRACE_MS = 5 * 24 * 60 * 60 * 1000;

/** Active, trial in time, a missed payment inside the 5-day grace, or canceled with paid days left. */
function canUse(sub, now = new Date()) {
  if (!sub) return false;
  const t = now.getTime();
  const at = (d) => (d ? new Date(d).getTime() : 0);
  if (sub.status === 'active') return true;
  if (sub.status === 'trialing') {
    if (!sub.trialEndsAt || at(sub.trialEndsAt) > t) return true;
    return Boolean(sub.providerSubscriptionId) && at(sub.trialEndsAt) + GRACE_MS > t;
  }
  if (sub.status === 'past_due') return at(sub.currentPeriodEnd) + GRACE_MS > t;
  if (sub.status === 'canceled') return at(sub.currentPeriodEnd) > t;
  return false;
}
```

Trocar os dois `if` de status (o `!ACTIVE_STATUSES.has` e o do trial vencido) por:

```js
    if (!canUse(sub)) {
      if (sub && sub.status === 'trialing') {
        await Subscription.updateOne({ _id: sub._id }, { $set: { status: 'expired' } });
      }
      return sendError(res, 402, {
        title: 'Subscription Inactive',
        detail: sub?.status === 'trialing' ? 'Trial period has ended' : 'Active or trialing subscription required',
        code: 'SUBSCRIPTION_INACTIVE',
      });
    }
```

Exportar `canUse` (manter `ACTIVE_STATUSES`).

- [ ] **Step 4: Rodar** — `npm test` → tudo passa.

- [ ] **Step 5: Smoke com banco descartável** — com o Asaas simulado (substituir `asaas.createCustomer`, `createSubscription`, `listSubscriptionPayments` no objeto do módulo), num banco `worqera_billing_tmp`: checkout de uma loja em trial cria cliente+assinatura com `nextDueDate` = fim do trial e devolve a URL; segundo checkout (troca para anual) chama `updateSubscription` e não cria outra; checkout com outro CPF/CNPJ apaga a assinatura antiga antes de criar a nova; webhook `PAYMENT_RECEIVED` com o `subscription` certo deixa `active` e `currentPeriodEnd` +1 ano; o mesmo evento de novo volta `duplicate: true`. Apagar o banco e o arquivo no fim.

---

### Task 7: Site — `/billing`, cadastro, textos de IA e preços da landing

**Files:**
- Modify: `web/lib/apiV1.ts:1144-1164` (checkout, cancelar)
- Modify: `web/app/(app)/billing/page.tsx` (reescrever)
- Create: `web/lib/plans.ts` (catálogo único do front)
- Modify: `web/app/signup/page.tsx:25-60,222`
- Modify: `web/components/ai/AiQuotaNotice.tsx`
- Modify: `web/components/landing/i18n.ts` (só preços e itens dos planos, PT e EN) e `web/components/landing/pricing-section.tsx:8-10,60-64` (Business com trial)

**Interfaces:**
- Consumes: `POST /billing/checkout-sessions { planCode, cycle, cpfCnpj, successUrl }`, `POST /billing/cancel`, `GET /billing/subscription` (agora com `cycle`, `lastInvoiceUrl`).
- Produces: `PLANS` e `formatBRL` em `web/lib/plans.ts`; `createCheckoutSessionV1(body)`, `cancelSubscriptionV1()`.

- [ ] **Step 1: `web/lib/plans.ts`**

```ts
export type PlanCode = "WORQERA_BASIC" | "WORQERA_PRO" | "WORQERA_BUSINESS"
export type Cycle = "monthly" | "yearly"

export const PLANS: Array<{ code: PlanCode; name: string; monthly: number; yearly: number; value: string; items: string[] }> = [
  {
    code: "WORQERA_BASIC",
    name: "Basic",
    monthly: 147,
    yearly: 1470,
    value: "Um orçamento recuperado no mês já paga o plano.",
    items: ["Kanban por setores, TVs e consulta do cliente", "CRM de orçamentos e WhatsApp com texto pronto", "IA no resumo do dia (50 usos)", "Até 150 pedidos por mês"],
  },
  {
    code: "WORQERA_PRO",
    name: "Pro",
    monthly: 297,
    yearly: 2970,
    value: "O caixa, a prateleira e o estoque na sua mão.",
    items: ["Tudo do Basic, sem limite de pedidos", "Financeiro, métricas e TV financeiro", "Produtos, estoque e marca da empresa", "IA em orçamentos, clientes e cobrança (300 usos)"],
  },
  {
    code: "WORQERA_BUSINESS",
    name: "Business",
    monthly: 597,
    yearly: 5970,
    value: "O WhatsApp avisa sozinho e a IA escreve com você.",
    items: ["Tudo do Pro", "WhatsApp oficial automático (1.000 avisos e 100 retomadas)", "IA com 1.500 usos e leitura semanal", "Suporte prioritário"],
  },
]

export const IMPLANTACAO = 497

export const formatBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })

export function planOf(code?: string | null) {
  const c = String(code || "").toUpperCase() === "WORQERA_PREMIUM" ? "WORQERA_BUSINESS" : String(code || "").toUpperCase()
  return PLANS.find((p) => p.code === c) || null
}
```

- [ ] **Step 2: `apiV1.ts`**

```ts
export async function createCheckoutSessionV1(body: { planCode: string; cycle: "monthly" | "yearly"; cpfCnpj: string; successUrl?: string }) {
  return v1Fetch<{ url: string | null; provider?: string; configured?: boolean; message?: string; planCode?: string; cycle?: string }>(
    "/billing/checkout-sessions",
    { method: "POST", body: JSON.stringify(body) }
  )
}

export async function cancelSubscriptionV1() {
  return v1Fetch<{ subscription: any }>("/billing/cancel", { method: "POST", body: "{}" })
}
```

- [ ] **Step 3: Reescrever `/billing`** — mesma moldura (`AppHeader`, aviso de bloqueio, card de IA do mês). Conteúdo novo:
  - Estado: `planCode` (padrão o atual ou Pro), `cycle` (`monthly`), `doc` (CPF/CNPJ, máscara `000.000.000-00` / `00.000.000/0000-00`), `busy`.
  - Três cartões de plano clicáveis (`PLANS`), com preço do ciclo escolhido (`formatBRL(cycle === 'yearly' ? p.yearly : p.monthly)` + "/mês" ou "/ano"), a frase de valor e os itens; o atual com selo "Seu plano". Chave "Mensal · Anual (2 meses grátis)".
  - Campo "CPF ou CNPJ de quem paga" e o botão "Assinar {plano}" → `createCheckoutSessionV1({ planCode, cycle, cpfCnpj: doc, successUrl: `${location.origin}/billing?pago=1` })`; se vier `url`, `window.location.href = url`; se vier `provider === 'manual'`, `toast.message(message)`; erro → `toast.error`.
  - Se `sub.lastInvoiceUrl`: botão "Pagar fatura em aberto" (abre a URL).
  - Se `sub.provider === 'Asaas'` e `status` ativo: botão "Cancelar assinatura" com `window.confirm("Cancelar a assinatura? A empresa usa até o fim do período pago.")` → `cancelSubscriptionV1()`.
  - Textos: "Pagamento pelo Asaas: Pix, boleto ou cartão." e "Implantação com a Worqera (setores, carga do histórico e treinamento): R$ 497 uma vez." com link do WhatsApp.
  - `?pago=1` na URL → `toast.success("Pagamento recebido? A assinatura ativa assim que o Asaas confirmar.")`.
  - Status em português: `{ trialing: "Em teste", active: "Ativa", past_due: "Pagamento atrasado", canceled: "Cancelada", expired: "Teste encerrado" }`.

- [ ] **Step 4: Cadastro (`signup/page.tsx`)** — os cartões de plano passam a usar `PLANS` (preço mensal, frase de valor), o Business entra no seletor (`/signup?plan=business` funciona) e o texto "O Business fecha em conversa." vira "7 dias grátis em qualquer plano.". O link de WhatsApp do Business sai.

- [ ] **Step 5: `AiQuotaNotice.tsx`** — `WORQERA_AI_CONTACT` sem "plano Business" (`"Olá! Quero mais usos de IA na minha empresa."`); no bloqueado, depois do texto atual, acrescentar `<a href="/billing" className="font-semibold underline">Ver planos</a>` antes do "Fale com a Worqera".

- [ ] **Step 6: Landing (só preços)** — em `i18n.ts` (PT e EN), os três planos: preços R$ 147 / R$ 297 / R$ 597, itens iguais aos de `PLANS`, `custom: "7 dias grátis em qualquer plano. Implantação com a Worqera: R$ 497 uma vez."`, Business com `cta: "Testar 7 dias"`. Em `pricing-section.tsx`, o Business vai para `/signup?plan=business` (sai o `WHATSAPP`) e mostra "7 dias grátis no signup" como os outros.

- [ ] **Step 7: Verificar** — `cd web && npx tsc --noEmit -p . --incremental false` → sem erros; `rg -n "R\\$ (97|197|697)" web/app web/components web/lib` → nada.

---

### Task 8: App — tela de plano, cadastro e textos de IA

**Files:**
- Modify: `mobile/lib/features/ops/ops_screens.dart:440-600` (`BillingScreen`)
- Modify: `mobile/lib/features/auth/account_screens.dart:25-35`
- Modify: `mobile/lib/features/ai/ai_widgets.dart:14-17` (`_aiContact`)

**Interfaces:**
- Consumes: as mesmas rotas da Task 7.

- [ ] **Step 1: `BillingScreen`** — mesma estrutura de hoje (cartão "Seu plano", IA do mês) com:
  - lista de planos `(code, nome, mensal, anual, frase)` = `('WORQERA_BASIC','Basic',147,1470,'Um orçamento recuperado no mês já paga o plano.')`, `('WORQERA_PRO','Pro',297,2970,'O caixa, a prateleira e o estoque na sua mão.')`, `('WORQERA_BUSINESS','Business',597,5970,'O WhatsApp avisa sozinho e a IA escreve com você.')`; toque seleciona;
  - `SegmentedButton` Mensal/Anual; `TextField` "CPF ou CNPJ de quem paga" (`keyboardType: TextInputType.number`);
  - botão "Assinar {plano}" → `POST /billing/checkout-sessions` com `{planCode, cycle, cpfCnpj}`; `url` → `launchUrl(..., mode: LaunchMode.externalApplication)`; `provider == 'manual'` → `wqToast(context, message)`; erro → `wqToast(context, widget.api.message(e))`;
  - "Pagar fatura em aberto" quando `lastInvoiceUrl`; "Cancelar assinatura" (confirmação) quando `provider == 'Asaas'` e ativa → `POST /billing/cancel`;
  - subtítulo `'Basic R\$ 147 · Pro R\$ 297 · Business R\$ 597'`; `_planName`/`_planPitch` com os valores e frases novos (fundador: `R\$ 499/mês (fundador até …)`).
- [ ] **Step 2: Cadastro** — o mapa de planos em `account_screens.dart` com `R\$ 147` / `R\$ 297` / `R\$ 597`, as frases novas e o Business como opção.
- [ ] **Step 3: `_aiContact`** — `'https://wa.me/5511985591053?text=Ol%C3%A1!%20Quero%20mais%20usos%20de%20IA%20na%20minha%20empresa.'`.
- [ ] **Step 4: Verificar** — `flutter analyze --no-fatal-infos lib` → "No issues found!"; `rg -n "R\\\\\$ (97|197|697)" mobile/lib` → nada.

---

### Task 9: Variáveis, guia de preços e change-logs

**Files:**
- Modify: `api/.env.prod.example:100-110`, `api/.env.example`
- Modify: `docs/superpowers/plans/2026-09-17-worqera-pricing-and-change-script.md` (reescrever)
- Modify: `api/specs/change-log.md`, `web/specs/change-log.md`, `mobile/specs/change-log.md`, `api/specs/backend.endpoints.md` (rotas de billing)

- [ ] **Step 1: `.env.prod.example`** — trocar o bloco do AbacatePay por:

```bash
# ---------------------------------------------------------------------------
# Asaas — assinaturas (Pix, boleto ou cartão na fatura). Sem chave: cobrança manual.
#   1) Integrações → Chaves de API → WORQERA_Asaas__ApiKey
#   2) Integrações → Webhooks → URL https://<PUBLIC_API_URL>/api/v1/webhooks/asaas
#      token: openssl rand -hex 32 → WORQERA_Asaas__WebhookToken
#      eventos: cobranças (PAYMENT_*) e assinaturas (SUBSCRIPTION_*)
# ---------------------------------------------------------------------------
WORQERA_Asaas__Env=sandbox
WORQERA_Asaas__ApiKey=
WORQERA_Asaas__WebhookToken=
# Cota de IA por mês (opcional; padrão trial 30, Basic 50, Pro 300, Business 1500)
# WORQERA_AI_CAP_TRIAL=30
# WORQERA_AI_CAP_BASIC=50
# WORQERA_AI_CAP_PRO=300
# WORQERA_AI_CAP_BUSINESS=1500
```

Mesmo bloco (com `sandbox`) no `.env.example`.

- [ ] **Step 2: Guia de preços** — reescrever com: tabela 147/297/597 (anual 1.470/2.970/5.970), implantação 497, o que cada plano entrega e a frase de valor, conta da meta (~32 lojas no mix 25/55/20; 34 só Pro), "qual plano oferecer", scripts curtos com os preços novos, checklist semanal com o MRR novo e o histórico (31/10: 147/297/597 + Asaas).
- [ ] **Step 3: Change-logs e endpoints** — registrar: preços, IA por plano, Basic 150, Asaas (checkout, webhook, cancelar, tolerância de 5 dias), saída do AbacatePay, o bug do produto único e do plano sempre Pro no webhook antigo; no `backend.endpoints.md`, `POST /billing/checkout-sessions` (body novo), `POST /billing/cancel`, `POST /webhooks/asaas`, e sai `/webhooks/abacatepay`.
- [ ] **Step 4: Verificação final** — `cd api && npm test`; tsc do web; flutter analyze; `rg -n -i "abacate" api/src web/app web/components web/lib mobile/lib` → nada além de comentário histórico (se houver, remover).
