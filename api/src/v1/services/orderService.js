const path = require('path');
const Order = require('../models/Order');
const OrderCounter = require('../models/OrderCounter');
const Client = require('../models/Client');
const Sector = require('../models/Sector');
const ServiceCatalog = require('../models/ServiceCatalog');
const storageService = require('./storageService');
const {
  normalizeItemsFromPayload,
  sumServices,
  hydrateItemsIfEmpty,
  assertItemIndex,
  mapService,
} = require('./orderItems');

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

function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function warrantyAmount(warranty) {
  if (!warranty) return 0;
  const on = Boolean(warranty.active ?? warranty.ativa);
  if (!on) return 0;
  return money(warranty.preco ?? warranty.price);
}

/** Subtotal gravado: o item patch não pode recolocar o total só com a soma dos serviços. */
function pricingIsManaged(order) {
  const subtotal = order?.pricing?.subtotal;
  return subtotal !== undefined && subtotal !== null;
}

function assignServiceSumPricing(order) {
  if (pricingIsManaged(order)) return;
  const total = sumServices(order.items);
  const deposit = Number(order.pricing?.deposit) || 0;
  order.pricing.total = total;
  order.pricing.remaining = Math.max(0, total - deposit);
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
  const trash =
    query.deleted === '1' ||
    query.deleted === 'true' ||
    query.trash === '1' ||
    query.trash === 'true';
  // `{ deletedAt: null }` matches null or missing
  filter.deletedAt = trash ? { $ne: null } : null;
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
        { brand: new RegExp(q, 'i') },
        { 'items.brand': new RegExp(q, 'i') },
        { 'items.shoeModel': new RegExp(q, 'i') },
        { clientPhone: new RegExp(q, 'i') },
      ];
    }
  }

  if (query.payment === 'due') {
    filter['pricing.remaining'] = { $gt: 0.009 };
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
  const computedServices = sumServices(normalized.items);

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

  // TOP-04: per-item sectorPathHint from catalog; also union for order-level planned
  const catalog = await ServiceCatalog.find({ shopId, active: true }).lean();

  function hintsForServices(svcList) {
    const serviceNames = new Set(
      (svcList || [])
        .map((s) => String(s.name || s.nome || '').trim().toLowerCase())
        .filter(Boolean)
    );
    const serviceIds = new Set(
      (svcList || []).map((s) => String(s.id || '')).filter(Boolean)
    );
    const hintIds = [];
    for (const c of catalog) {
      const n = String(c.name || '').trim().toLowerCase();
      if (serviceNames.has(n) || serviceIds.has(String(c._id))) {
        for (const sid of c.sectorPathHint || []) hintIds.push(sid);
      }
    }
    return hintIds;
  }

  const orderFlowFallback = {
    departamentosSelecionados:
      data.departamentosSelecionados ||
      data.plannedSectors ||
      data.selectedFlowOptions ||
      [],
  };

  const itemsWithSectors = (normalized.items || []).map((it) => {
    const itemHints = hintsForServices(it.services);
    const hasItemFlow =
      (Array.isArray(it.plannedSectorIds) && it.plannedSectorIds.length > 0) ||
      (Array.isArray(it.departamentosSelecionados) && it.departamentosSelecionados.length > 0);
    const itemFlowData = hasItemFlow
      ? {
          plannedSectorIds: it.plannedSectorIds,
          departamentosSelecionados: it.departamentosSelecionados,
        }
      : orderFlowFallback;
    const itemPlanned = resolvePlannedSectorIds(
      itemFlowData,
      allSectors,
      startSector,
      itemHints
    );
    const itemStart = itemPlanned[0] || startSector?._id || null;
    return {
      shoeModel: it.shoeModel,
      brand: it.brand || '',
      services: it.services,
      photos: it.photos || [],
      notes: it.notes || null,
      currentSectorId: itemStart,
      plannedSectorIds: itemPlanned,
      sectorHistory: itemStart
        ? [
            {
              sectorId: itemStart,
              fromSectorId: null,
              enteredAt: new Date(),
              leftAt: null,
              movedByUserId: userId,
              note: 'created',
              action: 'create',
            },
          ]
        : [],
    };
  });

  // Order-level plan = union of item plans (multi-pair) or UI partida + hints
  const unionFromItems = [];
  const seenUnion = new Set();
  for (const it of itemsWithSectors) {
    for (const sid of it.plannedSectorIds || []) {
      const key = String(sid);
      if (seenUnion.has(key)) continue;
      seenUnion.add(key);
      unionFromItems.push(sid);
    }
  }
  const unionHints = hintsForServices(services);
  const plannedSectorIds = unionFromItems.length
    ? resolvePlannedSectorIds(
        { plannedSectorIds: unionFromItems },
        allSectors,
        startSector,
        []
      )
    : resolvePlannedSectorIds(data, allSectors, startSector, unionHints);

  const { computeRollupSectorId, buildSectorsById } = require('./itemSectors');
  const sectorsById = buildSectorsById(allSectors);
  const rollupId = computeRollupSectorId(itemsWithSectors, sectorsById);
  const rollupSector =
    (rollupId && allSectors.find((s) => String(s._id) === String(rollupId))) || startSector;

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
  const pricing = data.pricing || {};
  const suggestedSubtotal = money(computedServices + warrantyAmount(warranty));
  let subtotal = pricing.subtotal != null ? money(pricing.subtotal) : suggestedSubtotal;
  let discount = pricing.discount != null ? money(pricing.discount) : money(data.desconto);
  if (discount < 0) discount = 0;
  if (subtotal < 0) subtotal = 0;
  if (discount > subtotal) discount = subtotal;
  const total =
    pricing.total != null
      ? money(pricing.total)
      : data.total != null
        ? money(data.total)
        : data.precoTotal != null
          ? money(data.precoTotal)
          : money(Math.max(0, subtotal - discount));
  let deposit =
    pricing.deposit != null
      ? money(pricing.deposit)
      : data.deposit != null
        ? money(data.deposit)
        : data.valorSinal != null
          ? money(data.valorSinal)
          : 0;
  if (deposit < 0) deposit = 0;
  if (deposit > total) deposit = total;
  const remaining = money(Math.max(0, total - deposit));
  const photoNotify = pendingPhotoNotify(data.photoCounts, itemsWithSectors.length);

  const order = await Order.create({
    shopId,
    code,
    clientId,
    clientName,
    clientPhone,
    clientEmail,
    shoeModel: normalized.shoeModel,
    brand: (itemsWithSectors[0] && itemsWithSectors[0].brand) || '',
    services,
    accessories: data.accessories || data.acessorios || [],
    warranty,
    pricing: {
      subtotal,
      discount,
      total,
      deposit,
      remaining,
      expenses: pricing.expenses != null ? money(pricing.expenses) : 0,
    },
    photos: normalized.photos,
    items: itemsWithSectors,
    publicToken: require('../utils/publicOrderToken').newPublicToken(),
    currentSectorId: rollupSector?._id || startSector?._id || null,
    plannedSectorIds,
    sectorPath: rollupSector ? [rollupSector._id] : [],
    sectorHistory: rollupSector
      ? [
          {
            sectorId: rollupSector._id,
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
    ...(photoNotify ? { photoNotify } : {}),
  });

  const awaitingPhotos = Boolean(order.photoNotify?.expected?.some((n) => Number(n) > 0));
  const awaitingPrice = pricePending(order);
  const emailNotify = awaitingPrice
    ? { ok: true, queued: false, deferred: true, reason: 'awaiting-price' }
    : awaitingPhotos
      ? { ok: true, queued: false, deferred: true, reason: 'awaiting-photos' }
      : await queueCreatedNotify(shopId, order, {
          sectorName: rollupSector?.name || startSector?.name,
        });

  const doc = order.toObject();
  doc.emailNotify = emailNotify;
  return doc;
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

  const matched = [];
  const seen = new Set();
  const pushSector = (sector) => {
    if (!sector) return;
    const sid = String(sector._id);
    if (seen.has(sid)) return;
    seen.add(sid);
    matched.push(sector._id);
  };

  // UI partida / flow tokens first (balcão), then catalog service hints
  const raw =
    data.departamentosSelecionados ||
    data.plannedSectors ||
    data.selectedFlowOptions ||
    data.flowOptionIds ||
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

  for (const token of tokens) {
    const sector =
      active.find((s) => String(s.slug || '').toLowerCase() === token) ||
      active.find((s) => String(s.name || '').toLowerCase() === token) ||
      active.find((s) => String(s._id) === token);
    pushSector(sector);
  }

  if (Array.isArray(serviceHints) && serviceHints.length) {
    for (const id of serviceHints) {
      const sector = active.find((s) => String(s._id) === String(id));
      pushSector(sector);
    }
  }

  if (matched.length) return ensureTerminalLast(matched);
  return ensureTerminalLast(startSector?._id ? [startSector._id] : []);
}

function photoLocator(photo) {
  if (!photo) return '';
  if (typeof photo === 'string') return photo;
  return `${photo.key || ''} ${photo.url || ''}`;
}

function decodedPhotoLocator(photo) {
  const raw = photoLocator(photo);
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** Highest index first so item-10 is not read as item-1. */
function photoItemIndex(photo, itemCount) {
  const ref = decodedPhotoLocator(photo);
  const total = Number(itemCount) || 0;
  for (let i = total - 1; i >= 0; i -= 1) {
    if (ref.includes(`/item-${i}/`) || ref.includes(`item-${i}/`)) return i;
  }
  return null;
}

function clonePhotoRecord(photo) {
  if (!photo) return null;
  if (typeof photo === 'string') {
    const url = photo.trim();
    return url ? { key: null, url, isCover: false } : null;
  }
  const key = photo.key ? String(photo.key) : null;
  const url = photo.url ? String(photo.url) : null;
  if (!key && !url) return null;
  return { key, url, isCover: Boolean(photo.isCover) };
}

function photoIdentity(photo) {
  const rec = clonePhotoRecord(photo);
  if (!rec) return '';
  return rec.key || rec.url || '';
}

function planIdList(raw) {
  return (raw || []).map((id) => String(id && id._id ? id._id : id)).filter(Boolean);
}

/** Start column + final only. A real route has a middle sector. */
function planIsOnlyEndpoints(ids, sectors) {
  if (!ids.length || ids.length > 2) return !ids.length;
  const work = (sectors || [])
    .filter((s) => !s.isTerminal)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  const startId = work[0] ? String(work[0]._id) : null;
  const terminalIds = new Set(
    (sectors || []).filter((s) => s.isTerminal).map((s) => String(s._id))
  );
  return ids.every((id) => id === startId || terminalIds.has(id));
}

/**
 * Item drawer reads items[i]. The full order reads order.photos and the union path.
 * If a pair was saved with only atendimento + final, or its photos stayed on the
 * order copy, put them back on the item the next time the order is opened.
 */
async function repairOrderItemSnapshots(order) {
  const items = order.items || [];
  if (!items.length) return false;
  const [sectors, catalog] = await Promise.all([
    Sector.find({ shopId: order.shopId, active: true }).sort({ order: 1 }).lean(),
    ServiceCatalog.find({ shopId: order.shopId, active: true }).lean(),
  ]);
  const startSector =
    sectors.find((s) => !s.isTerminal) ||
    sectors[0] ||
    null;
  const richPlans = items
    .map((it) => planIdList(it.plannedSectorIds))
    .filter((ids) => ids.length > 2 && !planIsOnlyEndpoints(ids, sectors));
  const consensus =
    richPlans.length && richPlans.every((ids) => ids.join(',') === richPlans[0].join(','))
      ? richPlans[0]
      : null;

  const claimed = new Set();
  for (const it of items) {
    for (const photo of it.photos || []) {
      const id = photoIdentity(photo);
      if (id) claimed.add(id);
    }
  }

  const assignPhotos = (it, incoming) => {
    const next = (it.photos || []).map((photo) => clonePhotoRecord(photo)).filter(Boolean);
    let added = false;
    for (const photo of incoming) {
      const rec = clonePhotoRecord(photo);
      if (!rec) continue;
      const id = photoIdentity(rec);
      if (id && claimed.has(id)) continue;
      if (!next.length) rec.isCover = true;
      next.push(rec);
      if (id) claimed.add(id);
      added = true;
    }
    if (!added) return false;
    if (next.length && !next.some((photo) => photo.isCover)) next[0].isCover = true;
    it.photos = next;
    return true;
  };

  let dirty = false;
  let stored = [];
  const needsFiles = items.some((it) => !(it.photos || []).length);
  if (needsFiles && order._id) {
    try {
      stored = await storageService.list(storageService.photosPrefix(order.shopId, order._id));
    } catch {
      stored = [];
    }
  }
  const pool = []
    .concat(order.photos || [])
    .concat(
      (stored || []).filter((file) => /\.(jpe?g|png|webp|gif)$/i.test(String(file.key || '')))
    );

  items.forEach((it, index) => {
    if ((it.photos || []).length) return;
    const mine = pool.filter((photo) => photoItemIndex(photo, items.length) === index);
    if (assignPhotos(it, mine)) dirty = true;
  });

  const unclaimed = pool.filter((photo) => photoItemIndex(photo, items.length) == null);
  const emptyItems = items.filter((it) => !(it.photos || []).length);
  if (unclaimed.length && emptyItems.length === 1) {
    if (assignPhotos(emptyItems[0], unclaimed)) dirty = true;
  }
  for (const file of stored || []) {
    if (!/\.(jpe?g|png|webp|gif)$/i.test(String(file.key || ''))) continue;
    const id = photoIdentity(file);
    if (!id || claimed.has(id)) continue;
    const rec = clonePhotoRecord(file);
    if (!rec) continue;
    order.photos = (order.photos || []).concat([rec]);
    claimed.add(id);
    dirty = true;
  }

  items.forEach((it, index) => {

    const current = planIdList(it.plannedSectorIds);
    if (!planIsOnlyEndpoints(current, sectors)) return;
    if (consensus && consensus.join(',') !== current.join(',')) {
      it.plannedSectorIds = consensus;
      dirty = true;
      return;
    }
    const services = it.services || [];
    const names = new Set(
      services.map((s) => String(s.name || '').trim().toLowerCase()).filter(Boolean)
    );
    const serviceIds = new Set(services.map((s) => String(s.id || '')).filter(Boolean));
    const hints = [];
    for (const row of catalog) {
      const name = String(row.name || '').trim().toLowerCase();
      if (!names.has(name) && !serviceIds.has(String(row._id))) continue;
      for (const sid of row.sectorPathHint || []) hints.push(sid);
    }
    if (!hints.length) return;
    const expanded = resolvePlannedSectorIds(
      { departamentosSelecionados: [...current, ...hints] },
      sectors,
      startSector,
      hints
    );
    const next = planIdList(expanded);
    if (next.join(',') !== current.join(',')) {
      it.plannedSectorIds = expanded;
      dirty = true;
    }
  });

  if (dirty) {
    syncOrderPhotosFromItems(order, { preserveOrphans: true });
  }
  return dirty;
}

async function getOrder(shopId, id) {
  await repairPhotoNotify(shopId, id);
  const order = await Order.findOne({ _id: id, shopId });
  if (!order) {
    const err = new Error('Order not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  await ensureOrderPublicToken(order);
  if (await repairOrderItemSnapshots(order)) {
    order.markModified('items');
    order.markModified('photos');
    try {
      await order.save();
    } catch (err) {
      if (err?.name !== 'VersionError') throw err;
      const fresh = await Order.findOne({ _id: id, shopId }).lean();
      if (fresh) return fresh;
    }
  }
  return order.toObject();
}

function assertNotDeliveredStructural(order) {
  if (String(order.status) === 'delivered') {
    const err = new Error(
      'Pedido entregue: reabra antes de alterar pares, serviços ou partida'
    );
    err.status = 400;
    err.code = 'ORDER_DELIVERED';
    throw err;
  }
}

function mirrorFlatFromFirstItem(order) {
  hydrateItemsIfEmpty(order);
  const first = order.items[0];
  if (!first) return;
  order.shoeModel = first.shoeModel || '';
  order.brand = first.brand || '';
  order.services = first.services || [];
  syncOrderPhotosFromItems(order, { preserveOrphans: true });
}

async function loadActiveSectors(shopId) {
  return Sector.find({ shopId, active: true }).sort({ order: 1 }).lean();
}

async function resolvePlannedForItemPayload(shopId, itemPayload, fallbackStart) {
  const allSectors = await loadActiveSectors(shopId);
  const catalog = await ServiceCatalog.find({ shopId, active: true }).lean();
  const services = (itemPayload.services || itemPayload.servicos || []).map(mapService);
  const hintIds = [];
  const serviceNames = new Set(
    services.map((s) => String(s.name || '').trim().toLowerCase()).filter(Boolean)
  );
  const serviceIds = new Set(services.map((s) => String(s.id || '')).filter(Boolean));
  for (const c of catalog) {
    const n = String(c.name || '').trim().toLowerCase();
    if (serviceNames.has(n) || serviceIds.has(String(c._id))) {
      for (const sid of c.sectorPathHint || []) hintIds.push(sid);
    }
  }
  const startSector =
    fallbackStart ||
    allSectors.find((s) => !s.isTerminal) ||
    allSectors[0] ||
    null;
  const planned = resolvePlannedSectorIds(
    {
      plannedSectorIds: itemPayload.plannedSectorIds,
      departamentosSelecionados:
        itemPayload.departamentosSelecionados ||
        itemPayload.flowOptionIds ||
        itemPayload.plannedSectors,
    },
    allSectors,
    startSector,
    hintIds
  );
  return { planned, allSectors, startSector, services };
}

function recomputeOrderPlanAndRollup(order, allSectors) {
  const { computeRollupSectorId, buildSectorsById } = require('./itemSectors');
  const union = [];
  const seen = new Set();
  for (const it of order.items || []) {
    for (const sid of it.plannedSectorIds || []) {
      const key = String(sid);
      if (seen.has(key)) continue;
      seen.add(key);
      union.push(sid);
    }
  }
  const start =
    allSectors.find((s) => String(s._id) === String(order.currentSectorId)) ||
    allSectors.find((s) => !s.isTerminal) ||
    allSectors[0] ||
    null;
  order.plannedSectorIds = union.length
    ? resolvePlannedSectorIds({ plannedSectorIds: union }, allSectors, start, [])
    : order.plannedSectorIds || [];
  const sectorsById = buildSectorsById(allSectors);
  const rollupId = computeRollupSectorId(order.items || [], sectorsById);
  if (rollupId) order.currentSectorId = rollupId;
}

function applyPricingFromUpdates(order, updates, recomputeFromItems) {
  if (updates.pricing && typeof updates.pricing === 'object') {
    const p = updates.pricing;
    if (p.subtotal != null) order.pricing.subtotal = money(p.subtotal);
    if (p.discount != null) {
      let discount = money(p.discount);
      if (discount < 0) discount = 0;
      const subtotal = Number(order.pricing.subtotal);
      if (Number.isFinite(subtotal) && subtotal >= 0 && discount > subtotal) discount = subtotal;
      order.pricing.discount = discount;
    }
    if (p.total != null) order.pricing.total = money(p.total);
    else if (p.subtotal != null || p.discount != null) {
      const subtotal = Number(order.pricing.subtotal) || 0;
      const discount = Number(order.pricing.discount) || 0;
      order.pricing.total = money(Math.max(0, subtotal - discount));
    }
    if (p.deposit != null) order.pricing.deposit = money(p.deposit);
    const deposit = Number(order.pricing.deposit) || 0;
    const total = Number(order.pricing.total) || 0;
    if (deposit > total) order.pricing.deposit = total;
    if (p.remaining != null) order.pricing.remaining = money(p.remaining);
    else if (p.total != null || p.deposit != null || p.discount != null || p.subtotal != null) {
      order.pricing.remaining = money(
        Math.max(0, (Number(order.pricing.total) || 0) - (Number(order.pricing.deposit) || 0))
      );
    }
    if (p.expenses != null) order.pricing.expenses = money(p.expenses);
    order.markModified('pricing');
    return;
  }
  if (updates.precoTotal != null) order.pricing.total = Number(updates.precoTotal) || 0;
  if (updates.valorSinal != null) order.pricing.deposit = Number(updates.valorSinal) || 0;
  if (updates.valorRestante != null) {
    order.pricing.remaining = Number(updates.valorRestante) || 0;
  } else if (updates.precoTotal != null || updates.valorSinal != null) {
    order.pricing.remaining = Math.max(
      0,
      (Number(order.pricing.total) || 0) - (Number(order.pricing.deposit) || 0)
    );
  }
  if (recomputeFromItems && !updates.pricing && updates.precoTotal == null) {
    assignServiceSumPricing(order);
  }
}

async function patchOrder(shopId, id, userId, updates) {
  updates = updates || {};
  await repairPhotoNotify(shopId, id);
  const order = await Order.findOne({ _id: id, shopId });
  if (!order) {
    const err = new Error('Order not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  assertNotDeleted(order);

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
  applyPricingFromUpdates(order, updates, false);
  if (updates.clientId != null) order.clientId = updates.clientId;
  if (updates.currentSectorId != null) order.currentSectorId = updates.currentSectorId;
  if (updates.modeloTenis != null) order.shoeModel = updates.modeloTenis;
  if (updates.dataPrevistaEntrega != null) order.dueAt = updates.dataPrevistaEntrega;
  if (updates.prioridade != null) order.priority = Number(updates.prioridade) || order.priority;
  if (updates.acessorios != null) order.accessories = updates.acessorios;
  if (updates.garantia != null) order.warranty = ensureWarranty(updates.garantia);
  if (updates.warranty != null) order.warranty = ensureWarranty(updates.warranty);
  if (updates.observacoes != null) order.notes = updates.observacoes;
  if (updates.servicos != null) {
    order.services = updates.servicos.map(mapService);
  }

  // Blind items[] replace removed — use item endpoints or itemPatches merge
  if (Array.isArray(updates.items)) {
    const err = new Error(
      'Use PATCH/POST/DELETE /orders/:id/items to change pairs (merge-safe)'
    );
    err.status = 400;
    err.code = 'USE_ITEM_ENDPOINTS';
    throw err;
  }

  if (Array.isArray(updates.itemPatches) && updates.itemPatches.length) {
    assertNotDeliveredStructural(order);
    hydrateItemsIfEmpty(order);
    const allSectors = await loadActiveSectors(shopId);
    for (const patch of updates.itemPatches) {
      await applyItemPatchInPlace(order, shopId, patch, allSectors);
    }
    mirrorFlatFromFirstItem(order);
    recomputeOrderPlanAndRollup(order, allSectors);
    if (!updates.pricing && updates.precoTotal == null) {
      assignServiceSumPricing(order);
    }
  } else {
    const flatItemPatched =
      updates.shoeModel != null ||
      updates.modeloTenis != null ||
      updates.services != null ||
      updates.servicos != null ||
      updates.photos != null ||
      updates.fotos != null;

    if (flatItemPatched) {
      hydrateItemsIfEmpty(order);
      const itemCount = Array.isArray(order.items) ? order.items.length : 0;
      if (itemCount > 1) {
        assertNotDeliveredStructural(order);
      }
      const first = order.items[0];
      if (first) {
        if (updates.shoeModel != null || updates.modeloTenis != null) {
          first.shoeModel = order.shoeModel;
        }
        if (updates.services != null || updates.servicos != null) {
          first.services = order.services;
        }
        if (updates.photos != null || updates.fotos != null) {
          first.photos = order.photos;
        } else if (
          (!Array.isArray(first.photos) || first.photos.length === 0) &&
          Array.isArray(order.photos) &&
          order.photos.length
        ) {
          first.photos = order.photos.map((p) => ({
            key: p.key || null,
            url: p.url || null,
            isCover: Boolean(p.isCover),
          }));
        }
        if (updates.notes != null || updates.observacoes != null) {
          first.notes = order.notes;
        }
        order.markModified('items');
      }
    }

    if ((updates.services != null || updates.servicos != null) && !updates.pricing) {
      assignServiceSumPricing(order);
    }
  }

  order.updatedByUserId = userId;
  if (updates.status === 'delivered' && !order.deliveredAt) {
    order.deliveredAt = updates.deliveredAt ? new Date(updates.deliveredAt) : new Date();
    order.reopenedAt = null;
  }
  await order.save();
  const plain = order.toObject();
  if (updates.sendLaudo === true) {
    plain.emailNotify = await sendLaudoNow(shopId, order._id);
  } else if (updates.sendLaudo === false && order.photoNotify) {
    await Order.updateOne({ _id: order._id, shopId }, { $set: { 'photoNotify.approved': false } });
    plain.emailNotify = { ok: true, skipped: true, reason: 'declined' };
  }
  return plain;
}

async function applyItemPatchInPlace(order, shopId, patch, allSectorsCached) {
  const items = order.items || [];
  let idx = -1;
  if (patch.itemId != null || patch.id != null || patch._id != null) {
    const id = String(patch.itemId || patch.id || patch._id);
    idx = items.findIndex((it) => String(it._id) === id);
  }
  if (idx < 0 && patch.itemIndex != null) {
    idx = assertItemIndex(patch.itemIndex, items.length);
  }
  if (idx < 0) {
    const err = new Error('Item not found for patch');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  const it = items[idx];
  if (patch.shoeModel != null || patch.modeloTenis != null) {
    it.shoeModel = patch.shoeModel || patch.modeloTenis || '';
  }
  if (patch.brand != null || patch.marca != null) {
    it.brand = String(patch.brand != null ? patch.brand : patch.marca || '').trim();
  }
  if (patch.services != null || patch.servicos != null) {
    it.services = (patch.services || patch.servicos || []).map(mapService);
  }
  if (patch.notes != null || patch.observacoes != null) {
    it.notes = patch.notes != null ? patch.notes : patch.observacoes;
  }
  const wantsPlan =
    patch.plannedSectorIds != null ||
    patch.departamentosSelecionados != null ||
    patch.flowOptionIds != null ||
    patch.plannedSectors != null;
  if (wantsPlan) {
    const allSectors = allSectorsCached || (await loadActiveSectors(shopId));
    const start =
      allSectors.find((s) => String(s._id) === String(it.currentSectorId)) ||
      allSectors.find((s) => !s.isTerminal) ||
      allSectors[0];
    const { planned } = await resolvePlannedForItemPayload(shopId, patch, start);
    it.plannedSectorIds = planned;
  }
  // never overwrite id, photos, currentSectorId, sectorHistory here
}

async function patchOrderItem(shopId, orderId, itemIndex, userId, body) {
  body = body || {};
  await repairPhotoNotify(shopId, orderId);
  const order = await Order.findOne({ _id: orderId, shopId });
  if (!order) {
    const err = new Error('Order not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  assertNotDeleted(order);
  assertNotDeliveredStructural(order);
  hydrateItemsIfEmpty(order);
  const idx = assertItemIndex(itemIndex, order.items.length);
  const allSectors = await loadActiveSectors(shopId);
  await applyItemPatchInPlace(
    order,
    shopId,
    { ...body, itemIndex: idx },
    allSectors
  );
  mirrorFlatFromFirstItem(order);
  recomputeOrderPlanAndRollup(order, allSectors);
  if (!body.pricing && body.precoTotal == null) {
    assignServiceSumPricing(order);
  }
  order.updatedByUserId = userId;
  await order.save();
  return order.toObject();
}

async function addOrderItem(shopId, orderId, userId, body) {
  body = body || {};
  const order = await Order.findOne({ _id: orderId, shopId });
  if (!order) {
    const err = new Error('Order not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  assertNotDeleted(order);
  assertNotDeliveredStructural(order);
  hydrateItemsIfEmpty(order);

  const shoeModel = body.shoeModel || body.modeloTenis || '';
  if (!String(shoeModel).trim()) {
    const err = new Error('shoeModel required');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  const { planned, allSectors, startSector, services } = await resolvePlannedForItemPayload(
    shopId,
    body,
    null
  );
  const itemStart = planned[0] || startSector?._id || order.currentSectorId || null;
  order.items.push({
    shoeModel: String(shoeModel).trim(),
    brand: String(body.brand || body.marca || '').trim(),
    services,
    photos: body.photos || body.fotos || [],
    notes: body.notes || body.observacoes || null,
    currentSectorId: itemStart,
    plannedSectorIds: planned,
    sectorHistory: itemStart
      ? [
          {
            sectorId: itemStart,
            fromSectorId: null,
            enteredAt: new Date(),
            leftAt: null,
            movedByUserId: userId,
            note: 'added',
            action: 'create',
          },
        ]
      : [],
  });
  mirrorFlatFromFirstItem(order);
  recomputeOrderPlanAndRollup(order, allSectors);
  if (!body.keepPricing && !body.pricing) {
    assignServiceSumPricing(order);
  }
  order.updatedByUserId = userId;
  await order.save();
  return order.toObject();
}

async function deleteOrderItem(shopId, orderId, itemIndex, userId) {
  await repairPhotoNotify(shopId, orderId);
  const order = await Order.findOne({ _id: orderId, shopId });
  if (!order) {
    const err = new Error('Order not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  assertNotDeleted(order);
  assertNotDeliveredStructural(order);
  hydrateItemsIfEmpty(order);
  if ((order.items || []).length <= 1) {
    const err = new Error('Pedido precisa de ao menos um par');
    err.status = 400;
    err.code = 'LAST_ITEM';
    throw err;
  }
  const idx = assertItemIndex(itemIndex, order.items.length);
  const removed = order.items[idx];
  // Best-effort delete storage objects for item photos
  for (const p of removed.photos || []) {
    if (p?.key) {
      try {
        await storageService.deleteObject(p.key);
      } catch (_err) {
        /* ignore */
      }
    }
  }
  order.items.splice(idx, 1);
  mirrorFlatFromFirstItem(order);
  const allSectors = await loadActiveSectors(shopId);
  recomputeOrderPlanAndRollup(order, allSectors);
  assignServiceSumPricing(order);
  order.updatedByUserId = userId;
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
  assertNotDeleted(order);

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

  // Move all items back to reopen sector (same rework lane)
  const { hydrateItemsIfEmpty } = require('./orderItems');
  const { ensureItemSectors } = require('./itemSectors');
  hydrateItemsIfEmpty(order);
  ensureItemSectors(order);
  const now = new Date();
  for (const it of order.items || []) {
    if (!Array.isArray(it.sectorHistory)) it.sectorHistory = [];
    if (it.sectorHistory.length) {
      const last = it.sectorHistory[it.sectorHistory.length - 1];
      if (last && !last.leftAt) last.leftAt = now;
    }
    it.sectorHistory.push({
      sectorId: sector._id,
      fromSectorId: it.currentSectorId || null,
      enteredAt: now,
      leftAt: null,
      movedByUserId: userId || null,
      movedByName: user?.name || 'Reabertura',
      movedByEmail: user?.email || null,
      note: body.note || 'reaberto',
      action: 'reopen',
    });
    it.currentSectorId = sector._id;
  }
  order.markModified('items');

  await order.save();
  return order.toObject();
}

async function submitPublicFeedback(code, { shopSlug, token, score, comment, tags } = {}) {
  const normalizedCode = String(code || '').trim();
  const normalizedToken = String(token || '').trim();
  if (!normalizedCode || !shopSlug || !normalizedToken) {
    const err = new Error('Link incompleto (loja, código e token)');
    err.status = 404;
    err.code = 'NOT_FOUND';
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
    const err = new Error('Order not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const order = await Order.findOne({
    code: normalizedCode,
    shopId: shop._id,
    publicToken: normalizedToken,
  });
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

async function deleteOrder(shopId, id, userId) {
  await repairPhotoNotify(shopId, id);
  const order = await Order.findOne({ _id: id, shopId });
  if (!order) {
    const err = new Error('Order not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (order.deletedAt) {
    return order.toObject();
  }
  order.deletedAt = new Date();
  order.deletedByUserId = userId || null;
  order.updatedByUserId = userId || order.updatedByUserId;
  await order.save();
  return order.toObject();
}

async function restoreOrder(shopId, id, userId) {
  const order = await Order.findOne({ _id: id, shopId });
  if (!order) {
    const err = new Error('Order not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (!order.deletedAt) {
    return order.toObject();
  }
  order.deletedAt = null;
  order.deletedByUserId = null;
  order.updatedByUserId = userId || order.updatedByUserId;
  await order.save();
  return order.toObject();
}

/** Permanent delete — only allowed for orders already in the trash. */
async function purgeOrder(shopId, id) {
  const order = await Order.findOne({ _id: id, shopId });
  if (!order) {
    const err = new Error('Order not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (!order.deletedAt) {
    const err = new Error('Move the order to trash before permanent delete');
    err.status = 409;
    err.code = 'NOT_IN_TRASH';
    throw err;
  }
  const deleted = await Order.deleteOne({ _id: id, shopId });
  if (!deleted.deletedCount) {
    const err = new Error('Order not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  return { id: String(id), purged: true };
}

function assertNotDeleted(order) {
  if (order?.deletedAt) {
    const err = new Error('Order is in the trash — restore it first');
    err.status = 409;
    err.code = 'ORDER_DELETED';
    throw err;
  }
}

const MAX_PHOTOS_PER_ITEM = Number(process.env.MAX_PHOTOS_PER_ITEM || 10) || 10;

function syncOrderPhotosFromItems(order, { preserveOrphans = false } = {}) {
  const items = Array.isArray(order.items) ? order.items : [];
  const flat = [];
  const seen = new Set();
  const push = (photo) => {
    const rec = clonePhotoRecord(photo);
    if (!rec) return;
    const id = photoIdentity(rec);
    if (!id || seen.has(id)) return;
    seen.add(id);
    flat.push(rec);
  };
  for (const it of items) {
    for (const p of it.photos || []) push(p);
  }
  // Edit/save used to rebuild the order gallery from items only and drop
  // photos that still lived only on the order (the Loro Piana case).
  if (preserveOrphans) {
    for (const p of order.photos || []) push(p);
  }
  if (flat.length && !flat.some((p) => p.isCover)) {
    flat[0].isCover = true;
  }
  order.photos = flat;
  return flat;
}

function assertPhotoFiles(files, existingCount = 0) {
  if (!files || files.length === 0) {
    const err = new Error('No photos uploaded');
    err.status = 400;
    err.code = 'BAD_REQUEST';
    throw err;
  }
  const existing = Number(existingCount) || 0;
  if (files.length > MAX_PHOTOS_PER_ITEM) {
    const err = new Error(`Maximum ${MAX_PHOTOS_PER_ITEM} photos per item`);
    err.status = 400;
    err.code = 'BAD_REQUEST';
    throw err;
  }
  if (existing + files.length > MAX_PHOTOS_PER_ITEM) {
    const err = new Error(
      `Maximum ${MAX_PHOTOS_PER_ITEM} photos per item (${existing} already attached)`
    );
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
    // Prefer jpeg extension when client already compressed to image/jpeg
    const mime = String(file.mimetype || '');
    const key = `${prefix}item-${itemIndex}/foto-${n}${
      mime.includes('jpeg') || mime.includes('jpg') ? '.jpg' : extFromFile(file)
    }`;
    const saved = await storageService.putBuffer(
      key,
      file.buffer,
      mime || 'image/jpeg'
    );
    photos.push({
      key: saved.key,
      url: saved.url,
      isCover: startIndex === 0 && i === 0,
    });
  }
  return photos;
}

function asNumberList(value) {
  if (Array.isArray(value)) {
    return value.map((n) => {
      const num = Number(n);
      return Number.isFinite(num) ? num : 0;
    });
  }
  if (value && typeof value === 'object') {
    const indexes = Object.keys(value)
      .map((key) => Number(key))
      .filter((n) => Number.isInteger(n) && n >= 0);
    const size = indexes.length ? Math.max(...indexes) + 1 : 0;
    const list = Array(size).fill(0);
    for (const index of indexes) {
      const num = Number(value[index]);
      list[index] = Number.isFinite(num) ? num : 0;
    }
    return list;
  }
  return [];
}

function numberListIsClean(value) {
  return Array.isArray(value) && value.every((n) => typeof n === 'number' && Number.isFinite(n));
}

function photoNotifyNeedsRepair(photoNotify) {
  if (!photoNotify || typeof photoNotify !== 'object') return false;
  return !numberListIsClean(photoNotify.got) || !numberListIsClean(photoNotify.expected);
}

/** `$inc` on a missing list stored `{ "0": 1 }` instead of `[1]`. Any later save then fails. */
async function repairPhotoNotify(shopId, orderId) {
  if (!shopId || !orderId) return;
  const raw = await Order.collection.findOne(
    { _id: orderId, shopId },
    { projection: { photoNotify: 1 } }
  );
  if (!photoNotifyNeedsRepair(raw?.photoNotify)) return;
  await Order.collection.updateOne(
    { _id: orderId, shopId },
    {
      $set: {
        'photoNotify.expected': asNumberList(raw.photoNotify.expected),
        'photoNotify.got': asNumberList(raw.photoNotify.got),
      },
    }
  );
}

function pricePending(order) {
  return (Number(order?.pricing?.total) || 0) <= 0.009;
}

function pendingPhotoNotify(raw, itemCount) {
  if (!Array.isArray(raw) || !itemCount) return null;
  const counts = [];
  for (let i = 0; i < itemCount; i += 1) {
    const n = Number(raw[i]);
    counts.push(Number.isFinite(n) && n > 0 ? Math.min(MAX_PHOTOS_PER_ITEM, Math.floor(n)) : 0);
  }
  if (!counts.some((n) => n > 0)) return null;
  return { expected: counts, got: counts.map(() => 0), sent: false };
}

async function queueCreatedNotify(shopId, order, { sectorName } = {}) {
  if (pricePending(order)) {
    return { ok: true, queued: false, deferred: true, reason: 'awaiting-price' };
  }
  let emailNotify = { ok: false, skipped: true, reason: 'not-attempted' };
  const clientEmail = order.clientEmail;
  try {
    const Shop = require('../models/Shop');
    const shop = await Shop.findById(shopId).lean();
    if (!shop) {
      emailNotify = { ok: false, skipped: true, reason: 'no-shop' };
    } else if (!clientEmail) {
      emailNotify = { ok: false, skipped: true, reason: 'no-email' };
      console.info('[orderCreate] email skip', { code: order.code, reason: 'no-email' });
    } else {
      const { enqueueNotifyOrderStatus } = require('./orderNotify');
      const plain = order.toObject ? order.toObject() : order;
      emailNotify = await enqueueNotifyOrderStatus(shop, plain, 'created', { sectorName });
    }
  } catch (err) {
    emailNotify = { ok: false, error: err?.message || String(err) };
    console.warn('[orderCreate] email failed', err?.message || err);
  }
  try {
    const { generateOrderPdfSafe } = require('./pdfService');
    generateOrderPdfSafe(shopId, order._id);
  } catch (_err) {
    // ignore
  }
  return emailNotify;
}

function itemPhotosReady(order) {
  const expected = order?.photoNotify?.expected || [];
  if (!expected.length) return false;
  const items = Array.isArray(order.items) ? order.items : [];
  return expected.every((n, i) => {
    const need = Number(n) || 0;
    if (need < 1) return true;
    const photos = items[i]?.photos;
    return Array.isArray(photos) && photos.length >= need;
  });
}

async function releaseCreatedEmail(shopId, orderId) {
  await repairPhotoNotify(shopId, orderId);
  const current = await Order.findOne({ _id: orderId, shopId });
  if (!current) {
    const err = new Error('Order not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (!current.photoNotify) return { ok: true, already: true };
  if (current.photoNotify.sent) return { ok: true, already: true };
  if (!itemPhotosReady(current)) return { ok: true, waiting: true };
  if (pricePending(current)) return { ok: true, waiting: true, reason: 'awaiting-price' };
  if (current.photoNotify.approved === false) return { ok: true, skipped: true, reason: 'declined' };

  const claimed = await Order.findOneAndUpdate(
    { _id: orderId, shopId, 'photoNotify.sent': false },
    { $set: { 'photoNotify.sent': true } },
    { new: true }
  );
  if (!claimed) return { ok: true, already: true };
  try {
    const { generateOrderPdf } = require('./pdfService');
    const pdf = await generateOrderPdf(shopId, orderId);
    const Shop = require('../models/Shop');
    const shop = await Shop.findById(shopId).lean();
    let emailNotify = { ok: false, skipped: true, reason: 'not-attempted' };
    if (!shop) {
      emailNotify = { ok: false, skipped: true, reason: 'no-shop' };
    } else if (!claimed.clientEmail) {
      emailNotify = { ok: false, skipped: true, reason: 'no-email' };
    } else {
      const { notifyOrderStatus } = require('./orderNotify');
      const plain = claimed.toObject ? claimed.toObject() : claimed;
      emailNotify = await notifyOrderStatus(shop, plain, 'created', {
        pdfAttachment: {
          filename: pdf.filename,
          content: pdf.buffer,
          contentType: 'application/pdf',
        },
        requirePdf: true,
      });
    }
    if (claimed.clientEmail && emailNotify?.ok === false && !emailNotify?.skipped) {
      await Order.updateOne(
        { _id: orderId, shopId },
        { $set: { 'photoNotify.sent': false } }
      );
    }
    return { ok: emailNotify?.ok !== false || Boolean(emailNotify?.skipped), emailNotify };
  } catch (err) {
    await Order.updateOne({ _id: orderId, shopId }, { $set: { 'photoNotify.sent': false } });
    console.warn('[orderCreate] laudo com fotos falhou', err?.message || err);
    return { ok: false, waiting: true, error: err?.message || String(err) };
  }
}

async function sendLaudoNow(shopId, orderId) {
  await repairPhotoNotify(shopId, orderId);
  const order = await Order.findOne({ _id: orderId, shopId });
  if (!order) return { ok: false, skipped: true, reason: 'missing' };
  if (pricePending(order)) return { ok: true, waiting: true, reason: 'awaiting-price' };
  const expected = order.photoNotify?.expected || [];
  const needsPhotos = expected.some((n) => Number(n) > 0);
  if (order.photoNotify) {
    await Order.updateOne({ _id: orderId, shopId }, { $set: { 'photoNotify.approved': true } });
  }
  if (needsPhotos && !itemPhotosReady(order)) {
    return { ok: true, waiting: true, reason: 'awaiting-photos' };
  }
  if (needsPhotos && order.photoNotify && !order.photoNotify.sent) {
    return releaseCreatedEmail(shopId, orderId);
  }
  return queueCreatedNotify(shopId, order);
}

async function notePhotoUpload(shopId, orderId, itemIndex, addedCount) {
  const added = Number(addedCount) || 0;
  if (added < 1) return;
  await repairPhotoNotify(shopId, orderId);
  const raw = await Order.collection.findOne(
    { _id: orderId, shopId, 'photoNotify.sent': { $ne: true } },
    { projection: { photoNotify: 1 } }
  );
  if (!raw?.photoNotify) return;
  const got = asNumberList(raw.photoNotify.got);
  while (got.length <= itemIndex) got.push(0);
  got[itemIndex] += added;
  await Order.updateOne({ _id: orderId, shopId }, { $set: { 'photoNotify.got': got } });
  const order = await Order.findOne({ _id: orderId, shopId });
  if (!order?.photoNotify || order.photoNotify.sent) return;
  if (!itemPhotosReady(order)) return;
  await releaseCreatedEmail(shopId, orderId);
}

async function uploadItemPhotos(shopId, orderId, itemIndex, files) {
  await repairPhotoNotify(shopId, orderId);
  const order = await Order.findOne({ _id: orderId, shopId });
  if (!order) {
    const err = new Error('Order not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  assertNotDeleted(order);

  hydrateItemsIfEmpty(order);
  const idx = assertItemIndex(itemIndex, order.items.length);

  const existing = Array.isArray(order.items[idx].photos)
    ? order.items[idx].photos.map((p) => ({
        key: p.key,
        url: p.url || null,
        isCover: Boolean(p.isCover),
      }))
    : [];
  assertPhotoFiles(files, existing.length);

  const added = await storeItemPhotoFiles(shopId, orderId, files, idx, existing.length);
  // Push only this item. A full save() here races with the other items' uploads
  // and can wipe their photos before the laudo is built.
  await Order.updateOne(
    { _id: orderId, shopId },
    { $push: { [`items.${idx}.photos`]: { $each: added } } }
  );
  const fresh = await Order.findOne({ _id: orderId, shopId });
  if (fresh) {
    syncOrderPhotosFromItems(fresh);
    await Order.updateOne({ _id: orderId, shopId }, { $set: { photos: fresh.photos || [] } });
  }
  await notePhotoUpload(shopId, orderId, idx, added.length);
  const saved = await Order.findOne({ _id: orderId, shopId }).lean();
  return saved;
}

async function deleteItemPhoto(shopId, orderId, itemIndex, photoIndex) {
  const order = await Order.findOne({ _id: orderId, shopId });
  if (!order) {
    const err = new Error('Order not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  assertNotDeleted(order);

  hydrateItemsIfEmpty(order);
  const idx = assertItemIndex(itemIndex, order.items.length);
  const photos = Array.isArray(order.items[idx].photos) ? [...order.items[idx].photos] : [];
  const pIdx = Number(photoIndex);
  if (!Number.isInteger(pIdx) || pIdx < 0 || pIdx >= photos.length) {
    const err = new Error('Photo not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const [removed] = photos.splice(pIdx, 1);
  if (removed?.key) {
    try {
      await storageService.deleteObject(removed.key);
    } catch {
      // best-effort — keep DB consistent even if storage delete fails
    }
  }
  if (photos.length && !photos.some((p) => p.isCover)) {
    photos[0].isCover = true;
  }
  order.items[idx].photos = photos;
  syncOrderPhotosFromItems(order);
  order.markModified('items');
  order.markModified('photos');
  await order.save();
  return order.toObject();
}

async function replaceOrderPhotos(shopId, orderId, files) {
  return uploadItemPhotos(shopId, orderId, 0, files);
}

async function getPublicOrderByToken(token) {
  const normalizedToken = String(token || '').trim();
  if (!normalizedToken || normalizedToken.length < 6) {
    const err = new Error('Link incompleto');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  const found = await Order.findOne({ publicToken: normalizedToken, deletedAt: null })
    .select('code shopId')
    .lean();
  if (!found) {
    const err = new Error('Order not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  const Shop = require('../models/Shop');
  const shop = await Shop.findById(found.shopId).select('slug').lean();
  if (!shop?.slug) {
    const err = new Error('Order not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  return getPublicOrderByCode(found.code, { shopSlug: shop.slug, token: normalizedToken });
}

async function submitPublicFeedbackByToken(token, { score, comment, tags } = {}) {
  const normalizedToken = String(token || '').trim();
  const found = await Order.findOne({ publicToken: normalizedToken, deletedAt: null })
    .select('code shopId')
    .lean();
  if (!found) {
    const err = new Error('Order not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  const Shop = require('../models/Shop');
  const shop = await Shop.findById(found.shopId).select('slug').lean();
  if (!shop?.slug) {
    const err = new Error('Order not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  return submitPublicFeedback(found.code, {
    shopSlug: shop.slug,
    token: normalizedToken,
    score,
    comment,
    tags,
  });
}

async function getPublicOrderByCode(code, { shopSlug, token } = {}) {
  const normalizedCode = String(code || '').trim();
  const normalizedToken = String(token || '').trim();
  const slug = String(shopSlug || '').trim().toLowerCase();

  if (!normalizedCode) {
    const err = new Error('code required');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  if (!slug) {
    const err = new Error('shop slug required (/p/{shop}/{code}?t=…)');
    err.status = 400;
    err.code = 'SHOP_REQUIRED';
    throw err;
  }
  if (!normalizedToken || normalizedToken.length < 6) {
    const err = new Error('Link incompleto — use o QR ou o link enviado (token ausente)');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const Shop = require('../models/Shop');
  const shop = await Shop.findOne({ slug }).lean();
  if (!shop) {
    const err = new Error('Order not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const { moduleEnabled } = require('./platformConsoleService');
  if (!(await moduleEnabled(shop._id, 'publicOrder'))) {
    const err = new Error('Order not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const order = await Order.findOne({
    shopId: shop._id,
    code: normalizedCode,
    publicToken: normalizedToken,
    deletedAt: null,
  })
    .populate('currentSectorId', 'name slug color showOnPublic')
    .lean();

  if (!order) {
    const err = new Error('Order not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  // Mask full name a bit for public surface
  const rawName = String(order.clientName || '').trim();
  const clientDisplay =
    rawName.length <= 2
      ? rawName
      : `${rawName.split(/\s+/)[0]}${rawName.split(/\s+/).length > 1 ? ' …' : ''}`;

  const sectorDoc = order.currentSectorId;
  let currentSector = null;
  if (sectorDoc) {
    const visible = sectorDoc.showOnPublic !== false;
    if (visible) {
      currentSector = {
        name: sectorDoc.name,
        color: sectorDoc.color,
        publicHidden: false,
      };
    } else {
      currentSector = {
        name: 'Em andamento',
        slug: null,
        color: null,
        publicHidden: true,
      };
    }
  }

  const { effectiveItems } = require('./orderItems');
  const { ensureItemSectors, asId } = require('./itemSectors');
  ensureItemSectors(order);
  const itemsRaw = effectiveItems(order);
  const itemSectorIds = [
    ...new Set(itemsRaw.map((it) => asId(it.currentSectorId)).filter(Boolean)),
  ];
  const Sector = require('../models/Sector');
  const itemSectors = itemSectorIds.length
    ? await Sector.find({ _id: { $in: itemSectorIds }, shopId: shop._id })
        .select('name color showOnPublic')
        .lean()
    : [];
  const itemSecMap = new Map(itemSectors.map((s) => [String(s._id), s]));

  const items = itemsRaw.map((it, index) => {
    const sid = asId(it.currentSectorId);
    const sec = sid ? itemSecMap.get(sid) : null;
    let itemSector = null;
    if (sec) {
      if (sec.showOnPublic !== false) {
        itemSector = { name: sec.name, color: sec.color || null };
      } else {
        itemSector = { name: 'Em andamento', color: null };
      }
    }
    return {
      index: index + 1,
      shoeModel: it.shoeModel || '',
      currentSector: itemSector,
    };
  });

  return {
    code: order.code,
    shop: {
      name: shop.branding?.displayName || shop.name,
      slug: shop.slug,
      logoUrl: shop.branding?.logoUrl || '',
      primaryColor: shop.branding?.primaryColor || '',
      accentColor: shop.branding?.accentColor || '',
      phone: shop.branding?.phone || '',
    },
    clientName: clientDisplay,
    shoeModel: order.shoeModel,
    items,
    itemCount: items.length,
    status: order.status,
    currentSector,
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

async function ensureOrderPublicToken(orderDoc) {
  return require('../utils/publicOrderToken').ensureOrderPublicToken(orderDoc);
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
  const orders = await Order.find({ shopId, status: 'delivered', deletedAt: null })
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
  patchOrderItem,
  addOrderItem,
  deleteOrderItem,
  reopenOrder,
  addOrderComment,
  deleteOrder,
  restoreOrder,
  purgeOrder,
  replaceOrderPhotos,
  uploadItemPhotos,
  releaseCreatedEmail,
  repairPhotoNotify,
  deleteItemPhoto,
  getPublicOrderByCode,
  getPublicOrderByToken,
  submitPublicFeedback,
  submitPublicFeedbackByToken,
  ensureOrderPublicToken,
  nextOrderCode,
  servicesTotal,
};
