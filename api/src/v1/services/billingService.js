const crypto = require('crypto');
const Subscription = require('../models/Subscription');
const WebhookEvent = require('../models/WebhookEvent');

const PRODUCTS = [
  {
    code: 'WORQERA_PRO',
    name: 'Worqera Pro',
    description: 'Kanban por setores, multi-usuário e trial de 7 dias',
    priceCents: 9900,
    currency: 'BRL',
    interval: 'month',
  },
];

async function getSubscription(shopId) {
  return Subscription.findOne({ shopId }).lean();
}

function listProducts() {
  return PRODUCTS;
}

async function createCheckoutSession(shopId, { planCode, successUrl, cancelUrl } = {}) {
  const plan = PRODUCTS.find((p) => p.code === (planCode || 'WORQERA_PRO')) || PRODUCTS[0];
  const sessionId = `dev_${shopId}_${Date.now()}`;
  const base =
    process.env.WORQERA_AbacatePay__CheckoutBaseUrl ||
    'https://pay.abacatepay.com/checkout';
  const url = `${base}?session=${encodeURIComponent(sessionId)}&plan=${plan.code}&shop=${shopId}`;

  return {
    id: sessionId,
    url,
    planCode: plan.code,
    successUrl: successUrl || null,
    cancelUrl: cancelUrl || null,
    provider: 'AbacatePay',
    mock: true,
  };
}

async function completeCheckoutDev(shopId, { planCode } = {}) {
  if (process.env.NODE_ENV === 'production') {
    const err = new Error('Dev checkout disabled in production');
    err.status = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const sub = await Subscription.findOneAndUpdate(
    { shopId },
    {
      $set: {
        planCode: planCode || 'WORQERA_PRO',
        status: 'active',
        provider: 'Dev',
        currentPeriodEnd: periodEnd,
        trialEndsAt: null,
        providerSubscriptionId: `dev_sub_${shopId}`,
      },
    },
    { new: true, upsert: true }
  ).lean();

  return sub;
}

function verifyWebhookSecret(querySecret) {
  const expected = process.env.WORQERA_AbacatePay__WebhookSecret || '';
  if (!expected) return false;
  const a = Buffer.from(String(querySecret || ''));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

async function handleAbacateWebhook(payload) {
  const eventId = String(payload.id || payload.eventId || payload.event?.id || '');
  const type = String(payload.type || payload.event?.type || payload.event || '');
  if (!eventId || !type) {
    const err = new Error('Invalid webhook payload');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  try {
    await WebhookEvent.create({
      provider: 'AbacatePay',
      eventId,
      type,
      processedAt: new Date(),
      payload,
    });
  } catch (e) {
    if (e.code === 11000) {
      return { ok: true, duplicate: true };
    }
    throw e;
  }

  const data = payload.data || payload.payload || payload;
  const shopId = data.shopId || data.metadata?.shopId || data.externalId;
  const providerSubscriptionId =
    data.subscriptionId || data.providerSubscriptionId || data.id || null;

  if (shopId) {
    if (type === 'subscription.completed' || type === 'subscription.renewed') {
      await Subscription.findOneAndUpdate(
        { shopId },
        {
          $set: {
            status: 'active',
            provider: 'AbacatePay',
            providerSubscriptionId,
            currentPeriodEnd:
              data.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            trialEndsAt: null,
          },
        },
        { upsert: true }
      );
    } else if (type === 'subscription.cancelled') {
      await Subscription.findOneAndUpdate(
        { shopId },
        { $set: { status: 'canceled', providerSubscriptionId } }
      );
    }
  }

  return { ok: true, duplicate: false };
}

module.exports = {
  getSubscription,
  listProducts,
  createCheckoutSession,
  completeCheckoutDev,
  verifyWebhookSecret,
  handleAbacateWebhook,
  PRODUCTS,
};
