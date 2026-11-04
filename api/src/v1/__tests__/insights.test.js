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
  assert.equal(s.count, 2);
  assert.equal(s.oldestHours, 50);
  assert.equal(s.sla, 'late');
  assert.equal(s.slaHours, 48);
  assert.equal(s.overdueCount, 1, 'only the 50 h item is past the SLA');
  assert.equal(s.severity, 'critical');
  assert.equal(summarize([{ since: new Date(now - 10 * 3600000) }], now).severity, 'warn');
  assert.equal(summarize([], now).severity, 'ok');
});

test('insights get a category, the system rule fires when degraded', () => {
  const { rules, countBySeverity } = require('../services/platformInsights');
  const base = {
    days: 7,
    signups: { cur: 0, prev: 0 },
    routes: [],
    overallErrorRate: 0,
    activation: { curRate: 0, prevRate: 0, curBase: 0, prevBase: 0 },
    app: { latest: null, onLatestPct: 100, mobileUsers: 0 },
    stalledShops: 0,
    stuckOnboarding: 0,
    queues: [],
    cancellations: { cur: 0, prev: 0 },
    growth: null,
  };
  const out = rules({ ...base, health: { status: 'degraded', reasons: ['A coleta falhou'] }, stalledShops: 2 });
  const system = out.find((i) => i.id === 'system-degraded');
  assert.equal(system.category, 'Confiabilidade');
  assert.equal(system.detail, 'A coleta falhou');
  assert.equal(out.find((i) => i.id === 'shops-stalled').category, 'Retenção');
  assert.deepEqual(countBySeverity(out), { critical: 0, warn: 2, info: 0, positive: 0 });
  assert.equal(rules({ ...base, health: { status: 'healthy' } }).length, 0);
});
