const mongoose = require('mongoose');
const Order = require('../models/Order');
const Sector = require('../models/Sector');
const User = require('../models/User');
const { effectiveItems, hydrateItemsIfEmpty } = require('./orderItems');
const { resolvePhotoUrl } = require('./storageService');
const {
  asId,
  ensureItemSectors,
  computeRollupSectorId,
  allItemsInTerminal,
  buildSectorsById,
  findItemOnOrder,
  pairLabel,
} = require('./itemSectors');

function canMoveAnywhere(role) {
  return ['owner', 'admin', 'atendimento'].includes(String(role || '').toLowerCase());
}

function sectorIdSet(ids) {
  return new Set((ids || []).map(String));
}

/**
 * Sector role: may only act on items currently in their sectors,
 * but may forward to any active shop sector (blind).
 */
function assertSectorCanActOnItem(membership, itemSectorId) {
  const allowed = sectorIdSet(membership.sectorIds);
  const fromId = itemSectorId ? String(itemSectorId) : null;
  if (!fromId || !allowed.has(fromId)) {
    const err = new Error('Cannot move item outside your sectors');
    err.status = 403;
    err.code = 'FORBIDDEN_SECTOR';
    throw err;
  }
  return { allowed, fromId };
}

/** @deprecated use assertSectorCanActOnItem — kept for callers checking order rollup */
function assertSectorCanActOnOrder(membership, order) {
  return assertSectorCanActOnItem(membership, order.currentSectorId);
}

async function listForwardTargets(shopId) {
  const sectors = await Sector.find({ shopId, active: true }).sort({ order: 1 }).lean();
  return sectors.map((s) => ({
    id: String(s._id),
    name: s.name,
    order: s.order,
    isTerminal: Boolean(s.isTerminal),
  }));
}

async function getKanban(shopId, membership) {
  let sectors = await Sector.find({ shopId, active: true }).sort({ order: 1 }).lean();
  const role = String(membership.role || '').toLowerCase();
  const forwardTargets = sectors.map((s) => ({
    id: String(s._id),
    name: s.name,
    order: s.order,
    isTerminal: Boolean(s.isTerminal),
  }));

  if (role === 'sector') {
    const allowed = sectorIdSet(membership.sectorIds);
    sectors = sectors.filter((s) => allowed.has(String(s._id)));
  }

  const sectorIds = sectors.map((s) => s._id);
  const sectorIdStrs = new Set(sectorIds.map(String));
  const allSectors = await Sector.find({ shopId, active: true }).sort({ order: 1 }).lean();
  const sectorsById = buildSectorsById(allSectors);

  const orders = sectorIds.length
    ? await Order.find({
        shopId,
        status: { $nin: ['cancelled', 'delivered'] },
        deletedAt: null,
        $or: [
          { 'items.currentSectorId': { $in: sectorIds } },
          { currentSectorId: { $in: sectorIds } },
        ],
      })
        .sort({ priority: -1, dueAt: 1, createdAt: 1 })
        .lean()
    : [];

  const { newPublicToken } = require('../utils/publicOrderToken');
  const missingToken = orders.filter((o) => !o.publicToken);
  if (missingToken.length) {
    const ops = missingToken.map((o) => {
      const token = newPublicToken();
      o.publicToken = token;
      return {
        updateOne: {
          filter: { _id: o._id, publicToken: null },
          update: { $set: { publicToken: token } },
        },
      };
    });
    await Order.bulkWrite(ops, { ordered: false });
  }

  const bySector = Object.fromEntries(sectorIds.map((id) => [String(id), []]));
  const dirtyOrders = [];

  for (const order of orders) {
    hydrateItemsIfEmpty(order);
    const { dirty } = ensureItemSectors(order);
    if (dirty) dirtyOrders.push(order);

    const items = effectiveItems(order);
    items.forEach((item, index) => {
      const itemSector = asId(item.currentSectorId) || asId(order.currentSectorId);
      if (!itemSector || !sectorIdStrs.has(itemSector)) return;
      if (!bySector[itemSector]) return;
      bySector[itemSector].push(summarizeItemCard(order, item, index, sectorsById));
    });
  }

  if (dirtyOrders.length) {
    await Promise.all(
      dirtyOrders.map((o) =>
        Order.updateOne(
          { _id: o._id },
          {
            $set: {
              items: o.items,
              currentSectorId:
                computeRollupSectorId(o.items, sectorsById) || o.currentSectorId,
            },
          }
        )
      )
    );
  }

  return {
    role,
    columns: sectors.map((s) => ({
      sector: s,
      orders: bySector[String(s._id)] || [],
    })),
    forwardTargets,
  };
}

function summarizeItemCard(order, item, index, sectorsById) {
  const items = effectiveItems(order);
  const photos = Array.isArray(item.photos) && item.photos.length
    ? item.photos
    : items.length === 1 && Array.isArray(order.photos)
      ? order.photos
      : [];
  const cover = photos.find((p) => p.isCover) || photos[0];
  const itemSector = asId(item.currentSectorId) || asId(order.currentSectorId);
  const itemId = item._id ? String(item._id) : `idx-${index}`;
  return {
    id: order._id,
    orderId: String(order._id),
    itemId,
    cardKey: `${order._id}:${itemId}`,
    code: order.code,
    pairLabel: pairLabel(order.code, index + 1),
    itemIndex: index,
    pairTotal: items.length,
    publicToken: order.publicToken || null,
    clientName: order.clientName,
    clientPhone: order.clientPhone || null,
    shoeModel: item.shoeModel || order.shoeModel || '',
    itemCount: items.length,
    priority: order.priority,
    dueAt: order.dueAt,
    status: order.status,
    currentSectorId: itemSector,
    orderSectorId: asId(order.currentSectorId),
    photoThumb: resolvePhotoUrl(cover) || null,
    assigneeEmployeeId: order.assigneeEmployeeId,
    plannedSectorIds: Array.isArray(item.plannedSectorIds) && item.plannedSectorIds.length
      ? item.plannedSectorIds.map((s) => String(s._id || s))
      : Array.isArray(order.plannedSectorIds)
        ? order.plannedSectorIds.map((s) => String(s._id || s))
        : [],
    reopened: Boolean(order.reopenedAt),
    feedbackScore: order.feedback?.score || null,
    itemInTerminal: Boolean(sectorsById.get(String(itemSector))?.isTerminal),
  };
}

async function resolveMover(userId) {
  if (!userId) return { movedByName: null, movedByEmail: null };
  const user = await User.findById(userId).select('name email').lean();
  if (!user) return { movedByName: null, movedByEmail: null };
  return {
    movedByName: user.name || null,
    movedByEmail: user.email || null,
  };
}

async function moveOrderItem(shopId, orderId, itemId, membership, userId, body) {
  const { toSectorId, note, employeeId, employeeName } = body || {};
  if (!toSectorId || !mongoose.Types.ObjectId.isValid(toSectorId)) {
    const err = new Error('toSectorId required');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const order = await Order.findOne({ _id: orderId, shopId });
  if (!order) {
    const err = new Error('Order not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (order.deletedAt) {
    const err = new Error('Order is in the trash — restore it first');
    err.status = 409;
    err.code = 'ORDER_DELETED';
    throw err;
  }

  hydrateItemsIfEmpty(order);
  ensureItemSectors(order);

  const { item, index } = findItemOnOrder(order, itemId);
  if (!item) {
    const err = new Error('Item not found on order');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const toSector = await Sector.findOne({ _id: toSectorId, shopId, active: true });
  if (!toSector) {
    const err = new Error('Target sector not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const planned = Array.isArray(item.plannedSectorIds) && item.plannedSectorIds.length
    ? item.plannedSectorIds.map((s) => String(s._id || s))
    : Array.isArray(order.plannedSectorIds)
      ? order.plannedSectorIds.map((s) => String(s._id || s))
      : [];
  const toId = String(toSector._id);
  const fromId = item.currentSectorId ? String(item.currentSectorId) : null;
  const offPath = planned.length > 0 && !planned.includes(toId);
  const noteText = String(note || '').trim();
  if (offPath && !noteText) {
    const err = new Error('Comment required when moving outside planned path');
    err.status = 400;
    err.code = 'OFF_PATH_NOTE_REQUIRED';
    throw err;
  }

  const role = String(membership.role || '').toLowerCase();
  let action = 'move';
  if (!canMoveAnywhere(role)) {
    const { allowed } = assertSectorCanActOnItem(membership, item.currentSectorId);
    if (!allowed.has(toId)) {
      action = 'forward';
    }
  }

  const historyNote = offPath
    ? `fora do fluxo: ${noteText}`
    : noteText || (action === 'forward' ? 'encaminhado' : null);

  const { movedByName, movedByEmail } = await resolveMover(userId);
  const now = new Date();

  if (!Array.isArray(item.sectorHistory)) item.sectorHistory = [];
  if (item.sectorHistory.length) {
    const last = item.sectorHistory[item.sectorHistory.length - 1];
    if (last && !last.leftAt) last.leftAt = now;
  }

  item.sectorHistory.push({
    sectorId: toSector._id,
    fromSectorId: item.currentSectorId || null,
    enteredAt: now,
    leftAt: null,
    movedByUserId: userId,
    movedByName,
    movedByEmail,
    employeeId: employeeId || null,
    employeeName: employeeName || null,
    note: historyNote,
    action,
  });

  item.currentSectorId = toSector._id;
  order.markModified('items');

  // Order-level history summary
  if (order.sectorHistory?.length) {
    const last = order.sectorHistory[order.sectorHistory.length - 1];
    if (last && !last.leftAt) last.leftAt = now;
  }
  order.sectorHistory.push({
    sectorId: toSector._id,
    fromSectorId: fromId,
    enteredAt: now,
    leftAt: null,
    movedByUserId: userId,
    movedByName,
    movedByEmail,
    employeeId: employeeId || null,
    employeeName: employeeName || null,
    note: historyNote
      ? `${pairLabel(order.code, index + 1)}: ${historyNote}`
      : pairLabel(order.code, index + 1),
    action,
  });

  if (!order.sectorPath.map(String).includes(String(toSector._id))) {
    order.sectorPath.push(toSector._id);
  }

  const allSectors = await Sector.find({ shopId, active: true }).lean();
  const sectorsById = buildSectorsById(allSectors);
  const rollup = computeRollupSectorId(order.items, sectorsById);
  if (rollup) {
    order.currentSectorId = mongoose.Types.ObjectId.isValid(rollup)
      ? new mongoose.Types.ObjectId(rollup)
      : order.currentSectorId;
  }

  const wasReady = order.status === 'ready';
  if (allItemsInTerminal(order.items, sectorsById)) {
    order.status = 'ready';
  } else if (order.status === 'open' || order.status === 'ready') {
    order.status = 'in_progress';
  }

  order.updatedByUserId = userId;
  await order.save();

  const becameReady = !wasReady && order.status === 'ready';
  // Email only when the whole order becomes ready (all items terminal) — no per-column spam
  if (becameReady) {
    try {
      const Shop = require('../models/Shop');
      const shop = await Shop.findById(shopId).lean();
      if (shop) {
        const { notifyOrderStatusSafe } = require('./orderNotify');
        const term = allSectors.find((s) => s.isTerminal);
        const publicSectorName =
          term?.showOnPublic === false ? 'Em andamento' : term?.name || 'Pronto';
        notifyOrderStatusSafe(shop, order.toObject ? order.toObject() : order, 'ready', {
          sectorName: publicSectorName,
        });
      }
    } catch (_err) {
      // never block move
    }
  } else if (order.items.length === 1 && Boolean(toSector.notifyEmailOnEnter) && !toSector.isTerminal) {
    // Single-item orders: keep legacy sector enter notify
    try {
      const Shop = require('../models/Shop');
      const shop = await Shop.findById(shopId).lean();
      if (shop) {
        const { notifyOrderStatusSafe } = require('./orderNotify');
        const publicSectorName =
          toSector.showOnPublic === false ? 'Em andamento' : toSector.name;
        notifyOrderStatusSafe(shop, order.toObject ? order.toObject() : order, 'moved', {
          sectorName: publicSectorName,
        });
      }
    } catch (_err) {
      // ignore
    }
  }

  return order.toObject();
}

/**
 * Legacy move: single-item orders only. Multi-item requires itemId endpoint.
 */
async function moveOrder(shopId, orderId, membership, userId, body) {
  const order = await Order.findOne({ _id: orderId, shopId });
  if (!order) {
    const err = new Error('Order not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  hydrateItemsIfEmpty(order);
  ensureItemSectors(order);
  const items = order.items || [];
  if (items.length > 1) {
    const err = new Error(
      'Pedido com vários itens: use POST /kanban/orders/:orderId/items/:itemId/move'
    );
    err.status = 400;
    err.code = 'ITEM_MOVE_REQUIRED';
    throw err;
  }
  const itemId = items[0]?._id;
  if (!itemId) {
    const err = new Error('Order has no items to move');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  return moveOrderItem(shopId, orderId, String(itemId), membership, userId, body);
}

module.exports = {
  getKanban,
  moveOrder,
  moveOrderItem,
  canMoveAnywhere,
  listForwardTargets,
  assertSectorCanActOnOrder,
  assertSectorCanActOnItem,
};
