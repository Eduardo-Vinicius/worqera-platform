const path = require('path');
const Order = require('../models/Order');
const OrderCounter = require('../models/OrderCounter');
const Client = require('../models/Client');
const Sector = require('../models/Sector');
const storageService = require('./storageService');

function dayKey(date = new Date()) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = String(date.getFullYear()).slice(-2);
  return `${d}${m}${y}`;
}

function servicesTotal(services = []) {
  return (Array.isArray(services) ? services : []).reduce(
    (acc, s) => acc + (Number(s.price != null ? s.price : s.preco) || 0),
    0
  );
}

function extFromFile(file) {
  const fromName = path.extname(file.originalname || '').toLowerCase();
  if (fromName) return fromName;
  const map = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
  };
  return map[file.mimetype] || '.jpg';
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
  if (query.employeeId) filter.assigneeEmployeeId = query.employeeId;
  if (query.code) filter.code = new RegExp(String(query.code).trim(), 'i');
  if (query.client) filter.clientName = new RegExp(String(query.client).trim(), 'i');

  if (query.dataInicio || query.dataFim) {
    filter.createdAt = {};
    if (query.dataInicio) filter.createdAt.$gte = new Date(query.dataInicio);
    if (query.dataFim) {
      const end = new Date(query.dataFim);
      if (!String(query.dataFim).includes('T')) end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  if (query.q) {
    filter.$or = [
      { code: new RegExp(query.q, 'i') },
      { clientName: new RegExp(query.q, 'i') },
      { shoeModel: new RegExp(query.q, 'i') },
    ];
  }

  const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 200);
  if (query.cursor) {
    filter._id = { ...(filter._id || {}), $lt: query.cursor };
  }

  const orders = await Order.find(filter)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean();

  let nextToken = null;
  let page = orders;
  if (orders.length > limit) {
    page = orders.slice(0, limit);
    nextToken = String(page[page.length - 1]._id);
  }

  return {
    data: page,
    orders: page,
    nextToken,
    count: page.length,
  };
}

async function createOrder(shopId, userId, data) {
  let clientName = data.clientName || data.clienteNome || '';
  let clientPhone = data.clientPhone || data.telefone || null;
  let clientEmail = data.clientEmail || data.email || null;
  let clientId = data.clientId || data.clienteId || null;

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
  const services = (data.services || data.servicos || []).map((s) => ({
    id: s.id || null,
    name: s.name || s.nome || '',
    price: Number(s.price != null ? s.price : s.preco) || 0,
  }));
  const pricing = data.pricing || {};
  const computedTotal = servicesTotal(services);
  const total =
    pricing.total != null
      ? Number(pricing.total)
      : data.total != null
        ? Number(data.total)
        : data.precoTotal != null
          ? Number(data.precoTotal)
          : computedTotal;
  const deposit =
    pricing.deposit != null
      ? Number(pricing.deposit)
      : data.deposit != null
        ? Number(data.deposit)
        : data.valorSinal != null
          ? Number(data.valorSinal)
          : 0;

  const order = await Order.create({
    shopId,
    code,
    clientId,
    clientName,
    clientPhone,
    clientEmail,
    shoeModel: data.shoeModel || data.modeloTenis || '',
    services,
    accessories: data.accessories || [],
    warranty: data.warranty || {},
    pricing: {
      total,
      deposit,
      remaining: pricing.remaining != null ? Number(pricing.remaining) : Math.max(0, total - deposit),
      expenses: pricing.expenses != null ? Number(pricing.expenses) : 0,
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
    dueAt: data.dueAt || data.dataPrevistaEntrega || null,
    notes: data.notes || data.observacoes || null,
    assigneeEmployeeId: data.assigneeEmployeeId || data.employeeId || null,
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
  if (updates.modeloTenis != null) order.shoeModel = updates.modeloTenis;
  if (updates.dataPrevistaEntrega != null) order.dueAt = updates.dataPrevistaEntrega;
  if (updates.servicos != null) {
    order.services = updates.servicos.map((s) => ({
      id: s.id || null,
      name: s.name || s.nome || '',
      price: Number(s.price != null ? s.price : s.preco) || 0,
    }));
  }
  if (updates.services != null || updates.servicos != null) {
    const total = servicesTotal(order.services);
    if (!updates.pricing) {
      order.pricing.total = total;
      order.pricing.remaining = Math.max(0, total - (order.pricing.deposit || 0));
    }
  }
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

async function replaceOrderPhotos(shopId, orderId, files) {
  if (!files || files.length === 0) {
    const err = new Error('No photos uploaded');
    err.status = 400;
    err.code = 'BAD_REQUEST';
    throw err;
  }
  if (files.length > 8) {
    const err = new Error('Maximum 8 photos allowed');
    err.status = 400;
    err.code = 'BAD_REQUEST';
    throw err;
  }

  const order = await Order.findOne({ _id: orderId, shopId });
  if (!order) {
    const err = new Error('Order not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const prefix = storageService.photosPrefix(shopId, orderId);
  await storageService.deletePrefix(prefix);

  const photos = [];
  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    const key = `${prefix}foto-${i + 1}${extFromFile(file)}`;
    const saved = await storageService.putBuffer(key, file.buffer, file.mimetype);
    photos.push({
      key: saved.key,
      url: saved.url,
      isCover: i === 0,
    });
  }

  order.photos = photos;
  await order.save();
  return order.toObject();
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
  replaceOrderPhotos,
  getPublicOrderByCode,
  nextOrderCode,
  servicesTotal,
};
