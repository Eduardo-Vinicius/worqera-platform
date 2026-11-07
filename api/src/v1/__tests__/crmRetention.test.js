const test = require('node:test');
const assert = require('node:assert/strict');
const { retentionFrom, returnedInfo } = require('../services/crmService');

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-11-07T15:00:00Z');
const ago = (d) => new Date(now.getTime() - d * DAY);
const o = (clientId, days, total = 100) => ({ clientId, createdAt: ago(days), pricing: { total } });

test('retention: new vs returning per month, reactivated after going quiet, second-visit rate', () => {
  const orders = [
    o('a', 200), o('a', 3, 300), // came back after 197 days → reactivated this month
    o('b', 120), o('b', 100), // second visit after 20 days
    o('c', 90), // never came back
    o('d', 5, 50), // new this month
  ].sort((x, y) => x.createdAt - y.createdAt);
  const r = retentionFrom(orders, { months: 6, now });
  const thisMonth = r.months[r.months.length - 1];
  assert.equal(r.months.length, 6);
  assert.equal(thisMonth.newClients, 1, 'd');
  assert.equal(thisMonth.returning, 1, 'a');
  assert.equal(thisMonth.reactivated, 1);
  assert.equal(thisMonth.returningValue, 300);
  assert.equal(r.returned30, 1);
  assert.equal(r.reactivated90.clients, 1);
  // a, b, c had their first order 60+ days ago: a and b came back.
  assert.equal(r.secondVisit.eligible, 3);
  assert.equal(r.secondVisit.came, 2);
  assert.equal(r.secondVisit.rate, 67);
});

test('retention without money hides values', () => {
  const r = retentionFrom([o('a', 40), o('a', 3)], { showMoney: false, now });
  assert.equal(r.months.at(-1).returningValue, undefined);
  assert.equal(r.reactivated90.value, undefined);
});

test('returnedInfo: repeat order in the last 30 days, flagged when it came after going quiet', () => {
  assert.equal(returnedInfo({ prevAt: ago(50), lastBuyAt: ago(40) }, now, 90), null, 'too long ago');
  assert.deepEqual(
    { ...returnedInfo({ prevAt: ago(130), lastBuyAt: ago(3) }, now, 90), returnedAt: undefined },
    { returnedAt: undefined, returnedAfterDays: 127, reactivated: true }
  );
  assert.equal(returnedInfo({ prevAt: null, lastBuyAt: ago(3) }, now, 90), null, 'first visit');
});
