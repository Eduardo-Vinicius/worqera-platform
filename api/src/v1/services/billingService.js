const crypto = require('crypto');
const Subscription = require('../models/Subscription');
const WebhookEvent = require('../models/WebhookEvent');

const PRODUCTS = [
  {
    code: 'WORQERA_BASIC',
    name: 'Worqera Basic',
    description: 'Operação: kanban, pedidos, consulta e TVs (sem financeiro)',
    priceCents: 14700,
    currency: 'BRL',
    interval: 'month',
  },
  {
    code: 'WORQERA_PRO',
    name: 'Worqera Pro',
    description: 'Fila + caixa: financeiro, métricas, TV Financeiro, digest e branding',
    priceCents: 29700,
    currency: 'BRL',
    interval: 'month',
  },
  {
    code: 'WORQERA_BUSINESS',
    name: 'Worqera Business',
    description: 'Tudo do Pro + onboarding, carga de dados e acompanhamento Worqera',
    priceCents: 49900,
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

/** Official AbacatePay webhook HMAC public key (docs). Override via env if rotated. */
const ABACATE_PUBLIC_KEY =
  process.env.WORQERA_AbacatePay__PublicKey ||
  't9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9';

const API_BASE =
  process.env.WORQERA_AbacatePay__ApiBaseUrl || 'https://api.abacatepay.com/v1';

async function getSubscription(shopId) {
  return Subscription.findOne({ shopId }).lean();
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

function abacateEnabled() {
  const flag = process.env.WORQERA_AbacatePay__Enabled;
  if (flag != null && flag !== '') {
    return ['1', 'true', 'yes', 'on'].includes(String(flag).toLowerCase());
  }
  // Default: on only when keys present (legacy); prod example sets Enabled=false
  return true;
}

async function createCheckoutSession(shopId, { planCode, successUrl, cancelUrl } = {}) {
  const plan = PRODUCTS.find((p) => p.code === (planCode || 'WORQERA_PRO')) || PRODUCTS[0];
  const apiKey = process.env.WORQERA_AbacatePay__ApiKey || process.env.ABACATEPAY_API_KEY || '';
  const productId =
    process.env.WORQERA_AbacatePay__ProductId || process.env.ABACATEPAY_PRODUCT_ID || '';

  if (!abacateEnabled() || (!apiKey && process.env.NODE_ENV === 'production')) {
    return {
      id: `manual_${shopId}`,
      url: null,
      planCode: plan.code,
      successUrl: successUrl || null,
      cancelUrl: cancelUrl || null,
      provider: 'manual',
      configured: false,
      mock: false,
      message:
        'Pagamento online desligado. Fale com a Worqera para ativar ou estender o trial.',
    };
  }

  // Production: real AbacatePay subscription checkout
  if (apiKey && productId) {
    const body = {
      items: [{ id: productId, quantity: 1 }],
      methods: ['PIX', 'CARD'],
      externalId: String(shopId),
      metadata: { shopId: String(shopId), planCode: plan.code },
      returnUrl: cancelUrl || undefined,
      completionUrl: successUrl || undefined,
    };

    const res = await fetch(`${API_BASE}/subscriptions/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(
        payload?.error || payload?.message || payload?.detail || 'AbacatePay checkout failed'
      );
      err.status = res.status >= 400 && res.status < 600 ? res.status : 502;
      err.code = 'BILLING_PROVIDER_ERROR';
      throw err;
    }
    const data = payload.data || payload;
    const url = data.url || data.checkout?.url || data.paymentUrl;
    const id = data.id || data.checkout?.id || `abct_${shopId}_${Date.now()}`;
    if (!url) {
      const err = new Error('AbacatePay did not return checkout URL');
      err.status = 502;
      err.code = 'BILLING_PROVIDER_ERROR';
      throw err;
    }
    return {
      id: String(id),
      url: String(url),
      planCode: plan.code,
      successUrl: successUrl || null,
      cancelUrl: cancelUrl || null,
      provider: 'AbacatePay',
      mock: false,
    };
  }

  // Dev / stub path
  const base =
    process.env.WORQERA_AbacatePay__CheckoutBaseUrl ||
    'https://pay.abacatepay.com/checkout';
  const sessionId = `dev_${shopId}_${Date.now()}`;
  const params = new URLSearchParams({
    session: sessionId,
    plan: plan.code,
    shop: String(shopId),
  });
  if (successUrl) params.set('successUrl', successUrl);
  if (cancelUrl) params.set('cancelUrl', cancelUrl);

  return {
    id: sessionId,
    url: `${base}?${params.toString()}`,
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

  await notifyBillingActivated(shopId, sub).catch(() => {});
  return sub;
}

async function notifyBillingActivated(shopId, sub) {
  try {
    const Shop = require('../models/Shop');
    const Membership = require('../models/Membership');
    const User = require('../models/User');
    const { sendMail } = require('./mailer');
    const shop = await Shop.findById(shopId).lean();
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
        text: `Olá ${u.name || ''},\n\nSua assinatura Worqera Pro está ativa.\nStatus: ${sub?.status}\nPlano: ${sub?.planCode || 'WORQERA_PRO'}\n`,
        html: `<p>Assinatura <strong>ativa</strong> para <strong>${shop?.name || 'sua oficina'}</strong>.</p><p>Plano: ${sub?.planCode || 'WORQERA_PRO'}</p>`,
      });
    }
  } catch (err) {
    console.error('[billing] receipt email failed', err.message);
  }
}

function verifyWebhookSecret(querySecret) {
  const expected = process.env.WORQERA_AbacatePay__WebhookSecret || '';
  if (!expected) {
    return process.env.NODE_ENV !== 'production' && process.env.ALLOW_INSECURE_WEBHOOK === '1';
  }
  return timingSafeEqualString(querySecret, expected);
}

/** HMAC-SHA256 over raw body → base64 (AbacatePay docs). */
function verifyWebhookHmac(rawBody, signatureHeader) {
  if (!signatureHeader) return false;
  const provided = String(signatureHeader).replace(/^sha256=/i, '').trim();
  const digestB64 = crypto
    .createHmac('sha256', ABACATE_PUBLIC_KEY)
    .update(Buffer.from(rawBody || '', 'utf8'))
    .digest('base64');
  if (timingSafeEqualString(digestB64, provided)) return true;

  // Dev fallback: HMAC with webhook secret (hex) for local tests
  const secret = process.env.WORQERA_AbacatePay__WebhookSecret || '';
  if (secret && process.env.NODE_ENV !== 'production') {
    const digestHex = crypto.createHmac('sha256', secret).update(rawBody || '').digest('hex');
    if (timingSafeEqualString(digestHex, provided)) return true;
  }
  return false;
}

/**
 * Production: require BOTH query secret and HMAC signature.
 * Development: either mechanism (or ALLOW_INSECURE_WEBHOOK).
 */
function authorizeWebhook({ querySecret, signatureHeader, rawBody }) {
  const isProd = process.env.NODE_ENV === 'production';
  const secretOk = verifyWebhookSecret(querySecret);
  const hmacOk = verifyWebhookHmac(rawBody, signatureHeader);

  if (isProd) {
    return secretOk && hmacOk;
  }
  if (process.env.ALLOW_INSECURE_WEBHOOK === '1') return true;
  return secretOk || hmacOk;
}

function extractShopId(data) {
  return (
    data.shopId ||
    data.metadata?.shopId ||
    data.externalId ||
    data.subscription?.externalId ||
    data.checkout?.externalId ||
    data.checkout?.metadata?.shopId ||
    null
  );
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
  const shopId = extractShopId(data);
  const providerSubscriptionId =
    data.subscription?.id ||
    data.subscriptionId ||
    data.providerSubscriptionId ||
    data.id ||
    null;

  if (shopId) {
    if (
      type === 'subscription.completed' ||
      type === 'subscription.renewed' ||
      type === 'subscription.trial_started'
    ) {
      const status = type === 'subscription.trial_started' ? 'trialing' : 'active';
      const sub = await Subscription.findOneAndUpdate(
        { shopId },
        {
          $set: {
            status,
            provider: 'AbacatePay',
            providerSubscriptionId,
            currentPeriodEnd:
              data.subscription?.nextBillingDate ||
              data.currentPeriodEnd ||
              new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            trialEndsAt: status === 'active' ? null : data.subscription?.trialEndsAt || null,
            planCode: 'WORQERA_PRO',
          },
        },
        { upsert: true, new: true }
      ).lean();
      if (status === 'active') {
        await notifyBillingActivated(shopId, sub).catch(() => {});
      }
    } else if (type === 'subscription.payment_failed') {
      await Subscription.findOneAndUpdate(
        { shopId },
        { $set: { status: 'past_due', providerSubscriptionId } }
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
  verifyWebhookHmac,
  authorizeWebhook,
  handleAbacateWebhook,
  PRODUCTS,
  PLAN_CODES,
  normalizePlanCode,
};
