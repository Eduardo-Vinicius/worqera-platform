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

const { healthScore } = require('../lib/healthScore');

exports.insights = wrap(async (req, res) => {
  const days = parseDays(req.query.days, LONG, 7);
  const facts = await memo(`facts:${days}`, 60000, () => insights.collectFacts({ days }));
  const items = insights.rules(facts);
  res.status(200).json({ days, insights: items, counts: insights.countBySeverity(items), rulesEvaluated: insights.RULES_EVALUATED });
});

exports.queues = wrap(async (_req, res) => {
  res.status(200).json({ queues: await memo('queues', 30000, () => queues.listQueues()) });
});

exports.overview = wrap(async (req, res) => {
  const days = parseDays(req.query.days, LONG, 7);
  const data = await memo(`overview:${days}`, 60000, async () => {
    const Order = require('../models/Order');
    const ActiveAccount = require('../models/ActiveAccount');
    const Shop = require('../models/Shop');
    const { dayExpr, fillSeries } = require('../lib/periods');
    const [facts, today, billing] = await Promise.all([
      insights.collectFacts({ days }),
      metrics.tech({ days: 1, client: 'all' }),
      require('../services/platformBilling').summary({ days }),
    ]);
    const p = range(days);
    const live = { deletedAt: null, clientName: { $ne: 'Cliente demonstração' } };
    const last30 = range(30);
    const [created, createdPrev, delivered, deliveredPrev, users30, usersPrev30, shops30, shopsPrev30, signups, signupsPrev, createdDaily, deliveredDaily, activeDaily, signupDaily] =
      await Promise.all([
        Order.countDocuments({ ...live, createdAt: { $gte: p.from, $lt: p.to } }),
        Order.countDocuments({ ...live, createdAt: { $gte: p.prevFrom, $lt: p.prevTo } }),
        Order.countDocuments({ ...live, status: 'delivered', deliveredAt: { $gte: p.from, $lt: p.to } }),
        Order.countDocuments({ ...live, status: 'delivered', deliveredAt: { $gte: p.prevFrom, $lt: p.prevTo } }),
        ActiveAccount.distinct('userId', { day: { $in: last30.days } }),
        ActiveAccount.distinct('userId', { day: { $in: last30.prevDays } }),
        ActiveAccount.distinct('shopId', { day: { $in: last30.days }, shopId: { $ne: null } }),
        ActiveAccount.distinct('shopId', { day: { $in: last30.prevDays }, shopId: { $ne: null } }),
        Shop.countDocuments({ createdAt: { $gte: p.from, $lt: p.to } }),
        Shop.countDocuments({ createdAt: { $gte: p.prevFrom, $lt: p.prevTo } }),
        Order.aggregate([{ $match: { ...live, createdAt: { $gte: p.from } } }, { $group: { _id: dayExpr('$createdAt'), value: { $sum: 1 } } }]),
        Order.aggregate([{ $match: { ...live, status: 'delivered', deliveredAt: { $gte: p.from } } }, { $group: { _id: dayExpr('$deliveredAt'), value: { $sum: 1 } } }]),
        ActiveAccount.aggregate([
          { $match: { day: { $in: p.days } } },
          { $group: { _id: { day: '$day', userId: '$userId' } } },
          { $group: { _id: '$_id.day', value: { $sum: 1 } } },
        ]),
        Shop.aggregate([{ $match: { createdAt: { $gte: p.from } } }, { $group: { _id: dayExpr('$createdAt'), value: { $sum: 1 } } }]),
      ]);
    const health = healthScore({
      requests: today.kpis.requests.value,
      errorRate: today.kpis.errorRate.value,
      p95Ms: today.kpis.p95Ms.value,
      status: facts.tech.health.status,
      reasons: facts.tech.health.reasons || [],
    });
    const kpi = (key, label, d, extra = {}) => ({ key, label, ...d, ...extra });
    const items = insights.rules(facts);
    return {
      days,
      kpis: {
        activeUsers30: delta(users30.length, usersPrev30.length),
        ordersCreated: delta(created, createdPrev),
        ordersDelivered: delta(delivered, deliveredPrev),
        activeShops30: delta(shops30.length, shopsPrev30.length),
        mrr: { value: billing.mrr, paying: billing.paying },
      },
      tiles: [
        kpi('activeUsers', 'Usuários ativos · 30 dias', delta(users30.length, usersPrev30.length), { href: '/admin/analises', daily: fillSeries(p.days, activeDaily), hint: 'pessoas que usaram o sistema' }),
        kpi('ordersCreated', `Pedidos criados · ${days}d`, delta(created, createdPrev), { href: '/admin/analises?tab=transacoes', daily: fillSeries(p.days, createdDaily) }),
        kpi('ordersDelivered', `Pedidos entregues · ${days}d`, delta(delivered, deliveredPrev), { href: '/admin/analises?tab=transacoes', daily: fillSeries(p.days, deliveredDaily), hint: 'ação de valor' }),
        kpi('activeShops', 'Lojas ativas · 30 dias', delta(shops30.length, shopsPrev30.length), { href: '/admin/analises?tab=lojas', hint: 'com alguém usando' }),
        kpi('signups', `Lojas novas · ${days}d`, delta(signups, signupsPrev), { href: '/admin/shops', daily: fillSeries(p.days, signupDaily) }),
        kpi('mrr', 'MRR', { value: billing.mrr, prev: billing.mrr, pct: null }, { unit: 'brl', href: '/admin/assinaturas', hint: `${billing.paying} pagantes` }),
      ],
      health: { ...health, status: facts.tech.health.status, errorRate: today.kpis.errorRate.value, p95Ms: today.kpis.p95Ms.value, queue: facts.tech.health.queue },
      insights: items,
      insightCounts: insights.countBySeverity(items),
      rulesEvaluated: insights.RULES_EVALUATED,
      queues: facts.queuesFull.map(({ items: _items, ...q }) => q),
      billing,
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

exports.emails = wrap(async (req, res) => {
  const mailLog = require('../services/mailLog');
  res.status(200).json(
    await mailLog.list({
      days: parseDays(req.query.days, [1, 7, 14, 30], 7),
      group: String(req.query.group || 'all'),
      status: String(req.query.status || 'all'),
      q: req.query.q,
      page: req.query.page,
    })
  );
});

exports.audit = wrap(async (req, res) => {
  const adminAudit = require('../services/adminAudit');
  res.status(200).json(
    await adminAudit.list({
      action: String(req.query.action || ''),
      targetType: String(req.query.targetType || ''),
      targetId: String(req.query.targetId || ''),
      q: req.query.q,
      page: req.query.page,
    })
  );
});

exports.transferEmail = wrap(async (req, res) => {
  const { transferEmail } = require('../services/adminAccounts');
  res.status(200).json(await transferEmail(req.params.id, req.body?.newEmail, req));
});

exports.subscriptions = wrap(async (req, res) => {
  const billing = require('../services/platformBilling');
  const [summary, list] = await Promise.all([
    billing.summary({ days: parseDays(req.query.days, LONG, 30) }),
    billing.list({ status: String(req.query.status || 'all'), plan: String(req.query.plan || ''), q: req.query.q, page: req.query.page }),
  ]);
  res.status(200).json({ summary, ...list });
});

exports.ritual = wrap(async (req, res) => {
  res.status(200).json(await analytics.ritual({ days: parseDays(req.query.days, [7, 30], 7) }));
});

exports.errors = wrap(async (req, res) => {
  const days = parseDays(req.query.days, SHORT, 7);
  res.status(200).json({ days, errors: await metrics.errorList({ days, client: String(req.query.client || 'all'), q: req.query.q }) });
});
