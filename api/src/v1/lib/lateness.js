/**
 * "Atrasado" = prazo vencido e ainda na produção. Pronto esperando o cliente
 * (setor final) não atrasa: aparece na Prateleira.
 */

const LATE_STATUSES = ['open', 'in_progress'];

function toTime(value) {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}

/** Mongo filter for late orders (soft-deleted ones never count). */
function lateOrderFilter(now = new Date()) {
  return { deletedAt: null, status: { $in: LATE_STATUSES }, dueAt: { $lt: now } };
}

function isOrderLate(order, now = new Date()) {
  if (!order || order.deletedAt) return false;
  if (!LATE_STATUSES.includes(String(order.status || ''))) return false;
  const due = toTime(order.dueAt);
  return due != null && due < new Date(now).getTime();
}

/** Kanban card: the item already in the final sector is waiting for pickup, not late. */
function isItemLate(order, itemInTerminal, now = new Date()) {
  return !itemInTerminal && isOrderLate(order, now);
}

function terminalEnteredAt(history, terminalIds) {
  const list = Array.isArray(history) ? history : [];
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const entry = list[i];
    if (entry?.sectorId && terminalIds.has(String(entry.sectorId))) return toTime(entry.enteredAt);
  }
  return null;
}

/**
 * When production finished: the last item to reach the final sector. Orders that
 * skipped the final sector (or old ones without history) fall back to deliveredAt.
 */
function producedAt(order, terminalIds = new Set()) {
  const delivered = toTime(order?.deliveredAt);
  const items = Array.isArray(order?.items) && order.items.length ? order.items : [order || {}];
  let latest = null;
  for (const item of items) {
    const at = terminalEnteredAt(item.sectorHistory, terminalIds);
    if (at == null) return delivered;
    if (latest == null || at > latest) latest = at;
  }
  if (latest == null) return delivered;
  return delivered != null ? Math.min(latest, delivered) : latest;
}

/** On time = ready by the due date; a late pickup does not count against the shop. */
function producedOnTime(order, terminalIds = new Set()) {
  const due = toTime(order?.dueAt);
  if (due == null) return true;
  const at = producedAt(order, terminalIds);
  return at != null && at <= due;
}

module.exports = { LATE_STATUSES, lateOrderFilter, isOrderLate, isItemLate, producedAt, producedOnTime };
