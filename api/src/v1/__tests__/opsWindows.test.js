const test = require('node:test');
const assert = require('node:assert/strict');
const { hourStampMs, windowsForHour } = require('../middleware/apiMetrics');

test('hourStampMs reads the redis hour key as UTC', () => {
  assert.equal(hourStampMs('metrics:h:2026-10-05T00'), Date.parse('2026-10-05T00:00:00.000Z'));
  assert.equal(hourStampMs('nope'), null);
});

test('windowsForHour keeps the current hour in all three ranges', () => {
  const hour = Date.parse('2026-10-05T00:00:00.000Z');
  const now = hour + 20 * 60 * 1000;
  const hit = windowsForHour(hour, now);
  assert.equal(hit['1h'], true);
  assert.equal(hit['24h'], true);
  assert.equal(hit['30d'], true);
});

test('windowsForHour drops an hour older than a day from the short windows', () => {
  const hour = Date.parse('2026-10-03T00:00:00.000Z');
  const now = Date.parse('2026-10-05T12:00:00.000Z');
  const hit = windowsForHour(hour, now);
  assert.equal(hit['1h'], false);
  assert.equal(hit['24h'], false);
  assert.equal(hit['30d'], true);
});
