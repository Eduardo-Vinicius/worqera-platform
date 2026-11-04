const test = require('node:test');
const assert = require('node:assert/strict');
const { isDue, avgGap } = require('../services/crmService');

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-11-04T12:00:00Z');
const ago = (d) => new Date(now.getTime() - d * DAY);

test('avgGap: days between orders, null below 2 orders', () => {
  assert.equal(avgGap({ orders: 1, firstAt: ago(90), lastAt: ago(90) }), null);
  assert.equal(avgGap({ orders: 3, firstAt: ago(100), lastAt: ago(40) }), 30);
});

test('isDue: past 1.3× their own gap, nothing open, not yet gone quiet', () => {
  const monthly = { orders: 3, open: 0, firstAt: ago(100), lastAt: ago(40) }; // gap 30 → due from 39 days
  assert.equal(isDue(monthly, now, 90), true);
  assert.equal(isDue({ ...monthly, lastAt: ago(20), firstAt: ago(80) }, now, 90), false, 'still inside the gap');
  assert.equal(isDue({ ...monthly, open: 1 }, now, 90), false, 'has an open order');
  assert.equal(isDue({ ...monthly, lastAt: ago(120), firstAt: ago(180) }, now, 90), false, 'already inactive');
  assert.equal(isDue({ orders: 1, open: 0, firstAt: ago(50), lastAt: ago(50) }, now, 90), false, 'single order');
});

test('isDue: at least 14 days even for very frequent clients', () => {
  const weekly = { orders: 10, open: 0, firstAt: ago(73), lastAt: ago(10) }; // gap 7 → 1.3× = 9, floor 14
  assert.equal(isDue(weekly, now, 90), false);
  assert.equal(isDue({ ...weekly, lastAt: ago(15), firstAt: ago(78) }, now, 90), true);
});
