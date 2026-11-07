/**
 * CRM → Feedback: customers with recently delivered orders, where each one is in
 * the review journey (ask → answered → Google) and the WhatsApp message for the next step.
 */
const Order = require('../models/Order');
const Client = require('../models/Client');
const Shop = require('../models/Shop');
const { buildWaMeUrl } = require('./whatsappSuggest');
const { buildPublicOrderUrl, ensureOrderPublicToken } = require('../utils/publicOrderToken');

const DAY = 24 * 60 * 60 * 1000;
/** Asked and no answer after this many days: send a reminder (once). */
const REMIND_AFTER_DAYS = 2;
const STEPS = ['ask', 'remind', 'waiting', 'google', 'recover', 'done'];

function firstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || '';
}

function webBase() {
  return String(process.env.PUBLIC_WEB_URL || process.env.WORQERA_PublicWebUrl || 'https://worqera.com').replace(/\/+$/, '');
}

function isImported(order) {
  const list = (order.items || []).flatMap((it) => it.services || []).concat(order.services || []);
  return list.some((s) => String(s?.id || '') === 'import');
}

/**
 * Next step for one delivered order:
 * ask (never asked) → remind (asked 2+ days ago, once) → waiting → google (4–5, link set, not tapped)
 * → recover (1–3) → done.
 */
function nextStep(order, { now = new Date(), hasReviewUrl = false } = {}) {
  const score = Number(order.feedback?.score) || 0;
  if (score) {
    if (score <= 3) return order.reviewAsk?.recoverAt ? 'done' : 'recover';
    if (hasReviewUrl && !order.googleReviewAt) return 'google';
    return 'done';
  }
  const askedAt = order.reviewAsk?.at ? new Date(order.reviewAsk.at) : null;
  if (!askedAt) return 'ask';
  const count = Number(order.reviewAsk?.count) || 0;
  if (count < 2 && (now - askedAt) / DAY >= REMIND_AFTER_DAYS) return 'remind';
  return 'waiting';
}

function messageFor(step, { name, shop, code, link, reviewUrl, score }) {
  const hi = firstName(name) ? `Oi, ${firstName(name)}!` : 'Oi!';
  if (step === 'ask') {
    return `${hi} Aqui é da ${shop}. Seu pedido #${code} foi entregue. Como foi? Sua avaliação leva 10 segundos e ajuda muito a gente: ${link}#avaliar`;
  }
  if (step === 'remind') {
    return `${hi} Aqui é da ${shop} de novo. Conseguiu dar uma olhada no pedido #${code}? Se puder, conta pra gente como foi: ${link}#avaliar Obrigado!`;
  }
  if (step === 'google') {
    return `${hi} Muito obrigado pela nota ${score}! Se puder deixar sua avaliação no Google, ajuda demais a ${shop} a ser encontrada: ${reviewUrl}`;
  }
  if (step === 'recover') {
    return `${hi} Aqui é da ${shop}. Vimos sua avaliação do pedido #${code} e queremos resolver. Pode contar o que aconteceu? Vamos dar um jeito.`;
  }
  return null;
}

async function feedbackList(shopId, { days = 30, step = 'all', now = new Date() } = {}) {
  const span = [7, 15, 30, 60, 90].includes(Number(days)) ? Number(days) : 30;
  const since = new Date(now.getTime() - span * DAY);
  const [shop, orders] = await Promise.all([
    Shop.findById(shopId).select('name slug branding').lean(),
    Order.find({ shopId, deletedAt: null, status: 'delivered', deliveredAt: { $gte: since } })
      .select('code clientId clientName clientPhone deliveredAt publicToken feedback reviewAsk googleReviewAt items.shoeModel items.brand items.services.id services.id shoeModel')
      .sort({ deliveredAt: -1 })
      .limit(500)
      .lean(),
  ]);
  const shopName = shop?.branding?.displayName || shop?.name || 'loja';
  const reviewUrl = /^https:\/\//i.test(String(shop?.branding?.reviewUrl || '')) ? shop.branding.reviewUrl : '';
  const real = orders.filter((o) => !isImported(o));
  const clientIds = [...new Set(real.map((o) => o.clientId && String(o.clientId)).filter(Boolean))];
  const optOut = new Set(
    clientIds.length
      ? (await Client.find({ shopId, _id: { $in: clientIds }, whatsappOptOut: true }).select('_id').lean()).map((c) => String(c._id))
      : []
  );

  const counts = { ask: 0, remind: 0, waiting: 0, google: 0, recover: 0, done: 0 };
  let answered = 0;
  let scoreSum = 0;
  let promoters = 0;
  let critics = 0;
  let googleOffered = 0;
  let googleClicked = 0;
  let asked = 0;
  const rows = [];
  for (const o of real) {
    const st = nextStep(o, { now, hasReviewUrl: Boolean(reviewUrl) });
    counts[st] += 1;
    const score = Number(o.feedback?.score) || 0;
    if (o.reviewAsk?.at) asked += 1;
    if (score) {
      answered += 1;
      scoreSum += score;
      if (score >= 4) promoters += 1;
      if (score <= 3) critics += 1;
      if (score >= 4 && reviewUrl) googleOffered += 1;
    }
    if (o.googleReviewAt) googleClicked += 1;
    if (step !== 'all' && step !== st) continue;
    if (!o.publicToken) await ensureOrderPublicToken(o);
    const link = buildPublicOrderUrl(webBase(), shop?.slug, o.code, o.publicToken);
    const text = messageFor(st, { name: o.clientName, shop: shopName, code: o.code, link, reviewUrl, score });
    const canWa = text && o.clientPhone && !(o.clientId && optOut.has(String(o.clientId)));
    rows.push({
      orderId: String(o._id),
      code: o.code,
      clientId: o.clientId ? String(o.clientId) : null,
      clientName: o.clientName || '',
      phone: o.clientPhone || '',
      what:
        (o.items || [])
          .map((it) => [it.brand, it.shoeModel].filter(Boolean).join(' '))
          .filter(Boolean)
          .slice(0, 2)
          .join(', ') || o.shoeModel || '',
      deliveredAt: o.deliveredAt,
      daysSince: Math.floor((now - new Date(o.deliveredAt)) / DAY),
      step: st,
      score: score || null,
      comment: o.feedback?.comment || '',
      tags: o.feedback?.tags || [],
      askedAt: o.reviewAsk?.at || null,
      askCount: Number(o.reviewAsk?.count) || 0,
      askedBy: o.reviewAsk?.byName || '',
      googleAt: o.googleReviewAt || null,
      googleAskAt: o.reviewAsk?.googleAskAt || null,
      recoverAt: o.reviewAsk?.recoverAt || null,
      link,
      whatsapp: canWa ? { text, url: buildWaMeUrl(o.clientPhone, text) } : null,
    });
  }
  const order = { recover: 0, ask: 1, remind: 2, google: 3, waiting: 4, done: 5 };
  rows.sort((a, b) => order[a.step] - order[b.step] || new Date(b.deliveredAt) - new Date(a.deliveredAt));
  return {
    days: span,
    step: STEPS.includes(step) ? step : 'all',
    reviewUrlSet: Boolean(reviewUrl),
    summary: {
      delivered: real.length,
      asked,
      answered,
      responseRate: real.length ? Math.round((answered / real.length) * 100) : 0,
      avgScore: answered ? Math.round((scoreSum / answered) * 10) / 10 : null,
      promoters,
      critics,
      googleOffered,
      googleClicked,
      counts,
    },
    items: rows,
  };
}

/** The shop sent the rating / Google / recovery message (counts as one ask). */
async function markAsked(shopId, orderId, { byName = '', channel = 'whatsapp', step = 'ask' } = {}) {
  const order = await Order.findOne({ _id: orderId, shopId, deletedAt: null });
  if (!order) {
    const err = new Error('Order not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  const now = new Date();
  order.reviewAsk = order.reviewAsk || {};
  if (step === 'recover') {
    order.reviewAsk.recoverAt = now;
  } else if (step === 'google') {
    order.reviewAsk.googleAskAt = now;
  } else {
    order.reviewAsk.at = now;
    order.reviewAsk.count = (Number(order.reviewAsk.count) || 0) + 1;
  }
  order.reviewAsk.byName = String(byName || '').slice(0, 80);
  order.reviewAsk.channel = ['whatsapp', 'email', 'counter'].includes(channel) ? channel : 'whatsapp';
  order.markModified('reviewAsk');
  await order.save();
  return { ok: true, reviewAsk: order.reviewAsk };
}

/** Public page: the customer tapped "Avaliar no Google". */
async function markGoogleClick(token) {
  const t = String(token || '').trim();
  if (!t) return { ok: false };
  await Order.updateOne({ publicToken: t, googleReviewAt: null, 'feedback.score': { $gte: 4 } }, { $set: { googleReviewAt: new Date() } });
  return { ok: true };
}

module.exports = { feedbackList, markAsked, markGoogleClick, nextStep, messageFor, REMIND_AFTER_DAYS };
