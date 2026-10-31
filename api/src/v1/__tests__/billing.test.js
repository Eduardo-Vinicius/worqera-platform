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

  await asaas.listSubscriptionPayments('sub_1', 'PENDING', { fetchImpl: ok });
  assert.equal(calls[2].url, 'https://api-sandbox.asaas.com/v3/subscriptions/sub_1/payments?status=PENDING');

  const bad = async () => ({ ok: false, status: 400, json: async () => ({ errors: [{ description: 'CPF inválido' }] }) });
  await assert.rejects(
    asaas.createCustomer({}, { fetchImpl: bad }),
    (err) => err.code === 'BILLING_PROVIDER_ERROR' && err.message === 'CPF inválido'
  );
  delete process.env.WORQERA_Asaas__ApiKey;
  delete process.env.WORQERA_Asaas__Env;
});

test('first charge waits for the end of the trial', () => {
  const { firstDueDate } = require('../services/billingService');
  const now = new Date('2026-10-31T15:00:00.000Z');
  assert.equal(firstDueDate({ status: 'trialing', trialEndsAt: new Date('2026-11-05T15:00:00.000Z') }, now), '2026-11-05');
  assert.equal(firstDueDate({ status: 'trialing', trialEndsAt: new Date('2026-10-20T15:00:00.000Z') }, now), '2026-10-31');
  assert.equal(firstDueDate({ status: 'active' }, now), '2026-10-31');
});

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

test('the shop keeps working 5 days after a missed due date', () => {
  const { canUse } = require('../middleware/subscriptionGate');
  const now = new Date('2026-11-10T12:00:00.000Z');
  const day = 86400000;
  assert.equal(canUse({ status: 'active' }, now), true);
  assert.equal(canUse({ status: 'past_due', currentPeriodEnd: new Date(now - 3 * day) }, now), true);
  assert.equal(canUse({ status: 'past_due', currentPeriodEnd: new Date(now - 6 * day) }, now), false);
  assert.equal(canUse({ status: 'trialing', trialEndsAt: new Date(now.getTime() + day) }, now), true);
  assert.equal(canUse({ status: 'trialing', trialEndsAt: new Date(now - day) }, now), false);
  assert.equal(canUse({ status: 'trialing', trialEndsAt: new Date(now - 2 * day), providerSubscriptionId: 'sub_1' }, now), true);
  assert.equal(canUse({ status: 'canceled', currentPeriodEnd: new Date(now.getTime() + 10 * day) }, now), true);
  assert.equal(canUse({ status: 'canceled', currentPeriodEnd: new Date(now - day) }, now), false);
  assert.equal(canUse({ status: 'expired' }, now), false);
  assert.equal(canUse(null, now), false);
});

test('checkout still works when Asaas refuses the return link (site not registered)', async () => {
  const asaas = require('../services/asaas');
  const billing = require('../services/billingService');
  const Shop = require('../models/Shop');
  const Subscription = require('../models/Subscription');
  const saved = { ...asaas };
  const savedShop = { findById: Shop.findById, updateOne: Shop.updateOne };
  const savedSub = { findOne: Subscription.findOne, updateOne: Subscription.updateOne };
  const sent = [];
  try {
    asaas.configured = () => true;
    asaas.createCustomer = async () => ({ id: 'cus_1' });
    asaas.createSubscription = async (body) => {
      sent.push(body);
      if (body.callback) {
        const err = new Error('Não há nenhum domínio configurado em sua conta. Cadastre um site em Minha Conta na aba Informações.');
        err.code = 'BILLING_PROVIDER_ERROR';
        throw err;
      }
      return { id: 'sub_1' };
    };
    asaas.listSubscriptionPayments = async () => ({ data: [{ invoiceUrl: 'https://asaas.test/i/1' }] });
    const lean = (value) => ({ select: () => ({ lean: async () => value }), lean: async () => value });
    Shop.findById = () => lean({ name: 'Loja', billing: { cpfCnpj: '52998224725' } });
    Shop.updateOne = async () => ({});
    Subscription.findOne = () => lean({ status: 'trialing', trialEndsAt: new Date(Date.now() + 86400000) });
    Subscription.updateOne = async () => ({});

    const res = await billing.createCheckoutSession('64b000000000000000000001', { planCode: 'WORQERA_PRO', successUrl: 'https://worqera.com/billing?pago=1' });
    assert.equal(res.url, 'https://asaas.test/i/1');
    assert.equal(sent.length, 2);
    assert.ok(sent[0].callback);
    assert.equal(sent[1].callback, undefined);
  } finally {
    Object.assign(asaas, saved);
    Object.assign(Shop, savedShop);
    Object.assign(Subscription, savedSub);
  }
});

test('subscription e-mail is a Worqera receipt, not a shop message', () => {
  const { subscriptionActiveEmail } = require('../services/platformEmails');
  const mail = subscriptionActiveEmail({
    ownerName: 'Eduardo',
    shopName: 'Loja <b>X</b>',
    planName: 'Worqera Pro',
    cycle: 'monthly',
    amountBrl: 297,
    paidUntil: new Date('2026-12-05T12:00:00.000Z'),
    method: 'PIX',
    billingUrl: 'https://worqera.com/billing',
  });
  assert.equal(mail.subject, 'Assinatura Worqera Pro ativa');
  assert.match(mail.html, /R\$\s?297,00/);
  assert.match(mail.html, /Pix/);
  assert.match(mail.html, /05\/12\/2026/);
  assert.match(mail.html, /https:\/\/worqera\.com\/billing/);
  assert.match(mail.html, /Loja &lt;b&gt;X&lt;\/b&gt;/);
  assert.doesNotMatch(mail.subject, /\[/);
  assert.match(mail.text, /Worqera Pro/);
});

test('Asaas charges become a readable payment list', () => {
  const { paymentView } = require('../services/billingService');
  const paid = paymentView({
    id: 'pay_1', dueDate: '2026-11-05', paymentDate: '2026-11-04', value: 297, status: 'RECEIVED',
    billingType: 'PIX', invoiceUrl: 'https://asaas.test/i/1', transactionReceiptUrl: 'https://asaas.test/r/1',
  });
  assert.deepEqual(paid, {
    id: 'pay_1', dueDate: '2026-11-05', paidAt: '2026-11-04', value: 297, status: 'paid', statusLabel: 'Pago',
    method: 'Pix', invoiceUrl: 'https://asaas.test/i/1', receiptUrl: 'https://asaas.test/r/1',
  });
  assert.equal(paymentView({ status: 'PENDING', billingType: 'UNDEFINED' }).statusLabel, 'Em aberto');
  assert.equal(paymentView({ status: 'OVERDUE' }).status, 'overdue');
  assert.equal(paymentView({ status: 'REFUNDED' }).statusLabel, 'Estornado');
  assert.equal(paymentView({ status: 'CONFIRMED', billingType: 'CREDIT_CARD' }).method, 'Cartão de crédito');
});
