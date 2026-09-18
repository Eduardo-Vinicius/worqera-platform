const path = require('path');
const Order = require('../models/Order');
const OrderCounter = require('../models/OrderCounter');
const Client = require('../models/Client');
const Sector = require('../models/Sector');
const ServiceCatalog = require('../models/ServiceCatalog');
const storageService = require('./storageService');
const { normalizeItemsFromPayload, sumServices, hydrateItemsIfEmpty, assertItemIndex } = require('./orderItems');

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
  // Shop-wide sequential codes: 0001, 0002, … (no daily reset)
  const counter = await OrderCounter.findOneAndUpdate(
    { shopId, dayKey: 'shop' },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  const seq = Number(counter.seq) || 1;
  return seq < 10000 ? String(seq).padStart(4, '0') : String(seq);
}

async function listOrders(shopId, query = {}) {
  const filter = { shopId };
  if (query.status) {
    const statuses = String(query.status)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (statuses.length === 1) filter.status = statuses[0];
    else if (statuses.length > 1) filter.status = { $in: statuses };
  }
  if (query.sectorId) filter.currentSectorId = query.sectorId;
  if (query.employeeId) filter.assigneeEmployeeId = query.employeeId;
  if (query.code) {
    const code = String(query.code).trim();
    // Exact/prefix preferred for shop codes (0001 or 3191-26)
    filter.code = new RegExp(`^${code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
  }
  if (query.client) {
    const client = String(query.client).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.clientName = new RegExp(client, 'i');
  }
  if (query.clientId) {
    filter.clientId = query.clientId;
  }

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
    const q = String(query.q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (q) {
      filter.$or = [
        { code: new RegExp(`^${q}`, 'i') },
        { clientName: new RegExp(q, 'i') },
        { shoeModel: new RegExp(q, 'i') },
        { clientPhone: new RegExp(q, 'i') },
      ];
    }
  }

  if (query.hasFeedback === '1' || query.hasFeedback === 'true') {
    filter['feedback.score'] = { $gte: 1 };
  }
  if (query.reopened === '1' || query.reopened === 'true') {
    filter.reopenedAt = { $ne: null };
    filter.status = filter.status || { $nin: ['delivered', 'cancelled'] };
  }

  // Avoid over-ANDing the same term as both q and client/code
  if (filter.$or && filter.clientName) delete filter.clientName;
  if (filter.$or && filter.code && query.q && !query.code) delete filter.code;

  const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 200);
  if (query.cursor) {
    filter._id = { ...(filter._id || {}), $lt: query.cursor };
  }

  const orders = await Order.find(filter)
    .sort({ createdAt: -1, _id: -1 })
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
  data = data || {};
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
  const normalized = normalizeItemsFromPayload(data || {});
  const services = normalized.services;
  const pricing = data.pricing || {};
  const computedTotal = sumServices(normalized.items);
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

  const STATUS_ENUM = new Set(['open', 'in_progress', 'ready', 'delivered', 'cancelled']);
  const rawStatus = String(data.status || '').trim().toLowerCase();
  const status = STATUS_ENUM.has(rawStatus) ? rawStatus : 'open';

  // Resolve starting sector: explicit id, or departamento/slug/name (legacy UI), else first active
  let startSector = null;
  if (data.currentSectorId) {
    startSector = await Sector.findOne({ _id: data.currentSectorId, shopId, active: true }).lean();
  }
  if (!startSector) {
    const dept = String(data.departamento || data.department || data.sectorSlug || '').trim();
    if (dept) {
      const slug = dept.toLowerCase();
      startSector =
        (await Sector.findOne({ shopId, active: true, slug }).lean()) ||
        (await Sector.findOne({ shopId, active: true, name: dept }).lean()) ||
        null;
      if (!startSector) {
        // case-insensitive name match without regex injection
        const sectors = await Sector.find({ shopId, active: true }).select('_id name slug').lean();
        startSector =
          sectors.find((s) => String(s.name || '').toLowerCase() === slug) || null;
      }
    }
  }
  if (!startSector) startSector = firstSector;

  const allSectors = await Sector.find({ shopId, active: true }).sort({ order: 1 }).lean();

  // TOP-04: collect sectorPathHint from catalog services matched by name/id
  const catalog = await ServiceCatalog.find({ shopId, active: true }).lean();
  const serviceNames = new Set(
    (services || [])
      .map((s) => String(s.name || s.nome || '').trim().toLowerCase())
      .filter(Boolean)
  );
  const serviceIds = new Set(
    (services || []).map((s) => String(s.id || '')).filter(Boolean)
  );
  const hintIds = [];
  for (const c of catalog) {
    const n = String(c.name || '').trim().toLowerCase();
    if (serviceNames.has(n) || serviceIds.has(String(c._id))) {
      for (const sid of c.sectorPathHint || []) hintIds.push(sid);
    }
  }

  const plannedSectorIds = resolvePlannedSectorIds(data, allSectors, startSector, hintIds);
  const hasTerminal = allSectors.some((s) => s.active !== false && s.isTerminal);
  if (!hasTerminal) {
    const err = new Error(
      'Configure um setor final (ex.: Atendimento final) em Setores antes de criar pedidos'
    );
    err.status = 400;
    err.code = 'NO_TERMINAL_SECTOR';
    throw err;
  }
  const warranty = ensureWarranty(data.warranty || data.garantia || {});

  const order = await Order.create({
    shopId,
    code,
    clientId,
    clientName,
    clientPhone,
    clientEmail,
    shoeModel: normalized.shoeModel,
    services,
    accessories: data.accessories || data.acessorios || [],
    warranty,
    pricing: {
      total,
      deposit,
      remaining: pricing.remaining != null ? Number(pricing.remaining) : Math.max(0, total - deposit),
      expenses: pricing.expenses != null ? Number(pricing.expenses) : 0,
    },
    photos: normalized.photos,
    items: normalized.items,
    currentSectorId: startSector?._id || null,
    plannedSectorIds,
    sectorPath: startSector ? [startSector._id] : [],
    sectorHistory: startSector
      ? [
          {
            sectorId: startSector._id,
            fromSectorId: null,
            enteredAt: new Date(),
            leftAt: null,
            movedByUserId: userId,
            note: 'created',
            action: 'create',
          },
        ]
      : [],
    status,
    priority: data.priority != null ? data.priority : data.prioridade != null ? data.prioridade : 1,
    dueAt: data.dueAt || data.dataPrevistaEntrega || null,
    notes: data.notes || data.observacoes || null,
    assigneeEmployeeId: data.assigneeEmployeeId || data.employeeId || null,
    createdByUserId: userId,
  });

  try {
    const Shop = require('../models/Shop');
    const shop = await Shop.findById(shopId).lean();
    if (shop && clientEmail) {
      const { notifyOrderStatusSafe } = require('./orderNotify');
      notifyOrderStatusSafe(shop, order.toObject(), 'created', {
        sectorName: startSector?.name,
      });
    }
  } catch (_err) {
    // ignore
  }

  return order.toObject();
}

function ensureWarranty(raw = {}) {
  const active = Boolean(raw.ativa ?? raw.active);
  if (!active) {
    return {
      ativa: false,
      active: false,
      preco: Number(raw.preco ?? raw.price) || 0,
      duracao: '',
      data: '',
    };
  }
  let data = String(raw.data || raw.endsAt || '');
  if (!data) {
    const d = new Date();
    d.setUTCMonth(d.getUTCMonth() + 3);
    data = d.toISOString().slice(0, 10);
  }
  return {
    ...raw,
    ativa: true,
    active: true,
    preco: Number(raw.preco ?? raw.price) || 0,
    duracao: raw.duracao || raw.duration || '3 meses',
    data,
  };
}

function resolvePlannedSectorIds(data, allSectors, startSector, serviceHints = []) {
  const active = (allSectors || []).filter((s) => s.active !== false);
  const ensureTerminalLast = (ids) => {
    const terminals = active
      .filter((s) => s.isTerminal)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    if (!terminals.length) return ids;
    const terminalId = terminals[0]._id;
    const tid = String(terminalId);
    const cleaned = (ids || []).filter((id) => String(id) !== tid);
    if (!cleaned.length && startSector) {
      if (String(startSector._id) === tid) return [terminalId];
      return [startSector._id, terminalId];
    }
    return [...cleaned, terminalId];
  };

  const explicit = Array.isArray(data.plannedSectorIds) ? data.plannedSectorIds : null;
  if (explicit && explicit.length) {
    const mapped = explicit
      .map((id) => active.find((s) => String(s._id) === String(id))?._id)
      .filter(Boolean);
    return ensureTerminalLast(mapped);
  }

  // TOP-04: merge sectorPathHint from catalog services matched by name
  if (Array.isArray(serviceHints) && serviceHints.length) {
    const matched = [];
    const seen = new Set();
    for (const id of serviceHints) {
      const sid = String(id);
      if (seen.has(sid)) continue;
      const sector = active.find((s) => String(s._id) === sid);
      if (sector) {
        seen.add(sid);
        matched.push(sector._id);
      }
    }
    if (matched.length) return ensureTerminalLast(matched);
  }

  const raw =
    data.departamentosSelecionados ||
    data.plannedSectors ||
    data.selectedFlowOptions ||
    [];
  const tokens = (Array.isArray(raw) ? raw : [])
    .map((entry) => {
      if (!entry) return '';
      if (typeof entry === 'string') return entry.trim().toLowerCase();
      return String(entry.id || entry.slug || entry.nome || entry.name || '')
        .trim()
        .toLowerCase();
    })
    .filter(Boolean);

  const matched = [];
  const seen = new Set();
  for (const token of tokens) {
    const sector =
      active.find((s) => String(s.slug || '').toLowerCase() === token) ||
      active.find((s) => String(s.name || '').toLowerCase() === token) ||
      active.find((s) => String(s._id) === token);
    if (sector && !seen.has(String(sector._id))) {
      seen.add(String(sector._id));
      matched.push(sector._id);
    }
  }

  if (matched.length) return ensureTerminalLast(matched);
  return ensureTerminalLast(startSector?._id ? [startSector._id] : []);
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
  updates = updates || {};
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
    if (k === 'pricing') return;
    if (updates[k] != null) order[k] = updates[k];
  });
  if (updates.pricing && typeof updates.pricing === 'object') {
    const p = updates.pricing;
    if (p.total != null) order.pricing.total = Number(p.total) || 0;
    if (p.deposit != null) order.pricing.deposit = Number(p.deposit) || 0;
    if (p.remaining != null) order.pricing.remaining = Number(p.remaining) || 0;
    else if (p.total != null || p.deposit != null) {
      order.pricing.remaining = Math.max(
        0,
        (Number(order.pricing.total) || 0) - (Number(order.pricing.deposit) || 0)
      );
    }
    if (p.expenses != null) order.pricing.expenses = Number(p.expenses) || 0;
  }
  if (updates.clientId != null) order.clientId = updates.clientId;
  if (updates.currentSectorId != null) order.currentSectorId = updates.currentSectorId;
  if (updates.modeloTenis != null) order.shoeModel = updates.modeloTenis;
  if (updates.dataPrevistaEntrega != null) order.dueAt = updates.dataPrevistaEntrega;
  if (updates.servicos != null) {
    order.services = updates.servicos.map((s) => ({
      id: s.id || null,
      name: s.name || s.nome || '',
      price: Number(s.price != null ? s.price : s.preco) || 0,
    }));
  }
  if (Array.isArray(updates.items)) {
    const normalized = normalizeItemsFromPayload(updates || {});
    order.items = normalized.items;
    order.shoeModel = normalized.shoeModel;
    order.services = normalized.services;
    order.photos = normalized.photos;
    if (!updates.pricing) {
      const total = sumServices(normalized.items);
      order.pricing.total = total;
      order.pricing.remaining = Math.max(0, total - (order.pricing.deposit || 0));
    }
  } else {
    if (updates.observacoes != null) order.notes = updates.observacoes;

    const flatItemPatched =
      updates.shoeModel != null ||
      updates.modeloTenis != null ||
      updates.services != null ||
      updates.servicos != null ||
      updates.photos != null ||
      updates.fotos != null ||
      updates.notes != null ||
      updates.observacoes != null;

    if (flatItemPatched) {
      const itemCount = Array.isArray(order.items) ? order.items.length : 0;

      if (itemCount <= 1) {
        order.items = [
          {
            shoeModel: order.shoeModel || '',
            services: order.services || [],
            photos: order.photos || [],
            notes: order.notes || null,
          },
        ];
      } else {
        const first = order.items[0];
        if (updates.shoeModel != null || updates.modeloTenis != null) {
          first.shoeModel = order.shoeModel;
        }
        if (updates.services != null || updates.servicos != null) {
          first.services = order.services;
        }
        if (updates.photos != null || updates.fotos != null) {
          first.photos = order.photos;
        }
        if (updates.notes != null || updates.observacoes != null) {
          first.notes = order.notes;
        }
      }
    }

    if ((updates.services != null || updates.servicos != null) && !updates.pricing) {
      const total = sumServices(order.items);
      order.pricing.total = total;
      order.pricing.remaining = Math.max(0, total - (order.pricing.deposit || 0));
    }
  }
  order.updatedByUserId = userId;
  if (updates.status === 'delivered' && !order.deliveredAt) {
    order.deliveredAt = updates.deliveredAt ? new Date(updates.deliveredAt) : new Date();
    order.reopenedAt = null;
  }
  if (updates.status && updates.status !== 'delivered') {
    // keep deliveredAt unless explicitly cleared
  }
  await order.save();
  return order.toObject();
}

async function reopenOrder(shopId, id, userId, body = {}) {
  const User = require('../models/User');
  const order = await Order.findOne({ _id: id, shopId });
  if (!order) {
    const err = new Error('Order not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (!['delivered', 'ready'].includes(String(order.status))) {
    const err = new Error('Só é possível reabrir pedidos prontos ou entregues');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const sectorId = body.sectorId || body.currentSectorId;
  if (!sectorId) {
    const err = new Error('sectorId required');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const sector = await Sector.findOne({ _id: sectorId, shopId, active: true }).lean();
  if (!sector) {
    const err = new Error('Sector not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const nextStatus = ['open', 'in_progress', 'ready'].includes(String(body.status || ''))
    ? String(body.status)
    : 'in_progress';

  const user = userId ? await User.findById(userId).lean() : null;
  const from = order.currentSectorId;
  order.status = nextStatus;
  order.currentSectorId = sector._id;
  order.deliveredAt = null;
  order.reopenedAt = new Date();
  order.set('feedback', null);
  order.updatedByUserId = userId;
  order.sectorHistory = order.sectorHistory || [];
  order.sectorHistory.push({
    sectorId: sector._id,
    fromSectorId: from || null,
    enteredAt: new Date(),
    leftAt: null,
    movedByUserId: userId || null,
    movedByName: user?.name || 'Reabertura',
    movedByEmail: user?.email || null,
    note: body.note || 'reaberto — retrabalho / retorno do cliente',
    action: 'reopen',
  });

  await order.save();
  return order.toObject();
}

async function submitPublicFeedback(code, { shopSlug, score, comment, tags } = {}) {
  const normalizedCode = String(code || '').trim();
  if (!normalizedCode || !shopSlug) {
    const err = new Error('shop e código obrigatórios');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  const n = Number(score);
  if (!Number.isFinite(n) || n < 1 || n > 5) {
    const err = new Error('Nota de 1 a 5');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const ALLOWED_TAGS = new Set(['qualidade', 'prazo', 'atendimento', 'acabamento']);
  const cleanTags = (Array.isArray(tags) ? tags : [])
    .map((t) => String(t || '').toLowerCase().trim())
    .filter((t) => ALLOWED_TAGS.has(t))
    .slice(0, 4);

  const Shop = require('../models/Shop');
  const shop = await Shop.findOne({ slug: String(shopSlug).trim().toLowerCase() }).lean();
  if (!shop) {
    const err = new Error('Shop not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const order = await Order.findOne({ code: normalizedCode, shopId: shop._id });
  if (!order) {
    const err = new Error('Order not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (!['ready', 'delivered'].includes(String(order.status))) {
    const err = new Error('Feedback só após pedido pronto ou entregue');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  if (order.feedback?.score) {
    const err = new Error('Feedback já enviado');
    err.status = 409;
    err.code = 'CONFLICT';
    throw err;
  }

  order.feedback = {
    score: Math.round(n),
    comment: String(comment || '').trim().slice(0, 2000),
    tags: cleanTags,
    createdAt: new Date(),
  };
  await order.save();
  return {
    ok: true,
    feedback: order.feedback,
  };
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

function assertPhotoFiles(files) {
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
}

async function storeItemPhotoFiles(shopId, orderId, files, itemIndex, startIndex) {
  const prefix = storageService.photosPrefix(shopId, orderId);
  const photos = [];
  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    const n = startIndex + i + 1;
    const key = `${prefix}item-${itemIndex}/foto-${n}${extFromFile(file)}`;
    const saved = await storageService.putBuffer(key, file.buffer, file.mimetype);
    photos.push({
      key: saved.key,
      url: saved.url,
      isCover: startIndex === 0 && i === 0,
    });
  }
  return photos;
}

async function uploadItemPhotos(shopId, orderId, itemIndex, files) {
  assertPhotoFiles(files);

  const order = await Order.findOne({ _id: orderId, shopId });
  if (!order) {
    const err = new Error('Order not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  hydrateItemsIfEmpty(order);
  const idx = assertItemIndex(itemIndex, order.items.length);

  const existing = Array.isArray(order.items[idx].photos)
    ? order.items[idx].photos.map((p) => ({
        key: p.key,
        url: p.url || null,
        isCover: Boolean(p.isCover),
      }))
    : [];
  const added = await storeItemPhotoFiles(shopId, orderId, files, idx, existing.length);
  order.items[idx].photos = existing.concat(added);
  if (idx === 0) {
    order.photos = order.items[0].photos;
  }
  order.markModified('items');
  if (idx === 0) order.markModified('photos');
  await order.save();
  return order.toObject();
}

async function replaceOrderPhotos(shopId, orderId, files) {
  return uploadItemPhotos(shopId, orderId, 0, files);
}

async function getPublicOrderByCode(code, { shopSlug } = {}) {
  const normalizedCode = String(code || '').trim();
  if (!normalizedCode) {
    const err = new Error('code required');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  let shopId = null;
  if (shopSlug) {
    const Shop = require('../models/Shop');
    const shop = await Shop.findOne({ slug: String(shopSlug).trim().toLowerCase() }).lean();
    if (!shop) {
      const err = new Error('Shop not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    shopId = shop._id;
  } else {
    // Codes are per-shop (0001…). Without slug, refuse if ambiguous.
    const matches = await Order.find({ code: normalizedCode }).select('_id shopId').limit(2).lean();
    if (!matches.length) {
      const err = new Error('Order not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    if (matches.length > 1) {
      const err = new Error('shop slug required (pass ?shop=slug or /p/{shop}/{code})');
      err.status = 400;
      err.code = 'SHOP_REQUIRED';
      throw err;
    }
    shopId = matches[0].shopId;
  }

  const order = await Order.findOne({ code: normalizedCode, shopId })
    .populate('currentSectorId', 'name slug color')
    .lean();
  if (!order) {
    const err = new Error('Order not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const Shop = require('../models/Shop');
  const shop = await Shop.findById(shopId).select('name slug branding').lean();

  return {
    code: order.code,
    shop: shop
      ? {
          name: shop.branding?.displayName || shop.name,
          slug: shop.slug,
          logoUrl: shop.branding?.logoUrl || '',
          primaryColor: shop.branding?.primaryColor || '',
          accentColor: shop.branding?.accentColor || '',
          phone: shop.branding?.phone || '',
        }
      : null,
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
    feedback: order.feedback?.score
      ? {
          score: order.feedback.score,
          comment: order.feedback.comment || '',
          tags: Array.isArray(order.feedback.tags) ? order.feedback.tags : [],
          createdAt: order.feedback.createdAt,
        }
      : null,
    canFeedback: ['ready', 'delivered'].includes(String(order.status)) && !order.feedback?.score,
  };
}

async function addOrderComment(shopId, orderId, userId, { text, authorName } = {}) {
  const body = String(text || '').trim();
  if (!body) {
    const err = new Error('text required');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  if (body.length > 2000) {
    const err = new Error('text too long (max 2000)');
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

  let name = String(authorName || '').trim();
  if (!name && userId) {
    const User = require('../models/User');
    const user = await User.findById(userId).lean();
    name = user?.name || user?.email || 'Usuário';
  }

  order.comments = order.comments || [];
  order.comments.push({
    text: body,
    authorUserId: userId || null,
    authorName: name || 'Usuário',
    createdAt: new Date(),
  });
  order.updatedByUserId = userId || order.updatedByUserId;
  await order.save();
  return order.toObject();
}

function csvEscape(value) {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toIso(d) {
  if (!d) return '';
  try {
    return new Date(d).toISOString();
  } catch (_err) {
    return '';
  }
}

async function exportDeliveredOrdersCsv(shopId) {
  const orders = await Order.find({ shopId, status: 'delivered' })
    .sort({ deliveredAt: -1, updatedAt: -1, _id: -1 })
    .select('code clientName status createdAt deliveredAt updatedAt pricing shoeModel')
    .lean();

  const header = [
    'code',
    'clientName',
    'status',
    'createdAt',
    'deliveredAt',
    'pricing.total',
    'shoeModel',
  ];
  const lines = [header.join(',')];
  for (const o of orders) {
    const deliveredOrUpdated = o.deliveredAt || o.updatedAt;
    lines.push(
      [
        csvEscape(o.code),
        csvEscape(o.clientName),
        csvEscape(o.status),
        csvEscape(toIso(o.createdAt)),
        csvEscape(toIso(deliveredOrUpdated)),
        csvEscape(o.pricing?.total != null ? o.pricing.total : 0),
        csvEscape(o.shoeModel),
      ].join(',')
    );
  }
  return `${lines.join('\n')}\n`;
}

const DEMO_CLIENT_NAME = 'Cliente demonstração';

async function createDemoOrder(shopId, userId) {
  const clientService = require('./clientService');
  let client = await Client.findOne({ shopId, name: DEMO_CLIENT_NAME }).lean();
  if (!client) {
    client = await clientService.createClient(shopId, { name: DEMO_CLIENT_NAME });
    client = client.toObject ? client.toObject() : client;
  }

  return createOrder(shopId, userId, {
    clientId: client._id,
    clientName: DEMO_CLIENT_NAME,
    shoeModel: 'Tênis demonstração',
    notes: 'Pedido de exemplo — pode excluir',
    status: 'open',
    pricing: { total: 0, deposit: 0 },
  });
}

module.exports = {
  listOrders,
  createOrder,
  createDemoOrder,
  exportDeliveredOrdersCsv,
  getOrder,
  patchOrder,
  reopenOrder,
  addOrderComment,
  deleteOrder,
  replaceOrderPhotos,
  uploadItemPhotos,
  getPublicOrderByCode,
  submitPublicFeedback,
  nextOrderCode,
  servicesTotal,
};
