const test = require('node:test');
const assert = require('node:assert/strict');
const { summarize } = require('../services/quoteService');

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-11-04T12:00:00Z');
const ago = (d) => new Date(now.getTime() - d * DAY);

const rows = [
  { stage: 'new', value: 100, createdAt: ago(10), lastContactAt: null },
  { stage: 'contact', value: 200, createdAt: ago(20), lastContactAt: ago(2) },
  { stage: 'followup', value: 300, createdAt: ago(30), lastContactAt: ago(9) },
  { stage: 'lost', reason: 'price', value: 150, createdAt: ago(40), lostAt: ago(20) },
  { stage: 'lost', reason: 'price', value: 50, createdAt: ago(40), lostAt: ago(10) },
  { stage: 'lost', reason: 'deadline', value: 500, createdAt: ago(40), lostAt: ago(5) },
  { stage: 'lost', reason: 'price', value: 999, createdAt: ago(200), lostAt: ago(120) },
  { stage: 'won', value: 400, createdAt: ago(12), wonAt: ago(10) },
  { stage: 'won', value: 400, createdAt: ago(14), wonAt: ago(8) },
];

test('summary: value by open stage and quotes going cold', () => {
  const s = summarize(rows, now);
  assert.deepEqual(s.openValueByStage, { new: 100, contact: 200, followup: 300 });
  assert.deepEqual(s.cooling, { count: 2, value: 400 }, 'new without contact for 10d + followup 9d');
});

test('summary: lost reasons of the last 90 days, most frequent first', () => {
  const s = summarize(rows, now);
  assert.deepEqual(
    s.lostReasons90d.map((r) => [r.reason, r.count, r.value]),
    [
      ['price', 2, 200],
      ['deadline', 1, 500],
    ]
  );
  assert.equal(s.lostReasons90d[0].label, 'Preço');
});

test('summary: median days to win', () => {
  assert.equal(summarize(rows, now).medianDaysToWin90d, 4);
  assert.equal(summarize(rows.filter((r) => r.stage !== 'won'), now).medianDaysToWin90d, null);
});
