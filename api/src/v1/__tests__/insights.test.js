const test = require('node:test');
const assert = require('node:assert/strict');
const { rules } = require('../services/platformInsights');
const { slaOf, summarize } = require('../services/platformQueues');

const quiet = {
  days: 7,
  signups: { cur: 10, prev: 10 },
  routes: [],
  overallErrorRate: 0.2,
  activation: { curRate: 50, prevRate: 50, curBase: 10, prevBase: 10 },
  app: { latest: '1.2.0', onLatestPct: 90, mobileUsers: 40 },
  stalledShops: 0,
  stuckOnboarding: 0,
  queues: [],
  cancellations: { cur: 0, prev: 0 },
  growth: null,
};
const ids = (facts) => rules({ ...quiet, ...facts }).map((i) => i.id);

test('nothing fires on a quiet week', () => {
  assert.deepEqual(rules(quiet), []);
});

test('signups up or down more than 25%', () => {
  assert.ok(ids({ signups: { cur: 4, prev: 10 } }).includes('signups-down'));
  assert.ok(ids({ signups: { cur: 15, prev: 10 } }).includes('signups-up'));
  assert.ok(!ids({ signups: { cur: 2, prev: 1 } }).includes('signups-up'), 'tiny bases are noise');
});

test('a route erroring or getting slower', () => {
  const routes = [{ method: 'GET', route: '/api/v1/orders', count: 400, errors5xx: 20, p95: 250, prevP95: 250 }];
  const errs = rules({ ...quiet, routes, overallErrorRate: 1 });
  const hit = errs.find((i) => i.id.startsWith('route-errors'));
  assert.ok(hit);
  assert.equal(hit.severity, 'critical');
  assert.match(hit.detail, /5%/);
  const slow = [{ method: 'POST', route: '/api/v1/orders', count: 100, errors5xx: 0, p95: 1000, prevP95: 500 }];
  assert.ok(ids({ routes: slow }).some((id) => id.startsWith('route-slow')));
});

test('activation moved more than 10 p.p.', () => {
  assert.ok(ids({ activation: { curRate: 30, prevRate: 55, curBase: 10, prevBase: 10 } }).includes('activation-down'));
  assert.ok(ids({ activation: { curRate: 70, prevRate: 55, curBase: 10, prevBase: 10 } }).includes('activation-up'));
});

test('old app version, stalled shops, queues over SLA, churn and growth', () => {
  assert.ok(ids({ app: { latest: '1.3.0', onLatestPct: 60, mobileUsers: 30 } }).includes('app-rollout'));
  assert.ok(ids({ stalledShops: 3 }).includes('shops-stalled'));
  assert.ok(ids({ stuckOnboarding: 2 }).includes('onboarding-stuck'));
  assert.ok(ids({ queues: [{ key: 'overdue', label: 'Pagamento atrasado', count: 2, oldestHours: 60 }] }).includes('queue-overdue'));
  assert.ok(!ids({ queues: [{ key: 'overdue', label: 'Pagamento atrasado', count: 2, oldestHours: 10 }] }).includes('queue-overdue'));
  assert.ok(ids({ cancellations: { cur: 4, prev: 1 } }).includes('churn-spike'));
  const growth = rules({ ...quiet, growth: { label: 'Marcenaria', count: 3 } }).find((i) => i.id === 'growth');
  assert.equal(growth.severity, 'positive');
});

test('queue SLA: green under 24 h, yellow under 48 h, red after', () => {
  const now = new Date('2026-10-31T12:00:00.000Z');
  assert.equal(slaOf(new Date(now - 5 * 3600000), now).sla, 'ok');
  assert.equal(slaOf(new Date(now - 30 * 3600000), now).sla, 'warn');
  assert.equal(slaOf(new Date(now - 50 * 3600000), now).sla, 'late');
  const s = summarize([{ since: new Date(now - 10 * 3600000) }, { since: new Date(now - 50 * 3600000) }], now);
  assert.deepEqual(s, { count: 2, oldestHours: 50, sla: 'late' });
});
