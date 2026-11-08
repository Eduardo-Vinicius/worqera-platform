/**
 * Recorte da fila operacional: o mesmo predicado no KPI, no brief e no GET /kanban.
 * Conta cards (pares), não pedidos. Dia civil = America/Sao_Paulo.
 */

const { isItemLate } = require('./lateness');
const { startOfSaoPauloDay, endOfSaoPauloDay } = require('./quotePriority');

const DAY = 24 * 60 * 60 * 1000;
const FOCUSES = ['late', 'ready', 'due-today', 'due-tomorrow'];

function parseFocus(value) {
  const v = String(value || '')
    .trim()
    .toLowerCase();
  return FOCUSES.includes(v) ? v : null;
}

/** Query of GET /kanban: `focus=` wins; `late=1` is the old alias. */
function parseKanbanFocus(query = {}) {
  const fromFocus = parseFocus(query.focus);
  if (fromFocus) return fromFocus;
  const late = query.late;
  if (late === '1' || late === 1 || late === true) return 'late';
  return null;
}

function dueAtTime(card) {
  if (!card?.dueAt) return null;
  const t = new Date(card.dueAt).getTime();
  return Number.isFinite(t) ? t : null;
}

function saoPauloWindows(now = new Date()) {
  const todayStart = startOfSaoPauloDay(now);
  const todayEnd = endOfSaoPauloDay(now);
  return {
    todayStart,
    todayEnd,
    tomorrowEnd: new Date(todayEnd.getTime() + DAY),
  };
}

function stillInProduction(card) {
  if (card?.itemInTerminal) return false;
  const status = String(card?.status || '');
  return !['ready', 'delivered', 'cancelled'].includes(status);
}

function matchesFocus(card, focus, now = new Date()) {
  const key = parseFocus(focus);
  if (!key) return true;
  const order = {
    status: card?.status,
    dueAt: card?.dueAt,
    deletedAt: card?.deletedAt,
  };
  const itemInTerminal = Boolean(card?.itemInTerminal);

  if (key === 'late') return isItemLate(order, itemInTerminal, now);

  if (key === 'ready') {
    return itemInTerminal && !['delivered', 'cancelled'].includes(String(card?.status || ''));
  }

  if (!stillInProduction(card)) return false;
  const due = dueAtTime(card);
  if (due == null) return false;
  const { todayStart, todayEnd, tomorrowEnd } = saoPauloWindows(now);
  if (key === 'due-today') return due >= todayStart.getTime() && due <= todayEnd.getTime();
  if (key === 'due-tomorrow') return due > todayEnd.getTime() && due <= tomorrowEnd.getTime();
  return true;
}

function createdAtTime(card) {
  const t = new Date(card?.createdAt || 0).getTime();
  return Number.isFinite(t) ? t : 0;
}

/**
 * High priority first, then the oldest due date (late pairs of two weeks
 * sit above "slipped yesterday"), then createdAt.
 */
function compareQueueCards(a, b, now = new Date()) {
  const aHigh = Number(a?.priority) === 1 ? 0 : 1;
  const bHigh = Number(b?.priority) === 1 ? 0 : 1;
  if (aHigh !== bHigh) return aHigh - bHigh;

  const aLate = matchesFocus(a, 'late', now);
  const bLate = matchesFocus(b, 'late', now);
  if (aLate !== bLate) return aLate ? -1 : 1;

  const aDue = dueAtTime(a);
  const bDue = dueAtTime(b);
  if (aDue != null && bDue != null && aDue !== bDue) return aDue - bDue;
  if (aDue != null && bDue == null) return -1;
  if (aDue == null && bDue != null) return 1;

  return createdAtTime(a) - createdAtTime(b);
}

function sinceTime(card) {
  if (!card?.sectorSince) return null;
  const t = new Date(card.sectorSince).getTime();
  return Number.isFinite(t) ? t : null;
}

/** Shelf order: whoever has waited longest for pickup first. */
function compareReadyCards(a, b, now = new Date()) {
  const aAt = sinceTime(a);
  const bAt = sinceTime(b);
  if (aAt != null && bAt != null && aAt !== bAt) return aAt - bAt;
  if (aAt != null && bAt == null) return -1;
  if (aAt == null && bAt != null) return 1;
  return compareQueueCards(a, b, now);
}

function sortQueueCards(cards, now = new Date(), focus = null) {
  const compare = parseFocus(focus) === 'ready' ? compareReadyCards : compareQueueCards;
  return (cards || []).slice().sort((a, b) => compare(a, b, now));
}

function countQueueFocus(cards, now = new Date()) {
  const counts = { late: 0, ready: 0, dueToday: 0, dueTomorrow: 0 };
  for (const card of cards || []) {
    if (matchesFocus(card, 'late', now)) counts.late += 1;
    if (matchesFocus(card, 'ready', now)) counts.ready += 1;
    if (matchesFocus(card, 'due-today', now)) counts.dueToday += 1;
    if (matchesFocus(card, 'due-tomorrow', now)) counts.dueTomorrow += 1;
  }
  return counts;
}

function focusHref(focus) {
  const key = parseFocus(focus);
  return key ? `/kanban?focus=${key}` : '/kanban';
}

module.exports = {
  FOCUSES,
  parseFocus,
  parseKanbanFocus,
  matchesFocus,
  compareQueueCards,
  sortQueueCards,
  countQueueFocus,
  focusHref,
};
