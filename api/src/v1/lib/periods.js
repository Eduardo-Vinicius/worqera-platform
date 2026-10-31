/** Admin periods: whole São Paulo days (UTC−3, no daylight saving), plus the previous period of the same length. */
const DAY = 24 * 60 * 60 * 1000;
const SP_OFFSET_MS = 3 * 60 * 60 * 1000;
const TZ = 'America/Sao_Paulo';

function spDayStart(date) {
  const local = new Date(date.getTime() - SP_OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) + SP_OFFSET_MS);
}

function dayKey(date) {
  return new Date(date.getTime() - SP_OFFSET_MS).toISOString().slice(0, 10);
}

function dayList(from, count) {
  return Array.from({ length: count }, (_, i) => dayKey(new Date(from.getTime() + i * DAY)));
}

/** `days` = 1 (today) or N whole days ending today. */
function range(days, now = new Date()) {
  const n = Math.max(1, Number(days) || 7);
  const today = spDayStart(now);
  const from = new Date(today.getTime() - (n - 1) * DAY);
  const prevFrom = new Date(from.getTime() - n * DAY);
  return { days: dayList(from, n), prevDays: dayList(prevFrom, n), from, to: now, prevFrom, prevTo: from, n };
}

function parseDays(raw, allowed, fallback) {
  const n = Number(raw);
  return allowed.includes(n) ? n : fallback;
}

function delta(value, prev) {
  const v = Number(value) || 0;
  const p = Number(prev) || 0;
  if (!p) return { value: v, prev: p, pct: v ? null : 0 };
  return { value: v, prev: p, pct: Math.round(((v - p) / p) * 1000) / 10 };
}

/** Aggregation rows `{ _id: 'YYYY-MM-DD', value }` → one point per day, zeros included. */
function fillSeries(days, rows, field = 'value') {
  const map = new Map(rows.map((r) => [r._id, Number(r[field]) || 0]));
  return days.map((day) => ({ day, value: map.get(day) || 0 }));
}

/** `$dateToString` in São Paulo, for `$group` by day. */
function dayExpr(field) {
  return { $dateToString: { format: '%Y-%m-%d', date: field, timezone: TZ } };
}

const cache = new Map();
/** Short in-memory cache for heavy admin queries. */
async function memo(key, ttlMs, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value;
  const value = await fn();
  cache.set(key, { value, at: Date.now() });
  if (cache.size > 500) cache.delete(cache.keys().next().value);
  return value;
}

module.exports = { DAY, TZ, spDayStart, dayKey, dayList, range, parseDays, delta, fillSeries, dayExpr, memo };
