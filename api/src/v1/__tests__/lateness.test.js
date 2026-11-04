const test = require('node:test');
const assert = require('node:assert/strict');
const { lateOrderFilter, isOrderLate, isItemLate, producedAt, producedOnTime } = require('../lib/lateness');

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-11-04T12:00:00Z');
const ago = (d) => new Date(now.getTime() - d * DAY);
const FINAL = 'final';
const terminal = new Set([FINAL]);

test('isOrderLate: only production counts; ready, delivered and deleted never do', () => {
  const base = { dueAt: ago(2) };
  assert.equal(isOrderLate({ ...base, status: 'open' }, now), true);
  assert.equal(isOrderLate({ ...base, status: 'in_progress' }, now), true);
  assert.equal(isOrderLate({ ...base, status: 'ready' }, now), false, 'waiting for pickup');
  assert.equal(isOrderLate({ ...base, status: 'delivered' }, now), false);
  assert.equal(isOrderLate({ ...base, status: 'cancelled' }, now), false);
  assert.equal(isOrderLate({ ...base, status: 'open', deletedAt: ago(1) }, now), false);
  assert.equal(isOrderLate({ status: 'open', dueAt: ago(-1) }, now), false, 'due tomorrow');
  assert.equal(isOrderLate({ status: 'open' }, now), false, 'no due date');
});

test('lateOrderFilter: same rule for Mongo', () => {
  assert.deepEqual(lateOrderFilter(now), { deletedAt: null, status: { $in: ['open', 'in_progress'] }, dueAt: { $lt: now } });
});

test('isItemLate: the card already in the final sector is not late', () => {
  const order = { status: 'in_progress', dueAt: ago(1) };
  assert.equal(isItemLate(order, false, now), true);
  assert.equal(isItemLate(order, true, now), false);
});

test('producedOnTime: ready by the due date counts as on time even if picked up later', () => {
  const order = {
    dueAt: ago(10),
    deliveredAt: ago(2),
    items: [
      { sectorHistory: [{ sectorId: 'prod', enteredAt: ago(15) }, { sectorId: FINAL, enteredAt: ago(11) }] },
      { sectorHistory: [{ sectorId: FINAL, enteredAt: ago(12) }] },
    ],
  };
  assert.equal(producedAt(order, terminal), ago(11).getTime());
  assert.equal(producedOnTime(order, terminal), true);
});

test('producedOnTime: ready after the due date is late', () => {
  const order = { dueAt: ago(10), deliveredAt: ago(8), items: [{ sectorHistory: [{ sectorId: FINAL, enteredAt: ago(9) }] }] };
  assert.equal(producedOnTime(order, terminal), false);
});

test('producedOnTime: skipped the final sector → uses delivery date', () => {
  const late = { dueAt: ago(10), deliveredAt: ago(5), items: [{ sectorHistory: [{ sectorId: 'prod', enteredAt: ago(20) }] }] };
  assert.equal(producedOnTime(late, terminal), false);
  const onTime = { ...late, deliveredAt: ago(11) };
  assert.equal(producedOnTime(onTime, terminal), true);
  assert.equal(producedOnTime({ deliveredAt: ago(1) }, terminal), true, 'no due date');
});
