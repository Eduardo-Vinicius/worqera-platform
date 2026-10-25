const test = require('node:test');
const assert = require('node:assert/strict');
const { quotePriority, isDueToday, followUpState } = require('../lib/quotePriority');
const { templateOptions } = require('../services/quoteMessages');
const { summarize } = require('../services/quoteService');

const now = new Date('2026-10-24T15:00:00.000Z'); // 12:00 em São Paulo

test('overdue follow-up beats a fresh quote', () => {
  const overdue = quotePriority(
    { stage: 'followup', followUpAt: '2026-10-21T15:00:00.000Z', reason: 'price', value: 380 },
    now
  );
  const later = quotePriority(
    { stage: 'followup', followUpAt: '2026-10-30T15:00:00.000Z', reason: 'no_need', value: 50 },
    now
  );
  assert.equal(overdue.level, 'high');
  assert.equal(later.level, 'low');
  assert.ok(overdue.score > later.score);
  assert.match(overdue.hint, /atrasado 3 dias/);
});

test('today list keeps due, overdue and new without a date', () => {
  assert.equal(isDueToday({ stage: 'new' }, now), true);
  assert.equal(isDueToday({ stage: 'contact' }, now), false);
  assert.equal(isDueToday({ stage: 'followup', followUpAt: '2026-10-24T22:00:00.000Z' }, now), true);
  assert.equal(isDueToday({ stage: 'followup', followUpAt: '2026-10-25T12:00:00.000Z' }, now), false);
  assert.equal(isDueToday({ stage: 'won', followUpAt: '2026-10-20T12:00:00.000Z' }, now), false);
});

test('the São Paulo day decides today vs overdue', () => {
  // 01:00 UTC on the 24th is still the 23rd in São Paulo.
  assert.equal(followUpState('2026-10-24T01:00:00.000Z', now).state, 'overdue');
  assert.equal(followUpState('2026-10-24T03:30:00.000Z', now).state, 'today');
});

test('templates name the customer and the shop without an API key', () => {
  const [direct] = templateOptions({
    name: 'João Silva',
    what: 'Nike Air Force',
    value: 250,
    reason: 'price',
    shopName: 'Sapataria Paulista',
  });
  assert.match(direct.text, /Oi João/);
  assert.match(direct.text, /Sapataria Paulista/);
  assert.match(direct.text, /Nike Air Force/);
});

test('summary counts recovery over the last 30 days', () => {
  const summary = summarize(
    [
      { stage: 'new', value: 100 },
      { stage: 'followup', value: 200, followUpAt: '2026-10-20T12:00:00.000Z' },
      { stage: 'won', value: 300, wonAt: '2026-10-20T12:00:00.000Z' },
      { stage: 'lost', value: 90, lostAt: '2026-10-19T12:00:00.000Z' },
      { stage: 'won', value: 999, wonAt: '2026-08-01T12:00:00.000Z' },
    ],
    now
  );
  assert.equal(summary.openCount, 2);
  assert.equal(summary.openValue, 300);
  assert.equal(summary.overdueCount, 1);
  assert.equal(summary.todayCount, 2);
  assert.equal(summary.wonCount30d, 1);
  assert.equal(summary.wonValue30d, 300);
  assert.equal(summary.recoveryRate, 50);
});
