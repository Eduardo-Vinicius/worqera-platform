/**
 * In-memory metrics queue. A request only pushes a sample (bounded queue);
 * a background worker writes aggregated rows to Mongo every few seconds and on shutdown.
 * Writing never blocks or fails a request.
 */
const { saoPauloDayKey } = require('./planCap');

const MAX_QUEUE = 20000;
const FLUSH_MS = 5000;
const ACTIVE_REWRITE_MS = 10 * 60 * 1000;
const MAX_ERRORS_PER_FLUSH = 50;
const BANDS = [50, 100, 250, 500, 1000, 2500];
const UFS = new Set('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' '));

const queue = [];
const seen = new Map();
const regions = new Map();
const state = { dropped: 0, lastFlushAt: null, lastFlushMs: 0, lastError: null, timer: null, flushing: false };

function enabled() {
  const flag = String(process.env.WORQERA_Metrics__Enabled ?? 'true').toLowerCase();
  return !['0', 'false', 'off', 'no'].includes(flag);
}

function bucketStart(date) {
  const ms = new Date(date).getTime();
  return new Date(ms - (ms % (30 * 60 * 1000)));
}

function latencyBin(ms) {
  const i = BANDS.findIndex((edge) => ms <= edge);
  return i === -1 ? BANDS.length : i;
}

/** Upper edge of the band holding the 95th percentile; the open band uses the real max. */
function p95FromHistogram(hist, maxMs) {
  const total = hist.reduce((a, b) => a + (b || 0), 0);
  if (!total) return 0;
  const target = total * 0.95;
  let acc = 0;
  for (let i = 0; i < hist.length; i += 1) {
    acc += hist[i] || 0;
    if (acc >= target) return i < BANDS.length ? BANDS[i] : maxMs;
  }
  return maxMs;
}

function statusClass(status) {
  const s = Number(status) || 0;
  if (s >= 500) return '5xx';
  if (s >= 400) return '4xx';
  if (s >= 300) return '3xx';
  return '2xx';
}

/** web · android · ios · admin · api, from the app headers, the admin path or the browser. */
function clientOf(req) {
  const h = req?.headers || {};
  const path = String(req?.originalUrl || req?.url || '').split('?')[0];
  const appVersion = h['x-worqera-app-version'] ? String(h['x-worqera-app-version']).slice(0, 40) : null;
  if (String(h['x-worqera-client'] || '').toLowerCase() === 'mobile') {
    const platform = String(h['x-worqera-platform'] || '').toLowerCase() === 'ios' ? 'ios' : 'android';
    return { client: platform, platform, appVersion };
  }
  if (path.startsWith('/api/v1/platform')) return { client: 'admin', platform: null, appVersion: null };
  if (h.origin || h.referer) return { client: 'web', platform: null, appVersion: null };
  if (h.authorization) return { client: 'api', platform: null, appVersion: null };
  return { client: 'web', platform: null, appVersion: null };
}

function ufFromAddress(address) {
  const text = String(address || '').toUpperCase();
  const matches = text.match(/(?:^|[\s,/(-])([A-Z]{2})(?=\s*(?:[,)/-]|\d{5}|$))/g) || [];
  for (let i = matches.length - 1; i >= 0; i -= 1) {
    const uf = matches[i].replace(/[^A-Z]/g, '');
    if (UFS.has(uf)) return uf;
  }
  return null;
}

function enqueue(sample) {
  if (!enabled()) return;
  if (queue.length >= MAX_QUEUE) {
    state.dropped += 1;
    return;
  }
  queue.push(sample);
}

/** Pure: a batch of samples → bucket upserts, 5xx samples and active-account rows. */
function buildOps(batch, { seen: cache = seen, now = new Date() } = {}) {
  const buckets = new Map();
  const errors = [];
  const actives = new Map();
  for (const s of batch) {
    const status = statusClass(s.status);
    const filter = { start: bucketStart(s.at), route: s.route, method: s.method, status, client: s.client };
    const key = `${filter.start.getTime()}|${s.route}|${s.method}|${status}|${s.client}`;
    let row = buckets.get(key);
    if (!row) {
      row = { filter, inc: { count: 0, errors4xx: 0, errors5xx: 0, totalMs: 0 }, max: { maxMs: 0 } };
      buckets.set(key, row);
    }
    const ms = Math.max(0, Math.round(s.ms || 0));
    row.inc.count += 1;
    row.inc.totalMs += ms;
    if (status === '4xx') row.inc.errors4xx += 1;
    if (status === '5xx') row.inc.errors5xx += 1;
    const band = `h${latencyBin(ms)}`;
    row.inc[band] = (row.inc[band] || 0) + 1;
    row.max.maxMs = Math.max(row.max.maxMs, ms);

    if (status === '5xx' && errors.length < MAX_ERRORS_PER_FLUSH) {
      errors.push({
        at: s.at,
        route: s.route,
        method: s.method,
        status: s.status,
        code: s.code || '',
        message: String(s.message || '').slice(0, 300),
        correlationId: s.correlationId || '',
        client: s.client,
        shopId: s.shopId || null,
      });
    }

    if (s.userId) {
      const cacheKey = `${s.userId}|${s.client}`;
      const last = cache.get(cacheKey);
      const day = saoPauloDayKey(s.at);
      if (!last || last.day !== day || now - last.at >= ACTIVE_REWRITE_MS) {
        actives.set(`${day}|${s.userId}|${s.client}`, {
          day,
          userId: String(s.userId),
          shopId: s.shopId ? String(s.shopId) : null,
          client: s.client,
          platform: s.platform || null,
          appVersion: s.appVersion || null,
          at: s.at,
        });
        cache.set(cacheKey, { day, at: now });
      }
    }
  }
  if (cache.size > 50000) cache.clear();
  return { buckets: [...buckets.values()], errors, actives: [...actives.values()] };
}

async function regionsFor(shopIds) {
  const Shop = require('../models/Shop');
  const now = Date.now();
  const missing = shopIds.filter((id) => {
    const hit = regions.get(id);
    return !hit || now - hit.at > 60 * 60 * 1000;
  });
  if (missing.length) {
    const rows = await Shop.find({ _id: { $in: missing } }).select('branding.address').lean();
    for (const id of missing) regions.set(id, { uf: null, at: now });
    for (const row of rows) regions.set(String(row._id), { uf: ufFromAddress(row.branding?.address), at: now });
  }
  return (id) => regions.get(id)?.uf || null;
}

async function flush() {
  if (state.flushing || !queue.length) return;
  state.flushing = true;
  const started = Date.now();
  const batch = queue.splice(0, queue.length);
  try {
    const MetricBucket = require('../models/MetricBucket');
    const ErrorSample = require('../models/ErrorSample');
    const ActiveAccount = require('../models/ActiveAccount');
    const ops = buildOps(batch);
    if (ops.buckets.length) {
      await MetricBucket.bulkWrite(
        ops.buckets.map((b) => ({
          updateOne: { filter: b.filter, update: { $inc: b.inc, $max: b.max }, upsert: true },
        })),
        { ordered: false }
      );
    }
    if (ops.errors.length) await ErrorSample.insertMany(ops.errors, { ordered: false });
    if (ops.actives.length) {
      const shopIds = [...new Set(ops.actives.map((a) => a.shopId).filter((id) => id && /^[a-f0-9]{24}$/i.test(id)))];
      const ufOf = shopIds.length ? await regionsFor(shopIds) : () => null;
      await ActiveAccount.bulkWrite(
        ops.actives.map((a) => ({
          updateOne: {
            filter: { day: a.day, userId: a.userId, client: a.client },
            update: {
              $set: {
                dayDate: new Date(`${a.day}T12:00:00.000Z`),
                shopId: a.shopId,
                platform: a.platform,
                appVersion: a.appVersion,
                region: a.shopId ? ufOf(a.shopId) : null,
                lastSeenAt: a.at,
              },
              $setOnInsert: { firstSeenAt: a.at },
            },
            upsert: true,
          },
        })),
        { ordered: false }
      );
    }
    state.lastError = null;
  } catch (err) {
    state.lastError = String(err?.message || err).slice(0, 200);
    console.warn('[metrics] flush failed:', state.lastError);
  } finally {
    state.lastFlushAt = new Date();
    state.lastFlushMs = Date.now() - started;
    state.flushing = false;
  }
}

function start() {
  if (state.timer || !enabled()) return;
  state.timer = setInterval(() => flush().catch(() => {}), FLUSH_MS);
  state.timer.unref?.();
}

async function stop() {
  if (state.timer) clearInterval(state.timer);
  state.timer = null;
  await flush().catch(() => {});
}

function stats() {
  return {
    enabled: enabled(),
    queued: queue.length,
    dropped: state.dropped,
    lastFlushAt: state.lastFlushAt,
    lastFlushMs: state.lastFlushMs,
    lastError: state.lastError,
  };
}

module.exports = {
  BANDS,
  bucketStart,
  latencyBin,
  p95FromHistogram,
  statusClass,
  clientOf,
  ufFromAddress,
  enqueue,
  buildOps,
  flush,
  start,
  stop,
  stats,
};
