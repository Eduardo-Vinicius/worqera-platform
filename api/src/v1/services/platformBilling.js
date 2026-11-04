/**
 * Subscriptions for the Worqera team: MRR by plan, how many are in each state, money received
 * in the period (Asaas webhooks) and the list behind `/admin/assinaturas`.
 */
const { range, delta, memo } = require('../lib/periods');

const PAID_EVENTS = ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'];
const PLAN_LABEL = { WORQERA_BASIC: 'Basic', WORQERA_PRO: 'Pro', WORQERA_BUSINESS: 'Business' };

/** What one subscription adds to MRR, in cents (yearly ÷ 12, founder price while it lasts). */
function monthlyCents(sub, billing = require('./billingService')) {
  const code = billing.normalizePlanCode(sub.planCode);
  if (sub.cycle === 'yearly') return (billing.priceCents(code, 'yearly') || 0) / 12;
  return billing.effectivePrice({ ...sub, planCode: code }).priceCents || 0;
}

async function received(from, to) {
  const WebhookEvent = require('../models/WebhookEvent');
  const [row] = await WebhookEvent.aggregate([
    { $match: { provider: 'Asaas', type: { $in: PAID_EVENTS }, processedAt: { $gte: from, $lt: to } } },
    // Card payments send CONFIRMED and later RECEIVED for the same payment: count it once.
    { $group: { _id: { $ifNull: ['$payload.payment.id', '$eventId'] }, value: { $first: { $ifNull: ['$payload.payment.value', 0] } } } },
    { $group: { _id: null, value: { $sum: '$value' }, count: { $sum: 1 } } },
  ]);
  return { value: Math.round((row?.value || 0) * 100) / 100, count: row?.count || 0 };
}

async function summary({ days = 30 } = {}) {
  return memo(`billing:${days}`, 60000, async () => {
    const Subscription = require('../models/Subscription');
    const billing = require('./billingService');
    const p = range(days);
    const now = new Date();
    const [subs, cur, prev] = await Promise.all([
      Subscription.find({ provider: { $ne: 'Dev' } }).select('planCode cycle status founder provider').lean(),
      received(p.from, p.to),
      received(p.prevFrom, p.prevTo),
    ]);
    const counts = { active: 0, founder: 0, trialing: 0, past_due: 0, canceled: 0, expired: 0 };
    const byPlan = {};
    let mrrCents = 0;
    for (const s of subs) {
      counts[s.status] = (counts[s.status] || 0) + 1;
      if (!['active', 'past_due'].includes(s.status)) continue;
      const code = billing.normalizePlanCode(s.planCode);
      const cents = monthlyCents(s, billing);
      mrrCents += cents;
      const row = byPlan[code] || { code, label: PLAN_LABEL[code] || code, count: 0, mrr: 0 };
      row.count += 1;
      row.mrr += cents / 100;
      byPlan[code] = row;
      if (s.founder?.until && new Date(s.founder.until) > now) counts.founder += 1;
    }
    return {
      days,
      mrr: Math.round(mrrCents / 100),
      paying: counts.active + counts.past_due,
      counts,
      byPlan: Object.values(byPlan)
        .map((r) => ({ ...r, mrr: Math.round(r.mrr) }))
        .sort((a, b) => b.mrr - a.mrr),
      received: { ...delta(cur.value, prev.value), payments: cur.count },
    };
  });
}

async function list({ status = 'all', plan = '', q = '', page = 1 } = {}) {
  const Subscription = require('../models/Subscription');
  const Shop = require('../models/Shop');
  const Membership = require('../models/Membership');
  const User = require('../models/User');
  const billing = require('./billingService');
  const filter = { provider: { $ne: 'Dev' } };
  if (['trialing', 'active', 'past_due', 'canceled', 'expired'].includes(status)) filter.status = status;
  if (PLAN_LABEL[plan]) filter.planCode = plan;
  const term = String(q || '').trim();
  if (term) {
    const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const shops = await Shop.find({ $or: [{ name: rx }, { 'branding.displayName': rx }, { slug: rx }] }).select('_id').limit(500).lean();
    filter.shopId = { $in: shops.map((s) => s._id) };
  }
  const size = 50;
  const current = Math.max(1, Number(page) || 1);
  const [rows, total] = await Promise.all([
    Subscription.find(filter).sort({ updatedAt: -1 }).skip((current - 1) * size).limit(size).lean(),
    Subscription.countDocuments(filter),
  ]);
  const shopIds = rows.map((r) => r.shopId);
  const [shops, owners] = await Promise.all([
    Shop.find({ _id: { $in: shopIds } }).select('name branding.displayName status createdAt').lean(),
    Membership.find({ shopId: { $in: shopIds }, role: 'owner', active: true }).select('shopId userId').lean(),
  ]);
  const users = await User.find({ _id: { $in: owners.map((o) => o.userId) } }).select('name email').lean();
  const shopBy = new Map(shops.map((s) => [String(s._id), s]));
  const ownerBy = new Map(owners.map((o) => [String(o.shopId), users.find((u) => String(u._id) === String(o.userId))]));
  return {
    total,
    page: current,
    items: rows.map((s) => {
      const shop = shopBy.get(String(s.shopId));
      const owner = ownerBy.get(String(s.shopId));
      const code = billing.normalizePlanCode(s.planCode);
      return {
        id: String(s._id),
        shopId: String(s.shopId),
        shopName: shop?.branding?.displayName || shop?.name || 'Loja',
        shopStatus: shop?.status || null,
        owner: owner ? { id: String(owner._id), name: owner.name, email: owner.email } : null,
        planCode: code,
        planLabel: PLAN_LABEL[code] || code,
        status: s.status,
        cycle: s.cycle || 'monthly',
        provider: s.provider,
        mrr: ['active', 'past_due'].includes(s.status) ? Math.round(monthlyCents(s, billing) / 100) : 0,
        founderUntil: s.founder?.until && new Date(s.founder.until) > new Date() ? s.founder.until : null,
        trialEndsAt: s.trialEndsAt || null,
        currentPeriodEnd: s.currentPeriodEnd || null,
        invoiceUrl: s.lastInvoiceUrl || null,
        updatedAt: s.updatedAt,
      };
    }),
  };
}

module.exports = { summary, list, received, monthlyCents, PLAN_LABEL };
