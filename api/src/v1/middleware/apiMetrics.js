const { normalizeRoute } = require('../lib/runtimeMatch');
const metricsStore = require('../lib/metricsStore');
const PlatformError = require('../models/PlatformError');

const ERROR_CAP = 1000;
const ACTIVE_WINDOW_MS = 30 * 60 * 1000;

function shouldSkip(req) {
  if (String(req.method || '').toUpperCase() === 'OPTIONS') return true;
  const path = String(req.originalUrl || req.url || '').split('?')[0];
  if (path === '/health' || path === '/health/ready' || path === '/' || path === '/favicon.ico') return true;
  return /\.(?:js|css|png|jpe?g|gif|svg|ico|webp|map|woff2?)$/i.test(path);
}

async function logApiError({ message, route, method, status, shopId }) {
  try {
    const doc = {
      message: String(message || 'error').slice(0, 500),
      route: String(route || ''),
      method: String(method || ''),
      status: Number(status) || 500,
      shopId: shopId ? String(shopId) : null,
    };
    const since = new Date(Date.now() - 15 * 60 * 1000);
    const existing = await PlatformError.findOne({
      method: doc.method,
      route: doc.route,
      status: doc.status,
      message: doc.message,
      at: { $gte: since },
    });
    if (existing) {
      await PlatformError.updateOne(
        { _id: existing._id },
        { $inc: { count: 1 }, $set: { at: new Date(), shopId: doc.shopId } }
      );
      return;
    }
    await PlatformError.create({ ...doc, count: 1, at: new Date() });
    const count = await PlatformError.countDocuments();
    if (count > ERROR_CAP) {
      const overflow = count - ERROR_CAP;
      const old = await PlatformError.find().sort({ at: 1, _id: 1 }).limit(overflow).select('_id').lean();
      if (old.length) await PlatformError.deleteMany({ _id: { $in: old.map((d) => d._id) } });
    }
  } catch (err) {
    console.warn('[metrics] erro não gravado:', err.message);
  }
}

/** Runs when the response is done, so 401/403/409/429/5xx from any handler count with the final status. */
function recordApiCall(req, res, ms) {
  if (shouldSkip(req)) return;
  const route = normalizeRoute(req);
  const method = String(req.method || 'GET').toUpperCase();
  const status = Number(res.statusCode) || 0;
  const { client, platform, appVersion } = metricsStore.clientOf(req);
  const apiError = String(res.locals?.apiError || '');
  const code = apiError.includes(':') ? apiError.slice(0, apiError.indexOf(':')) : '';
  metricsStore.enqueue({
    at: new Date(),
    method,
    route,
    status,
    ms,
    client,
    platform,
    appVersion,
    userId: req.auth?.userId ? String(req.auth.userId) : null,
    shopId: req.auth?.shopId || req.shopId ? String(req.auth?.shopId || req.shopId) : null,
    code,
    message: apiError.slice(code ? code.length + 1 : 0).trim() || `HTTP ${status}`,
    correlationId: req.correlationId || '',
  });
  if (status >= 500) {
    logApiError({
      message: apiError || `HTTP ${status}`,
      route,
      method,
      status,
      shopId: req.auth?.shopId || req.shopId || null,
    }).catch(() => {});
  }
}

function apiMetrics(req, res, next) {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    try {
      recordApiCall(req, res, Number(process.hrtime.bigint() - start) / 1e6);
    } catch {
      // metrics never break a request
    }
  });
  next();
}

const WINDOW_MS = { '1h': 60 * 60 * 1000, '24h': 24 * 60 * 60 * 1000, '30d': 30 * 24 * 60 * 60 * 1000 };

async function endpointWindow(sinceMs) {
  const MetricBucket = require('../models/MetricBucket');
  const rows = await MetricBucket.aggregate([
    { $match: { start: { $gte: new Date(Date.now() - sinceMs - 30 * 60 * 1000) } } },
    {
      $group: {
        _id: { method: '$method', route: '$route' },
        count: { $sum: '$count' },
        sumMs: { $sum: '$totalMs' },
        maxMs: { $max: '$maxMs' },
        ok: { $sum: { $cond: [{ $eq: ['$status', '2xx'] }, '$count', 0] } },
        clientErrors: { $sum: '$errors4xx' },
        errors: { $sum: '$errors5xx' },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 200 },
  ]);
  let calls = 0;
  let errors = 0;
  let sumMs = 0;
  const endpoints = rows.map((r) => {
    calls += r.count;
    errors += r.errors;
    sumMs += r.sumMs;
    return {
      method: r._id.method,
      route: r._id.route,
      count: r.count,
      avgMs: r.count ? Math.round(r.sumMs / r.count) : 0,
      maxMs: r.maxMs,
      ok: r.ok,
      clientErrors: r.clientErrors,
      errors: r.errors,
      errorRate: r.count ? Math.round((r.errors / r.count) * 1000) / 10 : 0,
      clientErrorRate: r.count ? Math.round((r.clientErrors / r.count) * 1000) / 10 : 0,
    };
  });
  return { calls, errors, avgMs: calls ? Math.round(sumMs / calls) : 0, endpoints };
}

/** The old Portal screen: traffic windows now come from the durable buckets in Mongo. */
async function readOpsSnapshot() {
  const ActiveAccount = require('../models/ActiveAccount');
  const [h1, h24, d30, activeIds, errors] = await Promise.all([
    endpointWindow(WINDOW_MS['1h']),
    endpointWindow(WINDOW_MS['24h']),
    endpointWindow(WINDOW_MS['30d']),
    ActiveAccount.distinct('userId', { lastSeenAt: { $gte: new Date(Date.now() - ACTIVE_WINDOW_MS) } }),
    PlatformError.find().sort({ at: -1 }).limit(100).lean(),
  ]);
  return {
    redis: 'n/a',
    store: metricsStore.stats(),
    activeUsers: activeIds.length,
    windows: { '1h': h1, '24h': h24, '30d': d30 },
    endpoints: d30.endpoints,
    errors: errors.map((e) => ({
      id: e._id,
      message: e.message,
      route: e.route,
      method: e.method,
      status: e.status,
      shopId: e.shopId,
      count: e.count || 1,
      at: e.at,
    })),
  };
}

module.exports = { apiMetrics, readOpsSnapshot, logApiError, shouldSkip, ACTIVE_WINDOW_MS };
