/** Worqera team admin: metrics, insights, analytics and operation. Mounted under /platform (platform admins only). */
const { wrap } = require('./helpers');
const { parseDays } = require('../lib/periods');
const metrics = require('../services/platformMetrics');

const SHORT = [1, 7, 14, 30];

exports.tech = wrap(async (req, res) => {
  const days = parseDays(req.query.days, SHORT, 7);
  const client = String(req.query.client || 'all');
  res.status(200).json(await metrics.tech({ days, client }));
});

exports.business = wrap(async (req, res) => {
  res.status(200).json(await metrics.business({ days: parseDays(req.query.days, SHORT, 7) }));
});

exports.product = wrap(async (req, res) => {
  res.status(200).json(await metrics.product({ days: parseDays(req.query.days, SHORT, 7) }));
});

const LONG = [7, 14, 30, 90];
const insights = require('../services/platformInsights');
const queues = require('../services/platformQueues');
const { memo, range, delta } = require('../lib/periods');

/** 0–100 from the technical numbers: errors, p95 and the collection queue. */
function healthScore(tech) {
  let score = 100;
  score -= Math.min(50, tech.kpis.errorRate.value * 10);
  if (tech.kpis.p95Ms.value > 2500) score -= 25;
  else if (tech.kpis.p95Ms.value > 1000) score -= 10;
  if (tech.health.dropped) score -= 10;
  if (tech.health.status === 'degraded') score -= 15;
  if (tech.health.status === 'down') score = 0;
  score = Math.max(0, Math.round(score));
  return { score, label: score >= 85 ? 'Ótima' : score >= 65 ? 'Atenção' : 'Crítica' };
}

exports.insights = wrap(async (req, res) => {
  const days = parseDays(req.query.days, LONG, 7);
  const facts = await memo(`facts:${days}`, 60000, () => insights.collectFacts({ days }));
  res.status(200).json({ days, insights: insights.rules(facts) });
});

exports.queues = wrap(async (_req, res) => {
  res.status(200).json({ queues: await memo('queues', 30000, () => queues.listQueues()) });
});

exports.overview = wrap(async (req, res) => {
  const days = parseDays(req.query.days, LONG, 7);
  const data = await memo(`overview:${days}`, 60000, async () => {
    const Order = require('../models/Order');
    const ActiveAccount = require('../models/ActiveAccount');
    const facts = await insights.collectFacts({ days });
    const p = range(days);
    const live = { deletedAt: null, clientName: { $ne: 'Cliente demonstração' } };
    const last30 = range(30);
    const [created, createdPrev, delivered, deliveredPrev, users30, usersPrev30, shops30, mrr] = await Promise.all([
      Order.countDocuments({ ...live, createdAt: { $gte: p.from, $lt: p.to } }),
      Order.countDocuments({ ...live, createdAt: { $gte: p.prevFrom, $lt: p.prevTo } }),
      Order.countDocuments({ ...live, status: 'delivered', deliveredAt: { $gte: p.from, $lt: p.to } }),
      Order.countDocuments({ ...live, status: 'delivered', deliveredAt: { $gte: p.prevFrom, $lt: p.prevTo } }),
      ActiveAccount.distinct('userId', { day: { $in: last30.days } }),
      ActiveAccount.distinct('userId', { day: { $in: last30.prevDays } }),
      ActiveAccount.distinct('shopId', { day: { $in: last30.days }, shopId: { $ne: null } }),
      require('../services/platformMetrics').currentMrr(),
    ]);
    return {
      days,
      kpis: {
        activeUsers30: delta(users30.length, usersPrev30.length),
        ordersCreated: delta(created, createdPrev),
        ordersDelivered: delta(delivered, deliveredPrev),
        activeShops30: delta(shops30.length, 0),
        mrr: { value: mrr.mrr, paying: mrr.paying },
      },
      health: { ...healthScore(facts.tech), status: facts.tech.health.status, errorRate: facts.tech.kpis.errorRate.value, p95Ms: facts.tech.kpis.p95Ms.value, queue: facts.tech.health.queue },
      insights: insights.rules(facts),
      queues: facts.queuesFull.map(({ items, ...q }) => q),
    };
  });
  res.status(200).json(data);
});

const analytics = require('../services/platformAnalytics');

exports.funnel = wrap(async (req, res) => {
  res.status(200).json(await analytics.activationFunnel({ days: parseDays(req.query.days, LONG, 30) }));
});
exports.cohorts = wrap(async (req, res) => {
  res.status(200).json(await analytics.cohorts({ weeks: parseDays(req.query.weeks, [8, 10, 12], 8) }));
});
exports.engagement = wrap(async (req, res) => {
  res.status(200).json(await analytics.engagement({ days: parseDays(req.query.days, LONG, 30) }));
});
exports.adoption = wrap(async (req, res) => {
  const product = await metrics.product({ days: parseDays(req.query.days, [...SHORT, 90], 30) });
  res.status(200).json({ days: product.days, activeShops: product.activeShops, adoption: product.coverage });
});
exports.transactions = wrap(async (req, res) => {
  res.status(200).json(await analytics.transactions({ days: parseDays(req.query.days, LONG, 30) }));
});
exports.shopsHealth = wrap(async (req, res) => {
  res.status(200).json(await analytics.shopsHealth({ days: parseDays(req.query.days, LONG, 30) }));
});
exports.accounts = wrap(async (req, res) => {
  res.status(200).json(await analytics.listAccounts({ segment: String(req.query.segment || 'all'), q: req.query.q, page: req.query.page }));
});
exports.account = wrap(async (req, res) => {
  res.status(200).json(await analytics.account360(req.params.id));
});
