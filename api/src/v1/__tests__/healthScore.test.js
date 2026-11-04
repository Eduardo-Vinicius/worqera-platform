const test = require('node:test');
const assert = require('node:assert/strict');
const { healthScore } = require('../lib/healthScore');

test('healthy system with low error and fast p95 is Excelente', () => {
  const h = healthScore({ requests: 500, errorRate: 0.2, p95Ms: 180, status: 'healthy' });
  assert.equal(h.score, 100);
  assert.equal(h.label, 'Excelente');
});

test('penalties add up per component', () => {
  const h = healthScore({ requests: 500, errorRate: 2.4, p95Ms: 1200, status: 'degraded', reasons: ['a', 'b'] });
  assert.deepEqual(h.components.map((c) => c.penalty), [25, 15, 20]);
  assert.equal(h.score, 40);
  assert.equal(h.label, 'Crítico');
});

test('tiny traffic does not punish errors or latency; down is zero', () => {
  assert.equal(healthScore({ requests: 5, errorRate: 50, p95Ms: 9000 }).score, 100);
  assert.equal(healthScore({ requests: 500, status: 'down' }).score, 0);
});

test('degraded is capped at 30 points', () => {
  assert.equal(healthScore({ requests: 0, status: 'degraded', reasons: ['a', 'b', 'c', 'd', 'e'] }).score, 70);
});
