/**
 * Official WhatsApp (Meta Cloud API), Worqera as Tech Provider.
 *
 * Everything here is inert until the Meta env is set (see docs/ops/ia-e-whatsapp-setup.md):
 * without it, the shop sees "em breve" and the app keeps using wa.me.
 */

const crypto = require('crypto');
const mongoose = require('mongoose');
const Shop = require('../models/Shop');
const Client = require('../models/Client');
const Quote = require('../models/Quote');
const Subscription = require('../models/Subscription');
const WhatsAppMessage = require('../models/WhatsAppMessage');
const { isBusinessPlan, saoPauloMonthStart } = require('../lib/planCap');
const pricing = require('../lib/whatsappPricing');
const { toWhatsAppE164Digits } = require('./whatsappSuggest');

const GRAPH = 'https://graph.facebook.com';

function graphVersion() {
  return process.env.META_GRAPH_VERSION || 'v23.0';
}

function metaEnv() {
  return {
    appId: process.env.META_APP_ID || '',
    appSecret: process.env.META_APP_SECRET || '',
    configId: process.env.META_WA_CONFIG_ID || '',
    verifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN || '',
  };
}

/** True when Worqera's Meta app is set up. Off = the whole feature stays dormant. */
function cloudConfigured() {
  const env = metaEnv();
  return Boolean(env.appId && env.appSecret && env.configId);
}

function fail(status, message, code = 'VALIDATION_ERROR') {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

function tokenKey() {
  const raw = process.env.WHATSAPP_TOKEN_KEY || process.env.META_APP_SECRET || '';
  return crypto.createHash('sha256').update(raw).digest();
}

function encrypt(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', tokenKey(), iv);
  const data = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64')).join('.');
}

function decrypt(packed) {
  const [iv, tag, data] = String(packed || '').split('.').map((p) => Buffer.from(p, 'base64'));
  if (!iv || !tag || !data) return '';
  const decipher = crypto.createDecipheriv('aes-256-gcm', tokenKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

async function graph(path, { method = 'GET', token, body, query } = {}) {
  const qs = query ? `?${new URLSearchParams(query)}` : '';
  const res = await fetch(`${GRAPH}/${graphVersion()}/${path}${qs}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = fail(res.status >= 500 ? 502 : 400, data?.error?.message || `Meta HTTP ${res.status}`, 'META_ERROR');
    err.meta = data?.error || null;
    throw err;
  }
  return data;
}

const TEMPLATES = [
  {
    name: 'pedido_recebido',
    category: 'UTILITY',
    text: 'Olá {{1}}, recebemos seu pedido {{2}} na {{3}}. Acompanhe o andamento por aqui: {{4}}',
    example: ['Ana', '0042', 'Sapataria Paulista', 'https://worqera.com/p/o/abc123'],
  },
  {
    name: 'pedido_pronto',
    category: 'UTILITY',
    text: 'Olá {{1}}, seu pedido {{2}} está pronto para retirada na {{3}}. Detalhes e avaliação: {{4}}',
    example: ['Ana', '0042', 'Sapataria Paulista', 'https://worqera.com/p/o/abc123'],
  },
  {
    name: 'orcamento_retomar',
    category: 'MARKETING',
    text:
      'Olá {{1}}, aqui é da {{2}}. Ainda dá para fechar o seu orçamento de {{3}}. Quer que a gente reserve um lugar na fila? É só responder esta mensagem.',
    example: ['Ana', 'Sapataria Paulista', 'pintura no Nike Air Force'],
  },
];

function monthKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).format(date);
}

function previousMonthRange(now = new Date()) {
  const start = saoPauloMonthStart(now);
  const prevStart = saoPauloMonthStart(new Date(start.getTime() - 24 * 60 * 60 * 1000));
  return { prevStart, prevEnd: start, prevKey: monthKey(prevStart) };
}

async function monthCounts(shopId, from, to) {
  const rows = await WhatsAppMessage.aggregate([
    {
      $match: {
        shopId: new mongoose.Types.ObjectId(String(shopId)),
        direction: 'out',
        status: { $in: ['sent', 'delivered', 'read'] },
        createdAt: { $gte: from, ...(to ? { $lt: to } : {}) },
      },
    },
    { $group: { _id: '$category', n: { $sum: 1 } } },
  ]);
  const counts = { utility: 0, marketing: 0, service: 0 };
  for (const r of rows) counts[r._id] = r.n;
  return counts;
}

/** Closes the previous month lazily: records its overage the first time we look after it ends. */
async function closePreviousMonth(shop) {
  const wa = shop.whatsappCloud || {};
  const { prevStart, prevEnd, prevKey } = previousMonthRange();
  if (wa.overage?.month === prevKey || !wa.connectedAt || new Date(wa.connectedAt) >= prevEnd) return wa.overage || null;
  const counts = await monthCounts(shop._id, prevStart, prevEnd);
  const summary = pricing.summarizeUsage(counts);
  const overage = {
    month: prevKey,
    amountBrl: summary.overageBrl,
    since: summary.overageBrl > 0 ? prevEnd : null,
    paidAt: summary.overageBrl > 0 ? null : prevEnd,
  };
  await Shop.updateOne({ _id: shop._id }, { $set: { 'whatsappCloud.overage': overage } });
  return overage;
}

function overageBlocked(overage, now = new Date()) {
  if (!overage || !overage.amountBrl || overage.paidAt || !overage.since) return false;
  return now - new Date(overage.since) > pricing.OVERAGE_GRACE_DAYS * 24 * 60 * 60 * 1000;
}

async function usageFor(shop) {
  const counts = await monthCounts(shop._id, saoPauloMonthStart());
  const summary = pricing.summarizeUsage(counts);
  const boosted = shop.whatsappCloud?.capBoostMonth === monthKey();
  if (boosted) {
    summary.cap = { utility: summary.cap.utility * 2, marketing: summary.cap.marketing * 2 };
  }
  return summary;
}

/** Why a business-initiated message cannot go out right now (null = it can). */
async function blockReason(shop, category) {
  if (!cloudConfigured()) return 'not-configured';
  const wa = shop.whatsappCloud || {};
  if (wa.status === 'paused') return 'paused';
  if (wa.status !== 'connected') return 'not-connected';
  if (!wa.paymentOk) return 'payment-pending';
  if (!wa.consentAtCounter) return 'no-consent';
  const sub = await Subscription.findOne({ shopId: shop._id }).select('planCode').lean();
  if (!isBusinessPlan(sub?.planCode)) return 'plan';
  const overage = await closePreviousMonth(shop);
  if (overageBlocked(overage)) return 'overage-unpaid';
  const usage = await usageFor(shop);
  if (category !== 'service' && usage.counts[category] >= usage.cap[category]) return 'cap';
  return null;
}

const REASON_TEXT = {
  'not-configured': 'WhatsApp oficial ainda não está ligado na Worqera',
  'not-connected': 'Conecte o número em Empresa → WhatsApp',
  'payment-pending': 'Aguardando a Worqera ativar o pagamento deste número',
  'no-consent': 'Confirme em Empresa → WhatsApp que a loja pede autorização ao cliente',
  paused: 'Envio pausado pela Worqera',
  plan: 'WhatsApp oficial faz parte do Business',
  'overage-unpaid': 'Envio pausado: excedente do mês passado em aberto',
  cap: 'Teto do mês atingido. Fale com a Worqera para liberar',
  'opt-out': 'Cliente pediu para não receber WhatsApp',
  'no-phone': 'Cliente sem WhatsApp válido',
  'max-followups': 'Esse orçamento já recebeu as 2 retomadas',
};

async function attempt(messageId, shop, payload) {
  const msg = await WhatsAppMessage.findById(messageId);
  if (!msg) return;
  msg.attempts += 1;
  try {
    const token = decrypt(shop.whatsappCloud.tokenEnc);
    const data = await graph(`${shop.whatsappCloud.phoneNumberId}/messages`, {
      method: 'POST',
      token,
      body: payload,
    });
    msg.status = 'sent';
    msg.wamid = data?.messages?.[0]?.id || '';
    msg.error = '';
    await msg.save();
  } catch (err) {
    msg.error = String(err?.message || err).slice(0, 300);
    const retryable = !err?.meta || err.status === 502;
    if (retryable && msg.attempts < 3) {
      await msg.save();
      setTimeout(() => void attempt(messageId, shop, payload), msg.attempts * 5000);
      return;
    }
    msg.status = 'failed';
    await msg.save();
  }
}

/**
 * Queue one template message. Returns the stored message (skipped with a reason when blocked).
 * @param {{ to: string, template: string, category: 'utility'|'marketing', params: string[], orderId?: any, quoteId?: any, clientId?: any, userId?: any }} input
 */
async function sendTemplate(shopId, input) {
  const shop = await Shop.findById(shopId).lean();
  if (!shop) throw fail(404, 'Loja não encontrada', 'NOT_FOUND');
  const base = {
    shopId,
    direction: 'out',
    category: input.category,
    template: input.template,
    orderId: input.orderId || null,
    quoteId: input.quoteId || null,
    clientId: input.clientId || null,
    sentByUserId: input.userId || null,
    text: (input.params || []).join(' | '),
  };

  const to = toWhatsAppE164Digits(input.to);
  let reason = to.length >= 12 ? await blockReason(shop, input.category) : 'no-phone';
  if (!reason && input.clientId) {
    const client = await Client.findOne({ _id: input.clientId, shopId }).select('whatsappOptOut').lean();
    if (client?.whatsappOptOut) reason = 'opt-out';
  }
  if (reason) {
    return WhatsAppMessage.create({ ...base, to, status: 'skipped', reason });
  }

  const msg = await WhatsAppMessage.create({
    ...base,
    to,
    status: 'queued',
    costBrl: pricing.estimateCost(input.category),
  });
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: input.template,
      language: { code: 'pt_BR' },
      components: [
        { type: 'body', parameters: (input.params || []).map((t) => ({ type: 'text', text: String(t || '-').slice(0, 1000) })) },
      ],
    },
  };
  void attempt(msg._id, shop, payload);
  return msg;
}

function publicLink(shop, order) {
  const webBase = String(process.env.PUBLIC_WEB_URL || 'https://worqera.com').replace(/\/$/, '');
  const { buildPublicOrderUrl } = require('../utils/publicOrderToken');
  return buildPublicOrderUrl(webBase, shop.slug, order.code, order.publicToken);
}

function shopLabel(shop) {
  return shop?.branding?.displayName || shop?.name || 'loja';
}

/** Kanban hook: the whole order reached the final sector. */
async function notifyReady(shop, order) {
  if (!cloudConfigured() || !shop?.whatsappCloud?.autoReady) return null;
  let phone = order.clientPhone || '';
  if (order.clientId) {
    const client = await Client.findOne({ _id: order.clientId, shopId: shop._id }).select('phone').lean();
    phone = client?.phone || phone;
  }
  if (!order.publicToken) {
    const { ensureOrderPublicToken } = require('../utils/publicOrderToken');
    await ensureOrderPublicToken(order);
  }
  const first = String(order.clientName || '').trim().split(/\s+/)[0] || 'cliente';
  return sendTemplate(shop._id, {
    to: phone,
    template: 'pedido_pronto',
    category: 'utility',
    params: [first, String(order.code || ''), shopLabel(shop), `${publicLink(shop, order)}#avaliar`],
    orderId: order._id,
    clientId: order.clientId || null,
  });
}

function notifyReadySafe(shop, order) {
  notifyReady(shop, order).catch((err) => console.warn('[whatsapp] ready failed', err?.message || err));
}

/** Orçamentos → "Retomar pelo WhatsApp" (marketing template, max 2 per quote). */
async function sendQuoteFollowUp(shopId, quoteId, userId) {
  const quote = await Quote.findOne({ _id: quoteId, shopId });
  if (!quote) throw fail(404, 'Orçamento não encontrado', 'NOT_FOUND');
  const sent = await WhatsAppMessage.countDocuments({
    shopId,
    quoteId: quote._id,
    category: 'marketing',
    status: { $in: ['queued', 'sent', 'delivered', 'read'] },
  });
  if (sent >= pricing.MAX_FOLLOWUPS_PER_QUOTE) {
    return { ok: false, reason: 'max-followups', message: REASON_TEXT['max-followups'] };
  }
  const shop = await Shop.findById(shopId).select('name branding').lean();
  const first = String(quote.name || '').trim().split(/\s+/)[0] || 'cliente';
  const msg = await sendTemplate(shopId, {
    to: quote.phone,
    template: 'orcamento_retomar',
    category: 'marketing',
    params: [first, shopLabel(shop), quote.what || 'seu pedido'],
    quoteId: quote._id,
    clientId: quote.clientId || null,
    userId,
  });
  if (msg.status === 'skipped') {
    return { ok: false, reason: msg.reason, message: REASON_TEXT[msg.reason] || 'Não enviou' };
  }
  const now = new Date();
  quote.contactCount = (Number(quote.contactCount) || 0) + 1;
  quote.lastContactAt = now;
  if (quote.stage === 'new') quote.stage = 'contact';
  quote.activity.push({ kind: 'whatsapp', text: 'Retomada enviada pelo WhatsApp oficial', stage: quote.stage, byUserId: userId || null, at: now });
  await quote.save();
  return { ok: true, messageId: String(msg._id), followUpsLeft: pricing.MAX_FOLLOWUPS_PER_QUOTE - sent - 1 };
}

/** Cheap check for the UI: show "Retomar pelo WhatsApp oficial" instead of wa.me. */
async function officialReady(shopId) {
  if (!cloudConfigured()) return false;
  const shop = await Shop.findById(shopId).select('whatsappCloud.status whatsappCloud.paymentOk whatsappCloud.consentAtCounter').lean();
  const wa = shop?.whatsappCloud || {};
  return wa.status === 'connected' && Boolean(wa.paymentOk) && Boolean(wa.consentAtCounter);
}

/** What the shop (and the app) need to render the WhatsApp settings. */
async function statusFor(shopId, { business = false } = {}) {
  const shop = await Shop.findById(shopId).lean();
  if (!shop) throw fail(404, 'Loja não encontrada', 'NOT_FOUND');
  const wa = shop.whatsappCloud || {};
  const configured = cloudConfigured();
  const env = metaEnv();
  const overage = wa.status && wa.status !== 'off' ? await closePreviousMonth(shop) : null;
  const usage = wa.status === 'connected' || wa.status === 'paused' ? await usageFor(shop) : null;
  const reason = configured && wa.status === 'connected' ? await blockReason(shop, 'utility') : null;
  return {
    configured,
    business,
    status: wa.status || 'off',
    displayPhone: wa.displayPhone || '',
    verifiedName: wa.verifiedName || '',
    paymentOk: Boolean(wa.paymentOk),
    pausedReason: wa.pausedReason || '',
    autoReady: Boolean(wa.autoReady),
    consentAtCounter: Boolean(wa.consentAtCounter),
    canSend: configured && !reason,
    blockedReason: reason,
    blockedText: reason ? REASON_TEXT[reason] || reason : '',
    usage,
    overage: overage && overage.amountBrl > 0 ? overage : null,
    rates: pricing.META_RATE_BRL,
    overagePrices: pricing.OVERAGE_BRL,
    signup: configured ? { appId: env.appId, configId: env.configId, graphVersion: graphVersion() } : null,
  };
}

/**
 * Finish Embedded Signup: the web sends the `code` from FB.login and the
 * waba/phone ids from the WA_EMBEDDED_SIGNUP message event.
 */
async function connectShop(shopId, { code, wabaId, phoneNumberId, coexistence = false } = {}) {
  if (!cloudConfigured()) throw fail(400, REASON_TEXT['not-configured'], 'NOT_CONFIGURED');
  if (!code || !wabaId || !phoneNumberId) throw fail(400, 'Faltou concluir o cadastro na Meta');
  const env = metaEnv();
  const tokenRes = await graph('oauth/access_token', {
    query: { client_id: env.appId, client_secret: env.appSecret, code },
  });
  const token = tokenRes.access_token;
  if (!token) throw fail(502, 'A Meta não devolveu o acesso', 'META_ERROR');

  const phone = await graph(String(phoneNumberId), {
    token,
    query: { fields: 'display_phone_number,verified_name' },
  }).catch(() => ({}));

  if (!coexistence) {
    const pin = String(crypto.randomInt(100000, 999999));
    await graph(`${phoneNumberId}/register`, {
      method: 'POST',
      token,
      body: { messaging_product: 'whatsapp', pin },
    }).catch((err) => console.warn('[whatsapp] register', err?.message));
  }
  await graph(`${wabaId}/subscribed_apps`, { method: 'POST', token }).catch((err) =>
    console.warn('[whatsapp] subscribe', err?.message)
  );

  const templates = [];
  for (const t of TEMPLATES) {
    try {
      const created = await graph(`${wabaId}/message_templates`, {
        method: 'POST',
        token,
        body: {
          name: t.name,
          language: 'pt_BR',
          category: t.category,
          components: [{ type: 'BODY', text: t.text, example: { body_text: [t.example] } }],
        },
      });
      templates.push({ name: t.name, status: created.status || 'PENDING', id: created.id || '' });
    } catch (err) {
      templates.push({ name: t.name, status: 'EXISTS_OR_ERROR', error: String(err?.message || '').slice(0, 200) });
    }
  }

  await Shop.updateOne(
    { _id: shopId },
    {
      $set: {
        'whatsappCloud.status': 'connected',
        'whatsappCloud.wabaId': String(wabaId),
        'whatsappCloud.phoneNumberId': String(phoneNumberId),
        'whatsappCloud.displayPhone': phone.display_phone_number || '',
        'whatsappCloud.verifiedName': phone.verified_name || '',
        'whatsappCloud.tokenEnc': encrypt(token),
        'whatsappCloud.templates': templates,
        'whatsappCloud.connectedAt': new Date(),
        'whatsappCloud.paymentOk': false,
        'whatsappCloud.pausedReason': '',
      },
    }
  );
  return statusFor(shopId, { business: true });
}

async function updateSettings(shopId, body = {}) {
  const set = {};
  if (typeof body.autoReady === 'boolean') set['whatsappCloud.autoReady'] = body.autoReady;
  if (typeof body.consentAtCounter === 'boolean') set['whatsappCloud.consentAtCounter'] = body.consentAtCounter;
  if (Object.keys(set).length) await Shop.updateOne({ _id: shopId }, { $set: set });
  return statusFor(shopId, { business: true });
}

async function disconnect(shopId) {
  await Shop.updateOne(
    { _id: shopId },
    {
      $set: {
        'whatsappCloud.status': 'off',
        'whatsappCloud.tokenEnc': '',
        'whatsappCloud.autoReady': false,
      },
    }
  );
  return statusFor(shopId, { business: true });
}

/** Worqera admin: card on the WABA, pause/resume, overage paid, double the cap this month. */
async function platformUpdate(shopId, body = {}) {
  const set = {};
  if (typeof body.paymentOk === 'boolean') set['whatsappCloud.paymentOk'] = body.paymentOk;
  if (typeof body.paused === 'boolean') {
    const shop = await Shop.findById(shopId).select('whatsappCloud.status whatsappCloud.tokenEnc').lean();
    const hasNumber = Boolean(shop?.whatsappCloud?.tokenEnc);
    set['whatsappCloud.status'] = body.paused ? 'paused' : hasNumber ? 'connected' : 'off';
    set['whatsappCloud.pausedReason'] = body.paused ? String(body.pausedReason || 'Pausado pela Worqera') : '';
  }
  if (body.overagePaid === true) set['whatsappCloud.overage.paidAt'] = new Date();
  if (body.capBoost === true) set['whatsappCloud.capBoostMonth'] = monthKey();
  if (Object.keys(set).length) await Shop.updateOne({ _id: shopId }, { $set: set });
  return statusFor(shopId, { business: true });
}

/** Ops view: this month per connected shop. */
async function platformOverview() {
  const shops = await Shop.find({ 'whatsappCloud.status': { $in: ['connected', 'paused', 'pending'] } })
    .select('name whatsappCloud')
    .lean();
  const rows = [];
  for (const shop of shops) {
    const usage = await usageFor(shop);
    rows.push({
      shopId: String(shop._id),
      name: shop.name,
      status: shop.whatsappCloud.status,
      paymentOk: Boolean(shop.whatsappCloud.paymentOk),
      displayPhone: shop.whatsappCloud.displayPhone || '',
      metaCostBrl: usage.metaCostBrl,
      overageBrl: usage.overageBrl,
      counts: usage.counts,
      overageDue:
        shop.whatsappCloud.overage?.amountBrl > 0 && !shop.whatsappCloud.overage?.paidAt
          ? shop.whatsappCloud.overage
          : null,
    });
  }
  return { configured: cloudConfigured(), shops: rows };
}

// ---------------------------------------------------------------- webhook

function verifySignature(rawBody, header) {
  const secret = metaEnv().appSecret;
  if (!secret || !header) return false;
  const expected = `sha256=${crypto.createHmac('sha256', secret).update(rawBody || '').digest('hex')}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(String(header));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const STOP_WORDS = new Set(['parar', 'pare', 'sair', 'stop', 'cancelar', 'descadastrar']);

async function handleInbound(shop, msg, contactName) {
  const from = String(msg.from || '');
  const text = String(msg.text?.body || msg.button?.text || msg.interactive?.button_reply?.title || '').trim();
  const tail = from.slice(-8);
  await WhatsAppMessage.create({
    shopId: shop._id,
    direction: 'in',
    from,
    category: 'service',
    status: 'received',
    text: text || `[${msg.type || 'mensagem'}]`,
    wamid: msg.id || '',
  });

  const clients = await Client.find({ shopId: shop._id, phone: { $ne: null } }).select('phone').limit(2000).lean();
  const client = clients.find((c) => String(c.phone || '').replace(/\D/g, '').endsWith(tail));
  if (client && STOP_WORDS.has(text.toLowerCase())) {
    await Client.updateOne({ _id: client._id }, { $set: { whatsappOptOut: true } });
  }

  const quotes = await Quote.find({ shopId: shop._id, stage: { $in: ['new', 'contact', 'followup'] } })
    .sort({ updatedAt: -1 })
    .limit(300);
  const quote = quotes.find((q) => String(q.phone || '').replace(/\D/g, '').endsWith(tail));
  if (quote) {
    quote.activity.push({
      kind: 'reply',
      text: `${contactName || 'Cliente'} respondeu no WhatsApp: "${text.slice(0, 280) || 'mídia'}"`,
      stage: quote.stage,
      at: new Date(),
    });
    if (quote.stage === 'new') quote.stage = 'contact';
    quote.lastContactAt = new Date();
    await quote.save();
  }
}

const ACCOUNT_STOP = new Set(['PARTNER_REMOVED', 'ACCOUNT_DELETED', 'DISABLED_UPDATE', 'ACCOUNT_RESTRICTION']);

async function handleWebhook(body) {
  for (const entry of body?.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      if (change.field === 'account_update' && ACCOUNT_STOP.has(String(value.event || ''))) {
        await Shop.updateOne(
          { 'whatsappCloud.wabaId': String(entry.id || '') },
          {
            $set: {
              'whatsappCloud.status': 'paused',
              'whatsappCloud.pausedReason': `Meta: ${value.event}`,
            },
          }
        );
        continue;
      }
      const phoneId = value.metadata?.phone_number_id;
      if (!phoneId) continue;
      for (const st of value.statuses || []) {
        const update = { status: st.status };
        if (st.errors?.length) update.error = String(st.errors[0]?.title || st.errors[0]?.message || '').slice(0, 300);
        await WhatsAppMessage.updateOne({ wamid: st.id }, { $set: update });
      }
      if (value.messages?.length) {
        const shop = await Shop.findOne({ 'whatsappCloud.phoneNumberId': String(phoneId) }).lean();
        if (!shop) continue;
        const contactName = value.contacts?.[0]?.profile?.name || '';
        for (const msg of value.messages) await handleInbound(shop, msg, contactName);
      }
    }
  }
}

module.exports = {
  cloudConfigured,
  officialReady,
  statusFor,
  connectShop,
  updateSettings,
  disconnect,
  platformUpdate,
  platformOverview,
  sendTemplate,
  sendQuoteFollowUp,
  notifyReady,
  notifyReadySafe,
  verifySignature,
  handleWebhook,
  encrypt,
  decrypt,
  blockReason,
  overageBlocked,
  REASON_TEXT,
  TEMPLATES,
  metaEnv,
};
