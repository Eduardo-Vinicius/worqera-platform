const Order = require('../models/Order');
const OrderCounter = require('../models/OrderCounter');
const Client = require('../models/Client');
const Sector = require('../models/Sector');

function dayKey(date = new Date()) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = String(date.getFullYear()).slice(-2);
  return `${d}${m}${y}`;
}

async function nextOrderCode(shopId) {
  const key = dayKey();
  const counter = await OrderCounter.findOneAndUpdate(
    { shopId, dayKey: key },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  const seq = String(counter.seq).padStart(3, '0');
  return `${key}-${seq}`;
}

async function listOrders(shopId, query = {}) {
  const filter = { shopId };
  if (query.status) filter.status = query.status;
  if (query.sectorId) filter.currentSectorId = query.sectorId;
  if (query.q) {
    filter.$or = [
      { code: new RegExp(query.q, 'i') },
      { clientName: new RegExp(query.q, 'i') },
      { shoeModel: new RegExp(query.q, 'i') },
    ];
  }
  return Order.find(filter).sort({ createdAt: -1 }).limit(Number(query.limit) || 100).lean();
}

async function createOrder(shopId, userId, data) {
  let clientName = data.clientName || '';
  let clientPhone = data.clientPhone || null;
  let clientEmail = data.clientEmail || null;
  let clientId = data.clientId || null;

  if (clientId) {
    const client = await Client.findOne({ _id: clientId, shopId }).lean();
    if (client) {
      clientName = clientName || client.name;
      clientPhone = clientPhone || client.phone;
      clientEmail = clientEmail || client.email;
    }
  }

  const firstSector =
    (await Sector.findOne({ shopId, active: true }).sort({ order: 1 }).lean()) || null;

  const code = data.code || (await nextOrderCode(shopId));
  const pricing = data.pricing || {};
  const total = pricing.total != null ? pricing.total : data.total || 0;
  const deposit = pricing.deposit != null ? pricing.deposit : data.deposit || 0;

  const order = await Order.create({
    shopId,
    code,
    clientId,
    clientName,
    clientPhone,
    clientEmail,
    shoeModel: data.shoeModel || '',
    services: data.services || [],
    accessories: data.accessories || [],
    warranty: data.warranty || {},
    pricing: {
      total,
      deposit,
      remaining: pricing.remaining != null ? pricing.remaining : Math.max(0, total - deposit),
      expenses: pricing.expenses || 0,
    },
    photos: data.photos || [],
    currentSectorId: data.currentSectorId || firstSector?._id || null,
    sectorPath: data.currentSectorId || firstSector ? [data.currentSectorId || firstSector._id] : [],
    sectorHistory:
      data.currentSectorId || firstSector
        ? [
            {
              sectorId: data.currentSectorId || firstSector._id,
              enteredAt: new Date(),
              leftAt: null,
              movedByUserId: userId,
              note: 'created',
            },
          ]
        : [],
    status: data.status || 'open',
    priority: data.priority != null ? data.priority : 1,
    dueAt: data.dueAt || null,
    notes: data.notes || null,
    createdByUserId: userId,
  });

  return order.toObject();
}

async function getOrder(shopId, id) {
  const order = await Order.findOne({ _id: id, shopId }).lean();
  if (!order) {
    const err = new Error('Order not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  return order;
}

async function patchOrder(shopId, id, userId, updates) {
  const order = await Order.findOne({ _id: id, shopId });
  if (!order) {
    const err = new Error('Order not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const fields = [
    'clientName',
    'clientPhone',
    'clientEmail',
    'shoeModel',
    'services',
    'accessories',
    'warranty',
    'pricing',
    'photos',
    'status',
    'priority',
    'dueAt',
    'notes',
    'deliveredAt',
    'assigneeEmployeeId',
    'pdfUrl',
  ];
  fields.forEach((k) => {
    if (updates[k] != null) order[k] = updates[k];
  });
  if (updates.clientId != null) order.clientId = updates.clientId;
  order.updatedByUserId = userId;
  await order.save();
  return order.toObject();
}

async function deleteOrder(shopId, id) {
  const order = await Order.findOneAndDelete({ _id: id, shopId }).lean();
  if (!order) {
    const err = new Error('Order not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  return order;
}

async function getPublicOrderByCode(code) {
  const order = await Order.findOne({ code: String(code).trim() })
    .populate('currentSectorId', 'name slug color')
    .lean();
  if (!order) {
    const err = new Error('Order not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  return {
    code: order.code,
    clientName: order.clientName,
    shoeModel: order.shoeModel,
    status: order.status,
    currentSector: order.currentSectorId
      ? {
          name: order.currentSectorId.name,
          slug: order.currentSectorId.slug,
          color: order.currentSectorId.color,
        }
      : null,
    dueAt: order.dueAt,
    updatedAt: order.updatedAt,
  };
}

module.exports = {
  listOrders,
  createOrder,
  getOrder,
  patchOrder,
  deleteOrder,
  getPublicOrderByCode,
  nextOrderCode,
};
