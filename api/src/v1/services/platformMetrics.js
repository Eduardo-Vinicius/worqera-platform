/**
 * Admin metrics for the Worqera team: technology (API traffic), business and product.
 * Everything is aggregated in Mongo; each answer has the previous period for deltas.
 */
const mongoose = require('mongoose');
const MetricBucket = require('../models/MetricBucket');
const ErrorSample = require('../models/ErrorSample');
const ActiveAccount = require('../models/ActiveAccount');
const metricsStore = require('../lib/metricsStore');
const { range, delta, fillSeries, dayExpr, memo } = require('../lib/periods');

const DEMO_CLIENT = 'Cliente demonstração';
const HIST = ['h0', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

function clientMatch(client) {
  if (client === 'mobile') return { client: { $in: ['ios', 'android'] } };
  if (['web', 'admin', 'api', 'ios', 'android'].includes(client)) return { client };
  return {};
}

function histSum() {
  return Object.fromEntries(HIST.map((h) => [h, { $sum: `$${h}` }]));
}

function kpisFrom(row) {
  const r = row || {};
  const count = r.count || 0;
  return {
    requests: count,
    errors5xx: r.errors5xx || 0,
    errors4xx: r.errors4xx || 0,
    errorRate: count ? Math.round(((r.errors5xx || 0) / count) * 10000) / 100 : 0,
    avgMs: count ? Math.round((r.totalMs || 0) / count) : 0,
    p95Ms: metricsStore.p95FromHistogram(HIST.map((h) => r[h] || 0), r.maxMs || 0),
    maxMs: r.maxMs || 0,
  };
}

async function totals(from, to, match) {
  const [row] = await MetricBucket.aggregate([
    { $match: { start: { $gte: from, $lt: to }, ...match } },
    {
      $group: {
        _id: null,
        count: { $sum: '$count' },
        errors5xx: { $sum: '$errors5xx' },
        errors4xx: { $sum: '$errors4xx' },
        totalMs: { $sum: '$totalMs' },
        maxMs: { $max: '$maxMs' },
        ...histSum(),
      },
    },
  ]);
  return kpisFrom(row);
}

async function activeUsers(days, client) {
  const match = { day: { $in: days }, ...clientMatch(client) };
  const ids = await ActiveAccount.distinct('userId', match);
  return ids.length;
}

async function health() {
  let dbOk = false;
  try {
    await mongoose.connection.db.admin().ping();
    dbOk = true;
  } catch {
    dbOk = false;
  }
  const store = metricsStore.stats();
  const lastHour = await totals(new Date(Date.now() - 60 * 60 * 1000), new Date(Date.now() + 1), {});
  const stale = store.queued > 0 && store.lastFlushAt && Date.now() - new Date(store.lastFlushAt).getTime() > 60000;
  const errorsHigh = lastHour.requests >= 50 && lastHour.errorRate > 2;
  const status = !dbOk ? 'down' : errorsHigh || stale || store.lastError ? 'degraded' : 'healthy';
  return {
    status,
    label: status === 'healthy' ? 'Saudável' : status === 'degraded' ? 'Degradado' : 'Fora do ar',
    db: dbOk ? 'ok' : 'falhou',
    queue: store.queued,
    dropped: store.dropped,
    lastFlushAt: store.lastFlushAt,
    lastError: store.lastError,
    errorRateLastHour: lastHour.errorRate,
    requestsLastHour: lastHour.requests,
    collecting: store.enabled,
  };
}

function compareVersion(a, b) {
  const pa = String(a || '').split(/[.+]/).map((n) => parseInt(n, 10) || 0);
  const pb = String(b || '').split(/[.+]/).map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  }
  return 0;
}

async function tech({ days, client = 'all' }) {
  return memo(`tech:${days}:${client}`, 60000, async () => {
    const p = range(days);
    const match = clientMatch(client);
    const [cur, prev, activeNow, activePrev] = await Promise.all([
      totals(p.from, p.to, match),
      totals(p.prevFrom, p.prevTo, match),
      activeUsers(p.days, client),
      activeUsers(p.prevDays, client),
    ]);

    const [daily, dailyActive, halfHours, routes, errors, byRegion, byClient, byVersion] = await Promise.all([
      MetricBucket.aggregate([
        { $match: { start: { $gte: p.from }, ...match } },
        { $group: { _id: dayExpr('$start'), requests: { $sum: '$count' }, errors: { $sum: '$errors5xx' } } },
      ]),
      ActiveAccount.aggregate([
        { $match: { day: { $in: p.days }, ...clientMatch(client) } },
        { $group: { _id: { day: '$day', userId: '$userId' } } },
        { $group: { _id: '$_id.day', value: { $sum: 1 } } },
      ]),
      MetricBucket.aggregate([
        { $match: { start: { $gte: p.from }, ...match } },
        { $group: { _id: '$start', value: { $sum: '$count' } } },
        { $sort: { _id: 1 } },
      ]),
      MetricBucket.aggregate([
        { $match: { start: { $gte: p.from }, ...match } },
        {
          $group: {
            _id: { method: '$method', route: '$route' },
            count: { $sum: '$count' },
            errors5xx: { $sum: '$errors5xx' },
            errors4xx: { $sum: '$errors4xx' },
            totalMs: { $sum: '$totalMs' },
            maxMs: { $max: '$maxMs' },
            ...histSum(),
          },
        },
        { $sort: { count: -1 } },
        { $limit: 300 },
      ]),
      ErrorSample.find({ at: { $gte: p.from }, ...match }).sort({ at: -1 }).limit(20).lean(),
      ActiveAccount.aggregate([
        { $match: { day: { $in: p.days }, ...clientMatch(client) } },
        { $group: { _id: { region: '$region', userId: '$userId' } } },
        { $group: { _id: '$_id.region', users: { $sum: 1 } } },
        { $sort: { users: -1 } },
      ]),
      ActiveAccount.aggregate([
        { $match: { day: { $in: p.days } } },
        { $group: { _id: { client: '$client', userId: '$userId' } } },
        { $group: { _id: '$_id.client', users: { $sum: 1 } } },
        { $sort: { users: -1 } },
      ]),
      ActiveAccount.aggregate([
        { $match: { day: { $in: p.days }, client: { $in: ['ios', 'android'] } } },
        { $sort: { lastSeenAt: -1 } },
        { $group: { _id: { userId: '$userId', platform: '$platform' }, appVersion: { $first: '$appVersion' } } },
        { $group: { _id: { platform: '$_id.platform', version: '$appVersion' }, users: { $sum: 1 } } },
      ]),
    ]);

    const endpointRows = routes.map((r) => {
      const k = kpisFrom(r);
      return {
        method: r._id.method,
        route: r._id.route,
        count: k.requests,
        avgMs: k.avgMs,
        p95Ms: k.p95Ms,
        maxMs: k.maxMs,
        errors4xx: k.errors4xx,
        errors5xx: k.errors5xx,
        errorRate: k.errorRate,
      };
    });
    const versions = byVersion.map((v) => ({ platform: v._id.platform || 'outro', version: v._id.version || '—', users: v.users }));
    const latest = versions.map((v) => v.version).filter((v) => v !== '—').sort(compareVersion).pop() || null;
    const mobileUsers = versions.reduce((a, v) => a + v.users, 0);
    const onLatest = versions.filter((v) => v.version === latest).reduce((a, v) => a + v.users, 0);
    const userTotal = byRegion.reduce((a, r) => a + r.users, 0);

    return {
      days,
      client,
      kpis: {
        requests: delta(cur.requests, prev.requests),
        activeUsers: delta(activeNow, activePrev),
        errors5xx: delta(cur.errors5xx, prev.errors5xx),
        errorRate: delta(cur.errorRate, prev.errorRate),
        avgMs: delta(cur.avgMs, prev.avgMs),
        p95Ms: delta(cur.p95Ms, prev.p95Ms),
        maxMs: delta(cur.maxMs, prev.maxMs),
      },
      series: {
        requests: fillSeries(p.days, daily, 'requests'),
        errors: fillSeries(p.days, daily, 'errors'),
        activeUsers: fillSeries(p.days, dailyActive),
        halfHours: halfHours.map((h) => ({ at: h._id, value: h.value })),
      },
      topEndpoints: endpointRows.slice(0, 10),
      slowest: [...endpointRows].filter((e) => e.count >= 5).sort((a, b) => b.p95Ms - a.p95Ms || b.avgMs - a.avgMs).slice(0, 10),
      recentErrors: errors.map((e) => ({
        at: e.at,
        method: e.method,
        route: e.route,
        status: e.status,
        code: e.code,
        message: e.message,
        correlationId: e.correlationId,
        client: e.client,
      })),
      byRegion: byRegion.map((r) => ({ region: r._id || '—', users: r.users, pct: userTotal ? Math.round((r.users / userTotal) * 100) : 0 })),
      byClient: byClient.map((r) => ({ client: r._id, users: r.users })),
      appVersions: {
        latest,
        mobileUsers,
        onLatestPct: mobileUsers ? Math.round((onLatest / mobileUsers) * 100) : 0,
        rows: versions
          .sort((a, b) => compareVersion(b.version, a.version) || b.users - a.users)
          .map((v) => ({ ...v, pct: mobileUsers ? Math.round((v.users / mobileUsers) * 100) : 0 })),
      },
      health: await health(),
    };
  });
}

/** One business metric: all-time total, new in the period, delta and the daily series. */
async function countMetric(model, { key, label, field = 'createdAt', match = {}, p }) {
  const [total, cur, prev, daily] = await Promise.all([
    model.countDocuments(match),
    model.countDocuments({ ...match, [field]: { $gte: p.from, $lt: p.to } }),
    model.countDocuments({ ...match, [field]: { $gte: p.prevFrom, $lt: p.prevTo } }),
    model.aggregate([
      { $match: { ...match, [field]: { $gte: p.from } } },
      { $group: { _id: dayExpr(`$${field}`), value: { $sum: 1 } } },
    ]),
  ]);
  return { key, label, total, new: delta(cur, prev), series: fillSeries(p.days, daily) };
}

async function sumMetric(model, { key, label, field = 'createdAt', sum, match = {}, p }) {
  const agg = (from, to) =>
    model.aggregate([{ $match: { ...match, [field]: { $gte: from, $lt: to } } }, { $group: { _id: null, value: { $sum: sum } } }]);
  const [[cur], [prev], daily] = await Promise.all([
    agg(p.from, p.to),
    agg(p.prevFrom, p.prevTo),
    model.aggregate([{ $match: { ...match, [field]: { $gte: p.from } } }, { $group: { _id: dayExpr(`$${field}`), value: { $sum: sum } } }]),
  ]);
  return {
    key,
    label,
    money: true,
    total: null,
    new: delta(Math.round(cur?.value || 0), Math.round(prev?.value || 0)),
    series: fillSeries(p.days, daily).map((d) => ({ ...d, value: Math.round(d.value) })),
  };
}

/** Monthly recurring revenue of paying subscriptions (yearly ÷ 12, founder price honoured). */
async function currentMrr() {
  const Subscription = require('../models/Subscription');
  const billing = require('./billingService');
  const subs = await Subscription.find({ status: { $in: ['active', 'past_due'] }, provider: { $ne: 'Dev' } })
    .select('planCode cycle founder status')
    .lean();
  let cents = 0;
  const byPlan = {};
  for (const s of subs) {
    const code = billing.normalizePlanCode(s.planCode);
    const monthly =
      s.cycle === 'yearly' ? (billing.priceCents(code, 'yearly') || 0) / 12 : billing.effectivePrice(s).priceCents || 0;
    cents += monthly;
    byPlan[code] = (byPlan[code] || 0) + 1;
  }
  return { mrr: Math.round(cents / 100), paying: subs.length, byPlan };
}

async function business({ days }) {
  return memo(`business:${days}`, 60000, async () => {
    const p = range(days);
    const Shop = require('../models/Shop');
    const User = require('../models/User');
    const Order = require('../models/Order');
    const Quote = require('../models/Quote');
    const Subscription = require('../models/Subscription');
    const WebhookEvent = require('../models/WebhookEvent');
    const liveOrders = { deletedAt: null, clientName: { $ne: DEMO_CLIENT } };

    const metrics = await Promise.all([
      countMetric(Shop, { key: 'shops', label: 'Lojas cadastradas', p }),
      countMetric(User, { key: 'users', label: 'Usuários', p }),
      countMetric(Subscription, { key: 'trials', label: 'Testes iniciados', p }),
      countMetric(WebhookEvent, {
        key: 'payments',
        label: 'Pagamentos confirmados',
        field: 'processedAt',
        match: { provider: 'Asaas', type: { $in: ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'] } },
        p,
      }),
      countMetric(WebhookEvent, {
        key: 'cancellations',
        label: 'Cancelamentos',
        field: 'processedAt',
        match: { provider: 'Asaas', type: { $in: ['SUBSCRIPTION_DELETED', 'SUBSCRIPTION_INACTIVATED'] } },
        p,
      }),
      countMetric(Order, { key: 'ordersCreated', label: 'Pedidos criados', match: liveOrders, p }),
      countMetric(Order, { key: 'ordersDelivered', label: 'Pedidos entregues', field: 'deliveredAt', match: { ...liveOrders, status: 'delivered' }, p }),
      sumMetric(Order, { key: 'orderValue', label: 'Valor em pedidos (R$)', sum: { $ifNull: ['$pricing.total', 0] }, match: { ...liveOrders, status: { $ne: 'cancelled' } }, p }),
      countMetric(Quote, { key: 'quotesWon', label: 'Orçamentos recuperados', field: 'wonAt', match: { stage: 'won' }, p }),
      countMetric(Shop, { key: 'referrals', label: 'Lojas por indicação', match: { referredByPartnerCode: { $ne: null } }, p }),
    ]);
    const [mrr, subsByStatus] = await Promise.all([
      currentMrr(),
      Subscription.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);
    return {
      days,
      metrics,
      mrr,
      subscriptions: Object.fromEntries(subsByStatus.map((s) => [s._id, s.count])),
    };
  });
}

async function product({ days }) {
  return memo(`product:${days}`, 60000, async () => {
    const p = range(days);
    const Shop = require('../models/Shop');
    const Order = require('../models/Order');
    const Quote = require('../models/Quote');
    const AiUsage = require('../models/AiUsage');
    const StockMovement = require('../models/StockMovement');
    const WhatsAppMessage = require('../models/WhatsAppMessage');
    const inPeriod = { $gte: p.from, $lt: p.to };
    const liveOrders = { deletedAt: null, clientName: { $ne: DEMO_CLIENT } };

    const [activeShopIds, shops, ordering, quoting, reviewed, openedBy, ai, stock, whatsapp, topServices] = await Promise.all([
      ActiveAccount.distinct('shopId', { day: { $in: p.days }, shopId: { $ne: null } }),
      Shop.find({}).select('vertical branding.address workflow').lean(),
      Order.distinct('shopId', { ...liveOrders, createdAt: inPeriod }),
      Quote.distinct('shopId', { createdAt: inPeriod }),
      Order.distinct('shopId', { 'feedback.createdAt': inPeriod }),
      Order.distinct('shopId', { createdAt: inPeriod, openedByEmployeeId: { $ne: null } }),
      AiUsage.distinct('shopId', { createdAt: inPeriod, ok: true }),
      StockMovement.distinct('shopId', { createdAt: inPeriod }),
      WhatsAppMessage.distinct('shopId', { createdAt: inPeriod, direction: 'out' }),
      Order.aggregate([
        { $match: { ...liveOrders, createdAt: inPeriod } },
        { $unwind: '$items' },
        { $unwind: '$items.services' },
        { $group: { _id: '$items.services.name', count: { $sum: 1 } } },
        { $match: { _id: { $nin: [null, ''] } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    const active = new Set(activeShopIds.map(String));
    const using = (ids) => {
      const set = new Set(ids.filter(Boolean).map(String));
      const n = [...active].filter((id) => set.has(id)).length;
      return { shops: n, pct: active.size ? Math.round((n / active.size) * 100) : 0 };
    };
    const verticals = {};
    const regions = {};
    for (const s of shops) {
      const v = s.vertical || 'general';
      verticals[v] = (verticals[v] || 0) + 1;
      const uf = metricsStore.ufFromAddress(s.branding?.address) || '—';
      regions[uf] = (regions[uf] || 0) + 1;
    }
    const sorted = (obj) => Object.entries(obj).map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);

    return {
      days,
      activeShops: active.size,
      verticals: sorted(verticals),
      regions: sorted(regions),
      coverage: [
        { key: 'orders', label: 'Criaram pedidos', ...using(ordering) },
        { key: 'quotes', label: 'Usaram orçamentos', ...using(quoting) },
        { key: 'reviews', label: 'Receberam avaliações', ...using(reviewed) },
        { key: 'openedBy', label: 'Marcam quem abriu', ...using(openedBy) },
        { key: 'ai', label: 'Usaram IA', ...using(ai) },
        { key: 'stock', label: 'Movimentaram estoque', ...using(stock) },
        { key: 'whatsapp', label: 'WhatsApp oficial', ...using(whatsapp) },
      ],
      topServices: topServices.map((s) => ({ name: s._id, count: s.count })),
    };
  });
}

module.exports = { tech, business, product, health, currentMrr, compareVersion, clientMatch };
