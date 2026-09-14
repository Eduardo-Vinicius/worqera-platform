const mongoose = require('mongoose');
const Order = require('../models/Order');
const Sector = require('../models/Sector');

function canMoveAnywhere(role) {
  return ['owner', 'admin', 'atendimento'].includes(String(role || '').toLowerCase());
}

function sectorIdSet(ids) {
  return new Set((ids || []).map(String));
}

async function getKanban(shopId, membership) {
  let sectors = await Sector.find({ shopId, active: true }).sort({ order: 1 }).lean();
  const role = String(membership.role || '').toLowerCase();

  if (role === 'sector') {
    const allowed = sectorIdSet(membership.sectorIds);
    sectors = sectors.filter((s) => allowed.has(String(s._id)));
  }

  const sectorIds = sectors.map((s) => s._id);
  const orders = await Order.find({
    shopId,
    currentSectorId: { $in: sectorIds },
    status: { $nin: ['cancelled', 'delivered'] },
  })
    .sort({ priority: -1, dueAt: 1, createdAt: 1 })
    .lean();

  const bySector = Object.fromEntries(sectorIds.map((id) => [String(id), []]));
  for (const order of orders) {
    const key = String(order.currentSectorId);
    if (bySector[key]) bySector[key].push(summarizeCard(order));
  }

  return {
    columns: sectors.map((s) => ({
      sector: s,
      orders: bySector[String(s._id)] || [],
    })),
  };
}

function summarizeCard(order) {
  const cover = (order.photos || []).find((p) => p.isCover) || (order.photos || [])[0];
  return {
    id: order._id,
    code: order.code,
    clientName: order.clientName,
    shoeModel: order.shoeModel,
    priority: order.priority,
    dueAt: order.dueAt,
    status: order.status,
    currentSectorId: order.currentSectorId,
    photoThumb: cover?.url || null,
    assigneeEmployeeId: order.assigneeEmployeeId,
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

  const role = String(membership.role || '').toLowerCase();
  if (!canMoveAnywhere(role)) {
    const allowed = sectorIdSet(membership.sectorIds);
    const fromId = order.currentSectorId ? String(order.currentSectorId) : null;
    if (!fromId || !allowed.has(fromId)) {
      const err = new Error('Cannot move order outside your sectors');
      err.status = 403;
      err.code = 'FORBIDDEN_SECTOR';
      throw err;
    }

    const allSectors = await Sector.find({ shopId, active: true }).sort({ order: 1 }).lean();
    const fromSector = allSectors.find((s) => String(s._id) === fromId);
    const nextSector = allSectors.find((s) => fromSector && s.order > fromSector.order);
    const toId = String(toSectorId);
    const allowedDest =
      allowed.has(toId) || (nextSector && String(nextSector._id) === toId);

    if (!allowedDest) {
      const err = new Error('Destination sector not allowed for sector role');
      err.status = 403;
      err.code = 'FORBIDDEN_SECTOR';
      throw err;
    }
  }

  const now = new Date();
  if (order.sectorHistory?.length) {
    const last = order.sectorHistory[order.sectorHistory.length - 1];
    if (last && !last.leftAt) last.leftAt = now;
  }

  order.sectorHistory.push({
    sectorId: toSector._id,
    enteredAt: now,
    leftAt: null,
    movedByUserId: userId,
    employeeId: employeeId || null,
    employeeName: employeeName || null,
    note: note || null,
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
  return order.toObject();
}

module.exports = { getKanban, moveOrder, canMoveAnywhere };
