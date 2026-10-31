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
    const fresh = { ...body, customer: customerId, nextDueDate: firstDueDate(sub) };
    let created;
    try {
      created = await asaas.createSubscription(successUrl ? { ...fresh, callback: { successUrl, autoRedirect: true } } : fresh);
    } catch (err) {
      // Asaas only accepts a return link for a site registered in the account (Minha Conta → Informações).
      // Without it, still charge: the payer just isn't sent back to the site.
      if (!successUrl || !/dom[ií]nio/i.test(err.message)) throw err;
      console.warn('[billing] Asaas refused the return link; register the site in the Asaas account', err.message);
      created = await asaas.createSubscription(fresh);
    }
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

const PAYMENT_STATUS = {
  RECEIVED: ['paid', 'Pago'],
  RECEIVED_IN_CASH: ['paid', 'Pago'],
  CONFIRMED: ['paid', 'Confirmado'],
  PENDING: ['open', 'Em aberto'],
  AWAITING_RISK_ANALYSIS: ['open', 'Em análise'],
  OVERDUE: ['overdue', 'Vencido'],
  REFUNDED: ['refunded', 'Estornado'],
  REFUND_REQUESTED: ['refunded', 'Estorno pedido'],
  REFUND_IN_PROGRESS: ['refunded', 'Estornando'],
  CHARGEBACK_REQUESTED: ['refunded', 'Contestado'],
  CHARGEBACK_DISPUTE: ['refunded', 'Contestado'],
};

/** One Asaas charge as the plan page shows it. */
function paymentView(p) {
  const { methodLabel } = require('./platformEmails');
  const [status, statusLabel] = PAYMENT_STATUS[p?.status] || ['open', 'Em aberto'];
  return {
    id: p?.id || null,
    dueDate: p?.dueDate || null,
    paidAt: p?.paymentDate || p?.clientPaymentDate || p?.confirmedDate || null,
    value: Number(p?.value) || 0,
    status,
    statusLabel,
    method: methodLabel(p?.billingType),
    invoiceUrl: p?.invoiceUrl || null,
    receiptUrl: p?.transactionReceiptUrl || null,
  };
}

/** Latest charges of the shop's Asaas subscription (newest first). Empty when there is none yet. */
async function listPayments(shopId) {
  const sub = await Subscription.findOne({ shopId }).lean();
  if (sub?.provider !== 'Asaas' || !sub.providerSubscriptionId || !asaas.configured()) return [];
  try {
    const res = await asaas.listSubscriptionPayments(sub.providerSubscriptionId);
    return (res?.data || [])
      .map(paymentView)
      .sort((a, b) => String(b.dueDate).localeCompare(String(a.dueDate)))
      .slice(0, 12);
  } catch (err) {
    console.warn('[billing] could not list Asaas payments', err.message);
    return [];
  }
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
    await notifyBillingActivated(sub.shopId, updated, payload.payment).catch(() => {});
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

/** Worqera receipt to the owner and admins when a payment turns the subscription active. */
async function notifyBillingActivated(shopId, sub, payment = null) {
  try {
    const Membership = require('../models/Membership');
    const User = require('../models/User');
    const { sendMail } = require('./mailer');
    const { subscriptionActiveEmail } = require('./platformEmails');
    const shop = await Shop.findById(shopId).lean();
    const code = normalizePlanCode(sub?.planCode);
    const planName = PRODUCTS.find((p) => p.code === code)?.name || 'Worqera';
    const amountBrl = Number(payment?.value) || (priceCents(code, sub?.cycle) || 0) / 100;
    const base = (process.env.PUBLIC_WEB_URL || 'https://worqera.com').replace(/\/+$/, '');
    const owners = await Membership.find({
      shopId,
      role: { $in: ['owner', 'admin'] },
      active: true,
    }).lean();
    const users = await User.find({ _id: { $in: owners.map((m) => m.userId) } }).lean();
    for (const u of users) {
      if (!u.email) continue;
      const mail = subscriptionActiveEmail({
        ownerName: u.name,
        shopName: shop?.branding?.displayName || shop?.name,
        planName,
        cycle: sub?.cycle,
        amountBrl,
        paidUntil: sub?.currentPeriodEnd,
        method: payment?.billingType,
        billingUrl: `${base}/billing`,
      });
      await sendMail({ to: u.email, platform: true, ...mail });
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
  paymentView,
  listPayments,
  authorizeAsaasWebhook,
  webhookUpdate,
  handleAsaasWebhook,
  completeCheckoutDev,
  PRODUCTS,
  PLAN_CODES,
  normalizePlanCode,
  priceCents,
};
