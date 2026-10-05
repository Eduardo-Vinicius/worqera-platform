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

const WINDOW_MS = {
  '1h': 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

function hourStampMs(key) {
  const stamp = String(key).replace(/^metrics:h:/, '');
  const ms = Date.parse(`${stamp}:00:00.000Z`);
  return Number.isFinite(ms) ? ms : null;
}

function windowsForHour(hourMs, nowMs) {
  const age = nowMs - hourMs;
  const hit = {};
  for (const [name, span] of Object.entries(WINDOW_MS)) {
    hit[name] = age >= 0 && age < span;
  }
  return hit;
}

function blankRow(id) {
  return { id, count: 0, sumMs: 0, maxMs: 0, s2: 0, s4: 0, s5: 0 };
}

function presentWindow(map) {
  let calls = 0;
  let errors = 0;
  let sumMs = 0;
  const endpoints = [...map.values()].map((row) => {
    calls += row.count;
    errors += row.s5;
    sumMs += row.sumMs;
    const sep = row.id.indexOf('\u001f');
    const count = row.count;
    return {
      method: sep >= 0 ? row.id.slice(0, sep) : '',
      route: sep >= 0 ? row.id.slice(sep + 1) : row.id,
      count,
      avgMs: count ? Math.round(row.sumMs / count) : 0,
      maxMs: row.maxMs,
      ok: row.s2,
      clientErrors: row.s4,
      errors: row.s5,
      errorRate: count ? Math.round((row.s5 / count) * 1000) / 10 : 0,
    };
  });
  endpoints.sort((a, b) => b.count - a.count);
  return {
    calls,
    errors,
    avgMs: calls ? Math.round(sumMs / calls) : 0,
    endpoints,
  };
}

function emptyWindows() {
  return {
    '1h': presentWindow(new Map()),
    '24h': presentWindow(new Map()),
    '30d': presentWindow(new Map()),
  };
}

async function readOpsSnapshot() {
  const redisUp = await redisCmd(async (redis) => {
    const now = Date.now();
    await redis.zRemRangeByScore(ACTIVE_KEY, 0, now - ACTIVE_WINDOW_MS);
    const activeUsers = await redis.zCard(ACTIVE_KEY);
    const buckets = {
      '1h': new Map(),
      '24h': new Map(),
      '30d': new Map(),
    };
    for await (const rawKey of redis.scanIterator({ MATCH: 'metrics:h:*', COUNT: 200 })) {
      const key = String(rawKey);
      const hourMs = hourStampMs(key);
      if (hourMs == null) continue;
      const which = windowsForHour(hourMs, now);
      if (!which['30d']) continue;
      const data = await redis.hGetAll(key);
      for (const [field, raw] of Object.entries(data || {})) {
        const split = field.lastIndexOf(':');
        if (split < 0) continue;
        const id = field.slice(0, split);
        const kind = field.slice(split + 1);
        const n = Number(raw) || 0;
        for (const name of Object.keys(buckets)) {
          if (!which[name]) continue;
          let row = buckets[name].get(id);
          if (!row) {
            row = blankRow(id);
            buckets[name].set(id, row);
          }
          if (kind === 'n') row.count += n;
          else if (kind === 'ms') row.sumMs += n;
          else if (kind === 'max') row.maxMs = Math.max(row.maxMs, n);
          else if (kind === 's2') row.s2 += n;
          else if (kind === 's4') row.s4 += n;
          else if (kind === 's5') row.s5 += n;
        }
      }
    }
    return {
      activeUsers,
      windows: {
        '1h': presentWindow(buckets['1h']),
        '24h': presentWindow(buckets['24h']),
        '30d': presentWindow(buckets['30d']),
      },
    };
  });

  const errors = await PlatformError.find().sort({ at: -1 }).limit(100).lean();
  const windows = redisUp?.windows || emptyWindows();
  return {
    redis: redisUp ? 'up' : 'down',
    activeUsers: redisUp?.activeUsers || 0,
    windows,
    endpoints: windows['30d'].endpoints,
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
  hourStampMs,
  windowsForHour,
  ACTIVE_WINDOW_MS,
  HOUR_TTL_SEC,
};
