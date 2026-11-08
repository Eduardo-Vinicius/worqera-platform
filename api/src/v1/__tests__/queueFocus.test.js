const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseFocus,
  parseKanbanFocus,
  matchesFocus,
  compareQueueCards,
  sortQueueCards,
  countQueueFocus,
} = require('../lib/queueFocus');

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-11-08T15:00:00.000Z'); // 12:00 em São Paulo
const ago = (d) => new Date(now.getTime() - d * DAY);
const ahead = (d) => new Date(now.getTime() + d * DAY);

function card(overrides = {}) {
  return {
    status: 'in_progress',
    itemInTerminal: false,
    dueAt: ago(1),
    priority: 2,
    createdAt: ago(2),
    ...overrides,
  };
}

test('parseFocus: only the four recortes, anything else is the full board', () => {
  assert.equal(parseFocus('late'), 'late');
  assert.equal(parseFocus('ready'), 'ready');
  assert.equal(parseFocus('due-today'), 'due-today');
  assert.equal(parseFocus('due-tomorrow'), 'due-tomorrow');
  assert.equal(parseFocus('LATE'), 'late');
  assert.equal(parseFocus(''), null);
  assert.equal(parseFocus('nope'), null);
  assert.equal(parseFocus(undefined), null);
});

test('parseKanbanFocus: ?late=1 is the old alias of focus=late', () => {
  assert.equal(parseKanbanFocus({ focus: 'due-today' }), 'due-today');
  assert.equal(parseKanbanFocus({ late: '1' }), 'late');
  assert.equal(parseKanbanFocus({ focus: 'ready', late: '1' }), 'ready');
  assert.equal(parseKanbanFocus({}), null);
});

test('late: past due and still in production; ready on the shelf is not late', () => {
  assert.equal(matchesFocus(card({ dueAt: ago(2) }), 'late', now), true);
  assert.equal(matchesFocus(card({ dueAt: ago(2), itemInTerminal: true }), 'late', now), false);
  assert.equal(matchesFocus(card({ dueAt: ago(2), status: 'ready' }), 'late', now), false);
  assert.equal(matchesFocus(card({ dueAt: ahead(1) }), 'late', now), false);
});

test('ready: item already in the final sector, order not delivered', () => {
  assert.equal(matchesFocus(card({ itemInTerminal: true, status: 'in_progress' }), 'ready', now), true);
  assert.equal(matchesFocus(card({ itemInTerminal: true, status: 'ready' }), 'ready', now), true);
  assert.equal(matchesFocus(card({ itemInTerminal: false }), 'ready', now), false);
  assert.equal(matchesFocus(card({ itemInTerminal: true, status: 'delivered' }), 'ready', now), false);
});

test('due-today and due-tomorrow follow the São Paulo day, not UTC', () => {
  // 01:00 UTC on the 8th is still the 7th in São Paulo.
  const yesterdaySp = new Date('2026-11-08T01:00:00.000Z');
  const todaySp = new Date('2026-11-08T18:00:00.000Z');
  const tomorrowSp = new Date('2026-11-09T15:00:00.000Z');
  const inProd = { status: 'in_progress', itemInTerminal: false };

  assert.equal(matchesFocus({ ...inProd, dueAt: todaySp }, 'due-today', now), true);
  assert.equal(matchesFocus({ ...inProd, dueAt: yesterdaySp }, 'due-today', now), false);
  assert.equal(matchesFocus({ ...inProd, dueAt: tomorrowSp }, 'due-today', now), false);
  assert.equal(matchesFocus({ ...inProd, dueAt: tomorrowSp }, 'due-tomorrow', now), true);
  assert.equal(matchesFocus({ ...inProd, dueAt: todaySp }, 'due-tomorrow', now), false);
  assert.equal(matchesFocus({ ...inProd, dueAt: todaySp, itemInTerminal: true }, 'due-today', now), false);
});

test('sort: 14-day late pair sits above the one that slipped yesterday', () => {
  const older = card({ dueAt: ago(14), createdAt: ago(20) });
  const newerLate = card({ dueAt: ago(1), createdAt: ago(0.5) });
  assert.ok(compareQueueCards(older, newerLate, now) < 0);
  const sorted = sortQueueCards([newerLate, older], now);
  assert.equal(sorted[0], older);
  assert.equal(sorted[1], newerLate);
});

test('sort: high priority still beats a late card; missing dueAt goes last', () => {
  const high = card({ priority: 1, dueAt: ahead(3), itemInTerminal: false });
  const late = card({ priority: 2, dueAt: ago(5) });
  const noDue = card({ dueAt: null, createdAt: ago(30) });
  const sorted = sortQueueCards([noDue, late, high], now);
  assert.equal(sorted[0], high);
  assert.equal(sorted[1], late);
  assert.equal(sorted[2], noDue);
});

test('countQueueFocus: one order with two pairs counts two cards, not one pedido', () => {
  const cards = [
    card({ dueAt: ago(3) }),
    card({ dueAt: ago(3), itemInTerminal: true, status: 'in_progress' }),
    card({ dueAt: ahead(1), status: 'open' }),
  ];
  const n = countQueueFocus(cards, now);
  assert.equal(n.late, 1);
  assert.equal(n.ready, 1);
  assert.equal(n.dueTomorrow, 1);
  assert.equal(n.dueToday, 0);
});
