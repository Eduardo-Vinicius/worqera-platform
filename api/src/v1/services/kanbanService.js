const mongoose = require('mongoose');
const Order = require('../models/Order');
const Sector = require('../models/Sector');
const User = require('../models/User');
const { effectiveItems } = require('./orderItems');

function canMoveAnywhere(role) {
  return ['owner', 'admin', 'atendimento'].includes(String(role || '').toLowerCase());
}

function sectorIdSet(ids) {
  return new Set((ids || []).map(String));
}

/**
 * Sector role: may only act on orders currently in their sectors,
 * but may forward to any active shop sector (blind — they never see other queues).
 */
function assertSectorCanActOnOrder(membership, order) {
  const allowed = sectorIdSet(membership.sectorIds);
  const fromId = order.currentSectorId ? String(order.currentSectorId) : null;
  if (!fromId || !allowed.has(fromId)) {
    const err = new Error('Cannot move order outside your sectors');
    err.status = 403;
    err.code = 'FORBIDDEN_SECTOR';
    throw err;
  }
  return { allowed, fromId };
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
  const orders = sectorIds.length
    ? await Order.find({
        shopId,
        currentSectorId: { $in: sectorIds },
        status: { $nin: ['cancelled', 'delivered'] },
      })
        .sort({ priority: -1, dueAt: 1, createdAt: 1 })
        .lean()
    : [];

  const bySector = Object.fromEntries(sectorIds.map((id) => [String(id), []]));
  for (const order of orders) {
    const key = String(order.currentSectorId);
    if (bySector[key]) bySector[key].push(summarizeCard(order));
  }

  return {
    role,
    columns: sectors.map((s) => ({
      sector: s,
      orders: bySector[String(s._id)] || [],
    })),
    /** Names only — for blind "Encaminhar" without exposing other queues */
    forwardTargets,
  };
}

function summarizeCard(order) {
  const items = effectiveItems(order);
  const flatPhotos = Array.isArray(order.photos) ? order.photos : [];
  const item0Photos =
    items[0] && Array.isArray(items[0].photos) ? items[0].photos : [];
  const photos = flatPhotos.length ? flatPhotos : item0Photos;
  const cover = photos.find((p) => p.isCover) || photos[0];
  return {
    id: order._id,
    code: order.code,
    clientName: order.clientName,
    shoeModel: items[0]?.shoeModel || order.shoeModel || '',
    itemCount: items.length,
    priority: order.priority,
    dueAt: order.dueAt,
    status: order.status,
    currentSectorId: order.currentSectorId,
    photoThumb: cover?.url || null,
    assigneeEmployeeId: order.assigneeEmployeeId,
    plannedSectorIds: Array.isArray(order.plannedSectorIds)
      ? order.plannedSectorIds.map((s) => String(s._id || s))
      : [],
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

async function moveOrder(shopId, orderId, membership, userId, body) {
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

  const toSector = await Sector.findOne({ _id: toSectorId, shopId, active: true });
  if (!toSector) {
    const err = new Error('Target sector not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const planned = Array.isArray(order.plannedSectorIds)
    ? order.plannedSectorIds.map((s) => String(s._id || s))
    : [];
  const toId = String(toSector._id);
  const fromId = order.currentSectorId ? String(order.currentSectorId) : null;
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
    const { allowed } = assertSectorCanActOnOrder(membership, order);
    // Blind forward: any active sector is allowed; destination queue is never returned in GET /kanban
    if (!allowed.has(toId)) {
      action = 'forward';
    }
  }

  const historyNote = offPath
    ? `fora do fluxo: ${noteText}`
    : noteText || (action === 'forward' ? 'encaminhado' : null);

  const { movedByName, movedByEmail } = await resolveMover(userId);

  const now = new Date();
  if (order.sectorHistory?.length) {
    const last = order.sectorHistory[order.sectorHistory.length - 1];
    if (last && !last.leftAt) last.leftAt = now;
  }

  order.sectorHistory.push({
    sectorId: toSector._id,
    fromSectorId: order.currentSectorId || null,
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

  if (!order.sectorPath.map(String).includes(String(toSector._id))) {
    order.sectorPath.push(toSector._id);
  }

  order.currentSectorId = toSector._id;
  order.updatedByUserId = userId;

  if (toSector.isTerminal) {
    order.status = 'ready';
  } else if (order.status === 'open') {
    order.status = 'in_progress';
  }

  await order.save();

  // Client email: only when sector asks for it, or terminal (ready)
  try {
    const Shop = require('../models/Shop');
    const shop = await Shop.findById(shopId).lean();
    const shouldMail =
      Boolean(toSector.notifyEmailOnEnter) || Boolean(toSector.isTerminal);
    if (shouldMail && shop) {
      const { notifyOrderStatusSafe } = require('./orderNotify');
      const kind = toSector.isTerminal || order.status === 'ready' ? 'ready' : 'moved';
      notifyOrderStatusSafe(shop, order.toObject ? order.toObject() : order, kind, {
        sectorName: toSector.name,
      });
    }
  } catch (_err) {
    // never block move
  }

  return order.toObject();
}

module.exports = {
  getKanban,
  moveOrder,
  canMoveAnywhere,
  listForwardTargets,
  assertSectorCanActOnOrder,
};
