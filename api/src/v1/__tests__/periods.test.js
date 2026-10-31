const test = require('node:test');
const assert = require('node:assert/strict');
const periods = require('../lib/periods');

test('periods are São Paulo days, with the previous period of the same length', () => {
  const now = new Date('2026-10-31T15:00:00.000Z'); // 12:00 in São Paulo
  const today = periods.range(1, now);
  assert.equal(today.from.toISOString(), '2026-10-31T03:00:00.000Z');
  assert.equal(today.prevFrom.toISOString(), '2026-10-30T03:00:00.000Z');
  assert.equal(today.prevTo.toISOString(), '2026-10-31T03:00:00.000Z');
  assert.deepEqual(today.days, ['2026-10-31']);

  const week = periods.range(7, now);
  assert.equal(week.from.toISOString(), '2026-10-25T03:00:00.000Z');
  assert.equal(week.days.length, 7);
  assert.equal(week.days[0], '2026-10-25');
  assert.equal(week.prevFrom.toISOString(), '2026-10-18T03:00:00.000Z');
  assert.deepEqual(week.prevDays.slice(-1), ['2026-10-24']);
});

test('days are clamped to the allowed list and deltas handle zero', () => {
  assert.equal(periods.parseDays('14', [1, 7, 14, 30], 7), 14);
  assert.equal(periods.parseDays('999', [1, 7, 14, 30], 7), 7);
  assert.equal(periods.parseDays(undefined, [7, 14, 30, 90], 30), 30);
  assert.deepEqual(periods.delta(150, 100), { value: 150, prev: 100, pct: 50 });
  assert.deepEqual(periods.delta(5, 0), { value: 5, prev: 0, pct: null });
  assert.deepEqual(periods.delta(0, 0), { value: 0, prev: 0, pct: 0 });
  assert.deepEqual(periods.fillSeries(['2026-10-30', '2026-10-31'], [{ _id: '2026-10-31', value: 3 }]), [
    { day: '2026-10-30', value: 0 },
    { day: '2026-10-31', value: 3 },
  ]);
});
