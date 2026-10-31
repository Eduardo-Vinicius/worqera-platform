const crypto = require('crypto');
const Subscription = require('../models/Subscription');
const WebhookEvent = require('../models/WebhookEvent');
const Shop = require('../models/Shop');
const asaas = require('./asaas');
const { normalizeCpfCnpj } = require('../lib/cpfCnpj');
const { saoPauloDayKey } = require('../lib/planCap');

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
    description:
      'Tudo do Pro, WhatsApp oficial avisando sozinho, IA com 1.500 usos e leitura semanal, suporte prioritário',
    priceCents: 59700,
    yearlyPriceCents: 597000,
    currency: 'BRL',
    interval: 'month',
  },
];

const PLAN_CODES = new Set([
  'WORQERA_BASIC',
  'WORQERA_PRO',
  'WORQERA_BUSINESS',
  'WORQERA_PREMIUM', // legado (= Business)
  'WORQERA_EARLY', // legado pioneiro
]);

function normalizePlanCode(code) {
  const c = String(code || '').trim().toUpperCase();
  if (c === 'WORQERA_PREMIUM') return 'WORQERA_BUSINESS';
  return c;
}

function priceCents(planCode, cycle = 'monthly') {
  const plan = PRODUCTS.find((p) => p.code === normalizePlanCode(planCode));
  if (!plan) return null;
  return cycle === 'yearly' ? plan.yearlyPriceCents : plan.priceCents;
}

const FOUNDER_PRICE_CENTS = 49900;

/** Monthly price this shop pays: the founder price while it lasts, else the catalog. */
function effectivePrice(sub, now = new Date()) {
  const code = normalizePlanCode(sub?.planCode);
  const plan = PRODUCTS.find((p) => p.code === code);
  const founderActive =
    code === 'WORQERA_BUSINESS' &&
    sub?.founder?.priceCents &&
    sub?.founder?.until &&
    new Date(sub.founder.until) > now;
  return {
    priceCents: founderActive ? sub.founder.priceCents : plan?.priceCents ?? null,
    listPriceCents: plan?.priceCents ?? null,
    founderUntil: founderActive ? sub.founder.until : null,
  };
}

async function getSubscription(shopId) {
  const sub = await Subscription.findOne({ shopId }).lean();
  if (!sub) return sub;
  return { ...sub, price: effectivePrice(sub) };
}

function listProducts() {
  return PRODUCTS;
}

function timingSafeEqualString(a, b) {
  const aa = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

function fail(status, message, code = 'VALIDATION_ERROR') {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

const MANUAL = {
  provider: 'manual',
  url: null,
  configured: false,
  message: 'Pagamento online desligado. Fale com a Worqera para ativar ou estender o trial.',
};

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
  const savedDoc = shop?.billing?.cpfCnpj || null;
  const doc = normalizeCpfCnpj(cpfCnpj || savedDoc);
  if (!doc) throw fail(400, 'Informe um CPF ou CNPJ válido para emitir a cobrança');
  if (doc !== savedDoc) await Shop.updateOne({ _id: shopId }, { $set: { 'billing.cpfCnpj': doc } });

  const sub = await Subscription.findOne({ shopId }).lean();
  const founder = code === 'WORQERA_BUSINESS' && period === 'monthly' ? effectivePrice({ ...sub, planCode: code }) : null;
  const value = (founder?.founderUntil ? founder.priceCents : cents) / 100;
  const planName = PRODUCTS.find((p) => p.code === code).name;
  const onAsaas = sub?.provider === 'Asaas';

  let customerId = onAsaas && sub?.providerCustomerId && doc === savedDoc ? sub.providerCustomerId : null;
  if (!customerId) {
    const customer = await asaas.createCustomer({
      name: shop?.name || 'Empresa Worqera',
      cpfCnpj: doc,
      email: ownerEmail || undefined,
      externalReference: String(shopId),
    });
    customerId = customer.id;
  }

  const body = {
    billingType: 'UNDEFINED',
    value,
    cycle: period === 'yearly' ? 'YEARLY' : 'MONTHLY',
    description: `${planName}${period === 'yearly' ? ' anual' : ''}`,
    externalReference: String(shopId),
  };
  let subscriptionId =
    onAsaas && sub?.providerSubscriptionId && customerId === sub.providerCustomerId ? sub.providerSubscriptionId : null;
  if (subscriptionId) {
    await asaas.updateSubscription(subscriptionId, { ...body, updatePendingPayments: true });
  } else {
    // New payer (CPF/CNPJ changed): the old subscription must stop, or the shop pays twice.
    if (onAsaas && sub?.providerSubscriptionId) {
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
  return Subscription.findOneAndUpdate(
    { shopId },
    { $set: { status: 'canceled', lastInvoiceUrl: null } },
    { new: true }
  ).lean();
}

/** Asaas sends the token set on the webhook in `asaas-access-token`. No token configured = nothing gets in. */
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

/** At-least-once delivery: the event id is stored first, so a repeat changes nothing. */
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
  let sub = subscriptionId ? await Subscription.findOne({ providerSubscriptionId: subscriptionId }).lean() : null;
  if (!sub && shopRef && /^[a-f0-9]{24}$/i.test(String(shopRef))) {
    sub = await Subscription.findOne({ shopId: shopRef, provider: 'Asaas' }).lean();
  }
  if (!sub) return { ok: true, duplicate: false, matched: false };
  const set = webhookUpdate(event, payload, sub);
  if (!set) return { ok: true, duplicate: false, matched: true };
  const updated = await Subscription.findOneAndUpdate({ _id: sub._id }, { $set: set }, { new: true }).lean();
  if (set.status === 'active' && sub.status !== 'active') {
    await notifyBillingActivated(sub.shopId, updated).catch(() => {});
  }
  return { ok: true, duplicate: false, matched: true };
}

async function completeCheckoutDev(shopId, { planCode } = {}) {
  if (process.env.NODE_ENV === 'production') {
    throw fail(403, 'Dev checkout disabled in production', 'FORBIDDEN');
  }

  const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const sub = await Subscription.findOneAndUpdate(
    { shopId },
    {
      $set: {
        planCode: normalizePlanCode(planCode || 'WORQERA_PRO'),
        status: 'active',
        provider: 'Dev',
        currentPeriodEnd: periodEnd,
        trialEndsAt: null,
        providerSubscriptionId: `dev_sub_${shopId}`,
      },
    },
    { new: true, upsert: true }
  ).lean();

  await notifyBillingActivated(shopId, sub).catch(() => {});
  return sub;
}

async function notifyBillingActivated(shopId, sub) {
  try {
    const Membership = require('../models/Membership');
    const User = require('../models/User');
    const { sendMail } = require('./mailer');
    const shop = await Shop.findById(shopId).lean();
    const plan = PRODUCTS.find((p) => p.code === normalizePlanCode(sub?.planCode))?.name || 'Worqera';
    const owners = await Membership.find({
      shopId,
      role: { $in: ['owner', 'admin'] },
      active: true,
    }).lean();
    const users = await User.find({ _id: { $in: owners.map((m) => m.userId) } }).lean();
    for (const u of users) {
      if (!u.email) continue;
      await sendMail({
        to: u.email,
        shop,
        subject: 'Assinatura ativa',
        text: `Olá ${u.name || ''},\n\nSua assinatura ${plan} está ativa para ${shop?.name || 'sua empresa'}.\n`,
        html: `<p>Assinatura <strong>${plan}</strong> ativa para <strong>${shop?.name || 'sua empresa'}</strong>.</p>`,
      });
    }
  } catch (err) {
    console.error('[billing] receipt email failed', err.message);
  }
}

module.exports = {
  FOUNDER_PRICE_CENTS,
  effectivePrice,
  getSubscription,
  listProducts,
  firstDueDate,
  createCheckoutSession,
  cancelSubscription,
  authorizeAsaasWebhook,
  webhookUpdate,
  handleAsaasWebhook,
  completeCheckoutDev,
  PRODUCTS,
  PLAN_CODES,
  normalizePlanCode,
  priceCents,
};
