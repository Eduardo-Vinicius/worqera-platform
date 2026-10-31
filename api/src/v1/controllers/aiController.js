const Order = require('../models/Order');
const aiFeatures = require('../services/aiFeatures');
const { serializeOrder } = require('../serializers');
const { planHas } = require('../lib/planCap');
const { wrap } = require('./helpers');

const { quotaFor, aiConfigured } = require('../services/aiService');

function aiAllowed(req) {
  return planHas(req.subscription, 'ai');
}

/** The shop's AI quota, or null without a plan. Sent with every AI answer so the UI can say "limite do mês". */
async function quotaOf(req) {
  if (!aiAllowed(req)) return null;
  return quotaFor(req.shopId);
}

exports.quota = wrap(async (req, res) => {
  res.status(200).json({
    business: aiAllowed(req),
    configured: aiConfigured(),
    quota: await quotaOf(req),
  });
});

exports.brief = wrap(async (req, res) => {
  const refresh = req.query.refresh === '1' || req.query.refresh === 'true';
  const audience = aiFeatures.briefAudience(req.membership);
  const brief = await aiFeatures.dailyBrief(req.shopId, {
    aiAllowed: aiAllowed(req),
    refresh,
    audience,
    sectorIds: req.membership?.sectorIds || [],
  });
  // AI usage counters are a management number: only owner/admin get them.
  const quota = audience === 'owner' ? await quotaOf(req) : null;
  res.status(200).json({ brief, business: aiAllowed(req), aiQuota: quota });
});

exports.insights = wrap(async (req, res) => {
  if (!planHas(req.subscription, 'weekly')) {
    return res.status(200).json({ locked: true, insights: null });
  }
  const refresh = req.query.refresh === '1' || req.query.refresh === 'true';
  const insights = await aiFeatures.weeklyInsights(req.shopId, { aiAllowed: true, refresh });
  return res.status(200).json({ locked: false, insights, aiQuota: await quotaOf(req) });
});

/** Body `{ text }` saves the team's own wording; no body asks the AI (Business). */
exports.customerSummary = wrap(async (req, res) => {
  const text = typeof req.body?.text === 'string' ? req.body.text.trim().slice(0, 500) : null;
  if (text !== null) {
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, shopId: req.shopId },
      { $set: { customerSummary: { text, ai: false, edited: true, at: new Date() } } },
      { new: true }
    ).lean();
    if (!order) {
      return res.status(404).json({ title: 'Not Found', detail: 'Order not found', code: 'NOT_FOUND' });
    }
    return res.status(200).json({ customerSummary: serializeOrder(order).customerSummary });
  }
  if (!aiAllowed(req)) {
    return res.status(403).json({
      title: 'Forbidden',
      detail: 'Resumo com IA faz parte do Business',
      code: 'PLAN_REQUIRED',
    });
  }
  const summary = await aiFeatures.generateCustomerSummary(req.shopId, req.params.id, {
    aiAllowed: true,
    force: true,
  });
  return res.status(200).json({ customerSummary: summary, ai: Boolean(summary), aiQuota: await quotaOf(req) });
});

exports.reviewReply = wrap(async (req, res) => {
  const result = await aiFeatures.suggestReviewReply(req.shopId, req.params.id, {
    aiAllowed: aiAllowed(req),
  });
  res.status(200).json({ ...result, aiQuota: await quotaOf(req) });
});

/**
 * Worqera admin: `{ extraCalls }` adds uses for the current month only;
 * `{ monthlyCap }` changes the shop's fixed monthly limit (null = plan default).
 */
exports.platformQuota = wrap(async (req, res) => {
  const Shop = require('../models/Shop');
  const { monthKey } = require('../services/aiService');
  const shop = await Shop.findById(req.params.id).select('aiQuota').lean();
  if (!shop) {
    return res.status(404).json({ title: 'Not Found', detail: 'Shop not found', code: 'NOT_FOUND' });
  }
  const set = {};
  const extra = Math.trunc(Number(req.body?.extraCalls));
  if (Number.isFinite(extra) && extra > 0) {
    const month = monthKey();
    const current = shop.aiQuota?.extraMonth === month ? Number(shop.aiQuota?.extraCalls) || 0 : 0;
    set['aiQuota.extraMonth'] = month;
    set['aiQuota.extraCalls'] = Math.min(current + extra, 100000);
  }
  if (req.body && 'monthlyCap' in req.body) {
    const cap = Math.trunc(Number(req.body.monthlyCap));
    set['aiQuota.monthlyCap'] = Number.isFinite(cap) && cap > 0 ? Math.min(cap, 100000) : null;
  }
  if (Object.keys(set).length) await Shop.updateOne({ _id: req.params.id }, { $set: set });
  return res.status(200).json({ quota: await quotaFor(req.params.id) });
});

exports.receivables = wrap(async (req, res) => {
  const refresh = req.query.refresh === '1' || req.query.refresh === 'true';
  const insight = await require('../services/aiInsights').receivablesInsight(req.shopId, {
    aiAllowed: aiAllowed(req),
    refresh,
  });
  res.status(200).json({ receivables: insight, business: aiAllowed(req), aiQuota: await quotaOf(req) });
});

exports.clientInsight = wrap(async (req, res) => {
  const insight = await require('../services/aiInsights').clientInsight(req.shopId, req.params.id, {
    aiAllowed: aiAllowed(req),
  });
  res.status(200).json({ insight, business: aiAllowed(req), aiQuota: await quotaOf(req) });
});

exports.improveMessage = wrap(async (req, res) => {
  const result = await require('../services/aiInsights').improveClientMessage(req.shopId, req.params.id, {
    text: req.body?.text,
    aiAllowed: aiAllowed(req),
  });
  res.status(200).json({ ...result, aiQuota: await quotaOf(req) });
});

exports.aiAllowed = aiAllowed;
exports.quotaOf = quotaOf;
