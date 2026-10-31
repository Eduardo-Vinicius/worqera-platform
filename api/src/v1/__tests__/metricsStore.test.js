const test = require('node:test');
const assert = require('node:assert/strict');
const store = require('../lib/metricsStore');

test('30-minute windows, latency bands and approximate p95', () => {
  assert.equal(store.bucketStart(new Date('2026-10-31T14:44:10.000Z')).toISOString(), '2026-10-31T14:30:00.000Z');
  assert.equal(store.bucketStart(new Date('2026-10-31T14:05:00.000Z')).toISOString(), '2026-10-31T14:00:00.000Z');
  assert.deepEqual([10, 50, 51, 300, 999, 2500, 9000].map(store.latencyBin), [0, 0, 1, 3, 4, 5, 6]);
  // 100 requests: 90 under 50 ms, 6 under 250 ms, 4 over 2.5 s → p95 falls in the ≤250 band
  assert.equal(store.p95FromHistogram([90, 0, 6, 0, 0, 0, 4], 4000), 250);
  assert.equal(store.p95FromHistogram([0, 0, 0, 0, 0, 0, 10], 4000), 4000);
  assert.equal(store.p95FromHistogram([0, 0, 0, 0, 0, 0, 0], 0), 0);
  assert.deepEqual([200, 304, 404, 409, 500].map(store.statusClass), ['2xx', '3xx', '4xx', '4xx', '5xx']);
});

test('client comes from the app headers, the admin path or the browser', () => {
  const req = (path, headers = {}) => ({ originalUrl: path, headers });
  assert.deepEqual(store.clientOf(req('/api/v1/orders', { 'x-worqera-client': 'mobile', 'x-worqera-platform': 'ios', 'x-worqera-app-version': '1.4.0+12' })), {
    client: 'ios',
    platform: 'ios',
    appVersion: '1.4.0+12',
  });
  assert.equal(store.clientOf(req('/api/v1/orders', { 'x-worqera-client': 'mobile', 'x-worqera-platform': 'android' })).client, 'android');
  assert.equal(store.clientOf(req('/api/v1/platform/ops', { origin: 'https://worqera.com' })).client, 'admin');
  assert.equal(store.clientOf(req('/api/v1/orders', { origin: 'https://worqera.com' })).client, 'web');
  assert.equal(store.clientOf(req('/api/v1/orders', { authorization: 'Bearer x' })).client, 'api');
});

test('UF is read from the shop address', () => {
  assert.equal(store.ufFromAddress('Av. Paulista, 1000 - São Paulo - SP'), 'SP');
  assert.equal(store.ufFromAddress('Rua A, 10, Belo Horizonte/MG, 30100-000'), 'MG');
  assert.equal(store.ufFromAddress('Rua XY, 10'), null);
  assert.equal(store.ufFromAddress(''), null);
});

test('a batch becomes bucket increments, 5xx samples and active accounts', () => {
  const at = new Date('2026-10-31T15:10:00.000Z');
  const base = { at, method: 'GET', route: '/api/v1/orders', client: 'web', platform: null, appVersion: null, shopId: 's1', correlationId: 'c' };
  const batch = [
    { ...base, status: 200, ms: 40, userId: 'u1' },
    { ...base, status: 200, ms: 300, userId: 'u1' },
    { ...base, status: 500, ms: 1200, userId: 'u2', code: 'INTERNAL_ERROR', message: 'boom' },
    { ...base, status: 409, ms: 20, userId: null },
  ];
  const ops = store.buildOps(batch, { seen: new Map(), now: at });
  const ok = ops.buckets.find((b) => b.filter.status === '2xx');
  assert.equal(ok.inc.count, 2);
  assert.equal(ok.inc.totalMs, 340);
  assert.equal(ok.inc.h0, 1);
  assert.equal(ok.inc.h3, 1);
  assert.equal(ok.max.maxMs, 300);
  const bad = ops.buckets.find((b) => b.filter.status === '5xx');
  assert.equal(bad.inc.errors5xx, 1);
  const conflict = ops.buckets.find((b) => b.filter.status === '4xx');
  assert.equal(conflict.inc.errors4xx, 1);
  assert.equal(ops.errors.length, 1);
  assert.equal(ops.errors[0].message, 'boom');
  assert.deepEqual(ops.actives.map((a) => a.userId).sort(), ['u1', 'u2']);
  assert.equal(ops.actives[0].day, '2026-10-31');

  // Within 10 minutes the same user is not written again.
  const seen = new Map();
  store.buildOps(batch, { seen, now: at });
  const again = store.buildOps(batch, { seen, now: new Date(at.getTime() + 5 * 60000) });
  assert.equal(again.actives.length, 0);
});
