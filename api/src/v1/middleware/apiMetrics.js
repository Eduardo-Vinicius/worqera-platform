const { redisCmd } = require('../lib/redisClient');
const { normalizeRoute } = require('../lib/runtimeMatch');
const PlatformError = require('../models/PlatformError');

const HOUR_TTL_SEC = 30 * 24 * 60 * 60;
const ACTIVE_WINDOW_MS = 30 * 60 * 1000;
const ACTIVE_KEY = 'metrics:active';
const ERROR_CAP = 1000;

function hourKey(date = new Date()) {
  return `metrics:h:${date.toISOString().slice(0, 13)}`;
}

function fieldId(method, route) {
  return `${method}\u001f${route}`;
}

function shouldSkip(req) {
  const path = String(req.originalUrl || req.url || '').split('?')[0];
  return path === '/health' || path === '/health/ready' || path === '/' || path === '/favicon.ico';
}

async function logApiError({ message, route, method, status, shopId }) {
  try {
    await PlatformError.create({
      message: String(message || 'error').slice(0, 500),
      route: String(route || ''),
      method: String(method || ''),
      status: Number(status) || 500,
      shopId: shopId ? String(shopId) : null,
      at: new Date(),
    });
    const count = await PlatformError.countDocuments();
    if (count > ERROR_CAP) {
      const overflow = count - ERROR_CAP;
      const old = await PlatformError.find()
        .sort({ at: 1, _id: 1 })
        .limit(overflow)
        .select('_id')
        .lean();
      if (old.length) {
        await PlatformError.deleteMany({ _id: { $in: old.map((d) => d._id) } });
      }
    }
  } catch (err) {
    console.warn('[metrics] erro não gravado:', err.message);
  }
}

async function recordApiCall(req, res, ms) {
  if (shouldSkip(req)) return;
  const route = normalizeRoute(req);
  const method = String(req.method || 'GET').toUpperCase();
  const status = Number(res.statusCode) || 0;
  const rounded = Math.max(0, Math.round(ms));
  const id = fieldId(method, route);
  const key = hourKey();

  await redisCmd(async (redis) => {
    const multi = redis.multi();
    multi.hIncrBy(key, `${id}:n`, 1);
    multi.hIncrBy(key, `${id}:ms`, rounded);
    multi.hIncrBy(key, `${id}:s${Math.floor(status / 100)}`, 1);
    multi.expire(key, HOUR_TTL_SEC);
    await multi.exec();
    const current = Number(await redis.hGet(key, `${id}:max`)) || 0;
    if (rounded > current) await redis.hSet(key, `${id}:max`, String(rounded));
    if (req.auth?.userId) {
      const now = Date.now();
      await redis.zAdd(ACTIVE_KEY, { score: now, value: String(req.auth.userId) });
      await redis.zRemRangeByScore(ACTIVE_KEY, 0, now - ACTIVE_WINDOW_MS);
    }
  });

  if (status >= 500) {
    await logApiError({
      message: res.locals?.apiError || `HTTP ${status}`,
      route,
      method,
      status,
      shopId: req.auth?.shopId || req.shopId || null,
    });
  }
}

function apiMetrics(req, res, next) {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    recordApiCall(req, res, ms).catch(() => {});
  });
  next();
}

async function readOpsSnapshot() {
  const redisUp = await redisCmd(async (redis) => {
    const now = Date.now();
    await redis.zRemRangeByScore(ACTIVE_KEY, 0, now - ACTIVE_WINDOW_MS);
    const activeUsers = await redis.zCard(ACTIVE_KEY);
    const endpoints = new Map();
    for await (const key of redis.scanIterator({ MATCH: 'metrics:h:*', COUNT: 200 })) {
      const data = await redis.hGetAll(key);
      for (const [field, raw] of Object.entries(data || {})) {
        const split = field.lastIndexOf(':');
        if (split < 0) continue;
        const id = field.slice(0, split);
        const kind = field.slice(split + 1);
        const row = endpoints.get(id) || { id, count: 0, sumMs: 0, maxMs: 0, errors: 0 };
        const n = Number(raw) || 0;
        if (kind === 'n') row.count += n;
        else if (kind === 'ms') row.sumMs += n;
        else if (kind === 'max') row.maxMs = Math.max(row.maxMs, n);
        else if (kind === 's5') row.errors += n;
        endpoints.set(id, row);
      }
    }
    const list = [...endpoints.values()].map((row) => {
      const sep = row.id.indexOf('\u001f');
      return {
        method: sep >= 0 ? row.id.slice(0, sep) : '',
        route: sep >= 0 ? row.id.slice(sep + 1) : row.id,
        count: row.count,
        avgMs: row.count ? Math.round(row.sumMs / row.count) : 0,
        maxMs: row.maxMs,
        errors: row.errors,
      };
    });
    list.sort((a, b) => b.count - a.count);
    return { activeUsers, endpoints: list.slice(0, 40) };
  });

  const errors = await PlatformError.find().sort({ at: -1 }).limit(40).lean();
  return {
    redis: redisUp ? 'up' : 'down',
    activeUsers: redisUp?.activeUsers || 0,
    endpoints: redisUp?.endpoints || [],
    errors: errors.map((e) => ({
      id: e._id,
      message: e.message,
      route: e.route,
      method: e.method,
      status: e.status,
      shopId: e.shopId,
      at: e.at,
    })),
  };
}

module.exports = {
  apiMetrics,
  readOpsSnapshot,
  logApiError,
  ACTIVE_WINDOW_MS,
  HOUR_TTL_SEC,
};
