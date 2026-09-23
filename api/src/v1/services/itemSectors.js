const mongoose = require('mongoose');

/**
 * Per-item sector helpers for multi-item kanban cards.
 */

function asId(v) {
  if (!v) return null;
  return String(v._id || v);
}

function mapIds(arr) {
  return (arr || []).map(asId).filter(Boolean);
}

/** Ensure every effective item has sector fields; mutate order document or plain object. */
function ensureItemSectors(order) {
  if (!order) return [];
  const items = Array.isArray(order.items) && order.items.length
    ? order.items
    : null;
  if (!items) {
    // Virtual single item from flat fields — caller should hydrate items first
    return [];
  }
  const orderSector = order.currentSectorId || null;
  const orderPlanned = Array.isArray(order.plannedSectorIds) ? order.plannedSectorIds : [];
  let dirty = false;
  for (const it of items) {
    if (!it.currentSectorId && orderSector) {
      it.currentSectorId = orderSector;
      dirty = true;
    }
    if (!Array.isArray(it.plannedSectorIds) || !it.plannedSectorIds.length) {
      if (orderPlanned.length) {
        it.plannedSectorIds = [...orderPlanned];
        dirty = true;
      } else if (it.currentSectorId) {
        it.plannedSectorIds = [it.currentSectorId];
        dirty = true;
      }
    }
    if (!Array.isArray(it.sectorHistory)) {
      it.sectorHistory = [];
      dirty = true;
    }
    if (!it.sectorHistory.length && it.currentSectorId) {
      it.sectorHistory.push({
        sectorId: it.currentSectorId,
        fromSectorId: null,
        enteredAt: order.createdAt || new Date(),
        leftAt: null,
        note: 'migrated',
        action: 'create',
      });
      dirty = true;
    }
  }
  return { items, dirty };
}

/**
 * Rollup order.currentSectorId from items using sector board order.
 * Prefer first non-terminal item sector (by sector.order); else any terminal.
 */
function computeRollupSectorId(items, sectorsById) {
  const list = items || [];
  if (!list.length) return null;
  const withSector = list.filter((it) => it.currentSectorId);
  if (!withSector.length) return null;

  const ranked = withSector
    .map((it) => {
      const sid = asId(it.currentSectorId);
      const sec = sectorsById.get(sid);
      return {
        sid,
        order: sec?.order ?? 9999,
        isTerminal: Boolean(sec?.isTerminal),
      };
    })
    .sort((a, b) => a.order - b.order);

  const nonTerm = ranked.find((r) => !r.isTerminal);
  return (nonTerm || ranked[ranked.length - 1])?.sid || null;
}

function allItemsInTerminal(items, sectorsById) {
  const list = items || [];
  if (!list.length) return false;
  return list.every((it) => {
    const sid = asId(it.currentSectorId);
    if (!sid) return false;
    return Boolean(sectorsById.get(sid)?.isTerminal);
  });
}

function buildSectorsById(sectors) {
  const map = new Map();
  for (const s of sectors || []) {
    map.set(String(s._id), s);
  }
  return map;
}

function findItemOnOrder(order, itemId) {
  const id = String(itemId || '');
  if (!id || !order?.items?.length) return { item: null, index: -1 };
  const index = order.items.findIndex((it) => String(it._id) === id);
  if (index < 0) return { item: null, index: -1 };
  return { item: order.items[index], index };
}

function pairLabel(code, index1based) {
  return `${code}-${index1based}`;
}

function toObjectId(id) {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  if (mongoose.Types.ObjectId.isValid(id)) return new mongoose.Types.ObjectId(id);
  return null;
}

module.exports = {
  asId,
  mapIds,
  ensureItemSectors,
  computeRollupSectorId,
  allItemsInTerminal,
  buildSectorsById,
  findItemOnOrder,
  pairLabel,
  toObjectId,
};
