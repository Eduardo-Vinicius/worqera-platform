const PlatformConfig = require('../models/PlatformConfig');
const PlatformNotice = require('../models/PlatformNotice');
const User = require('../models/User');
const Membership = require('../models/Membership');
const Shop = require('../models/Shop');
const { redisCmd } = require('../lib/redisClient');
const { noticeMatches } = require('../lib/runtimeMatch');

const DEFAULT_FEATURES = [
  { key: 'whatsapp', label: 'WhatsApp', enabled: true, shops: [] },
  { key: 'publicOrder', label: 'Consulta pública', enabled: true, shops: [] },
  { key: 'reviews', label: 'Avaliações', enabled: true, shops: [] },
  { key: 'emailNotify', label: 'E-mail do laudo', enabled: true, shops: [] },
];

const DEFAULT_SERVICES = [
  { key: 'kanban', label: 'Kanban', enabled: true, shops: [] },
  { key: 'orders', label: 'Pedidos', enabled: true, shops: [] },
  { key: 'finance', label: 'Financeiro', enabled: true, shops: [] },
  { key: 'metrics', label: 'Métricas da oficina', enabled: true, shops: [] },
];

const SEALS = new Set(['', 'verificado', 'destaque', 'parceiro']);

function mergeFlags(current, defaults) {
  const list = Array.isArray(current) ? current.map((item) => ({ ...item.toObject?.() || item })) : [];
  let changed = false;
  for (const def of defaults) {
    if (!list.some((item) => item.key === def.key)) {
      list.push({ ...def, shops: [] });
      changed = true;
    }
  }
  return { list, changed };
}

async function bustRuntimeCache() {
  await redisCmd((redis) => redis.incr('runtime:gen'));
}

async function ensureConfig() {
  let doc = await PlatformConfig.findOne({ key: 'global' });
  if (!doc) {
    return PlatformConfig.create({
      key: 'global',
      features: DEFAULT_FEATURES,
      services: DEFAULT_SERVICES,
    });
  }
  const features = mergeFlags(doc.features, DEFAULT_FEATURES);
  const services = mergeFlags(doc.services, DEFAULT_SERVICES);
  if (features.changed || services.changed) {
    doc.features = features.list;
    doc.services = services.list;
    await doc.save();
  }
  return doc;
}

function presentFlag(item) {
  return {
    key: item.key,
    label: item.label || item.key,
    enabled: Boolean(item.enabled),
    shops: (item.shops || []).map((s) => ({
      shopId: String(s.shopId),
      enabled: Boolean(s.enabled),
    })),
  };
}

function resolveFlag(item, shopId) {
  if (!shopId) return Boolean(item.enabled);
  const over = (item.shops || []).find((s) => String(s.shopId) === String(shopId));
  if (over) return Boolean(over.enabled);
  return Boolean(item.enabled);
}

function applyFlagUpdate(list, incoming) {
  if (!Array.isArray(incoming)) return list;
  const byKey = new Map(list.map((item) => [item.key, { ...presentFlag(item) }]));
  for (const row of incoming) {
    if (!row?.key || !byKey.has(row.key)) continue;
    const current = byKey.get(row.key);
    if (row.enabled != null) current.enabled = Boolean(row.enabled);
    if (row.shopId) {
      const shops = current.shops.filter((s) => s.shopId !== String(row.shopId));
      if (row.inherit) {
        current.shops = shops;
      } else if (row.shopEnabled != null) {
        shops.push({ shopId: String(row.shopId), enabled: Boolean(row.shopEnabled) });
        current.shops = shops;
      }
    }
    byKey.set(row.key, current);
  }
  return [...byKey.values()];
}

async function getConfig() {
  const doc = await ensureConfig();
  return {
    features: (doc.features || []).map(presentFlag),
    services: (doc.services || []).map(presentFlag),
    seals: ['', 'verificado', 'destaque', 'parceiro'],
  };
}

async function updateConfig(body = {}) {
  const doc = await ensureConfig();
  if (Array.isArray(body.features)) doc.features = applyFlagUpdate(doc.features, body.features);
  if (Array.isArray(body.services)) doc.services = applyFlagUpdate(doc.services, body.services);
  doc.markModified('features');
  doc.markModified('services');
  await doc.save();
  await bustRuntimeCache();
  return getConfig();
}

function presentNotice(doc) {
  return {
    id: String(doc._id),
    title: doc.title,
    body: doc.body || '',
    startsAt: doc.startsAt,
    endsAt: doc.endsAt,
    intervalHours: Number(doc.intervalHours) || 0,
    region: doc.region || '',
    platform: doc.platform || 'all',
    minVersion: doc.minVersion || '',
    maxVersion: doc.maxVersion || '',
    active: doc.active !== false,
  };
}

async function listNotices() {
  const rows = await PlatformNotice.find().sort({ createdAt: -1 }).lean();
  return rows.map(presentNotice);
}

async function createNotice(body = {}) {
  const title = String(body.title || '').trim();
  if (!title) {
    const err = new Error('Título obrigatório');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  const platform = ['all', 'web', 'ios', 'android'].includes(body.platform) ? body.platform : 'all';
  const doc = await PlatformNotice.create({
    title,
    body: String(body.body || '').slice(0, 2000),
    startsAt: body.startsAt ? new Date(body.startsAt) : null,
    endsAt: body.endsAt ? new Date(body.endsAt) : null,
    intervalHours: Math.max(0, Number(body.intervalHours) || 0),
    region: String(body.region || '').trim().slice(0, 80),
    platform,
    minVersion: String(body.minVersion || '').trim().slice(0, 32),
    maxVersion: String(body.maxVersion || '').trim().slice(0, 32),
    active: body.active !== false,
  });
  await bustRuntimeCache();
  return presentNotice(doc);
}

async function deleteNotice(id) {
  const doc = await PlatformNotice.findByIdAndDelete(id);
  if (!doc) {
    const err = new Error('Notícia não encontrada');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  await bustRuntimeCache();
  return { ok: true };
}

async function buildRuntimeConfig({ shopId, platform, version, region }) {
  const gen = (await redisCmd((redis) => redis.get('runtime:gen'))) || '0';
  const cacheKey = `runtime:cfg:${gen}:${shopId || '-'}:${platform || 'web'}:${version || '-'}:${region || '-'}`;
  const cached = await redisCmd((redis) => redis.get(cacheKey));
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      /* recompute */
    }
  }

  const doc = await ensureConfig();
  const shop = shopId ? await Shop.findById(shopId).select('seal name').lean() : null;
  const notices = await PlatformNotice.find({ active: true }).sort({ createdAt: -1 }).lean();
  const query = { platform, version, region };
  const payload = {
    platform: platform || 'web',
    version: version || '',
    region: region || '',
    seal: shop?.seal || '',
    features: Object.fromEntries((doc.features || []).map((item) => [item.key, resolveFlag(item, shopId)])),
    services: Object.fromEntries((doc.services || []).map((item) => [item.key, resolveFlag(item, shopId)])),
    notices: notices.filter((n) => noticeMatches(n, query)).map(presentNotice),
  };
  await redisCmd((redis) => redis.set(cacheKey, JSON.stringify(payload), { EX: 30 }));
  return payload;
}

async function saveLocation(userId, body = {}) {
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    const err = new Error('lat/lng inválidos');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  const accuracy = body.accuracy != null ? Number(body.accuracy) : null;
  await User.updateOne(
    { _id: userId },
    {
      $set: {
        lastLocation: {
          lat,
          lng,
          accuracy: Number.isFinite(accuracy) ? accuracy : null,
          at: new Date(),
        },
      },
    }
  );
  return { ok: true };
}

async function listLocations() {
  const users = await User.find({ 'lastLocation.at': { $ne: null } })
    .sort({ 'lastLocation.at': -1 })
    .limit(50)
    .select('name email lastLocation')
    .lean();
  const ids = users.map((u) => u._id);
  const memberships = await Membership.find({ userId: { $in: ids }, active: true })
    .select('userId shopId')
    .lean();
  const shopIds = [...new Set(memberships.map((m) => String(m.shopId)))];
  const shops = await Shop.find({ _id: { $in: shopIds } }).select('name').lean();
  const shopName = Object.fromEntries(shops.map((s) => [String(s._id), s.name]));
  const shopByUser = {};
  for (const m of memberships) {
    if (!shopByUser[String(m.userId)]) shopByUser[String(m.userId)] = shopName[String(m.shopId)] || '';
  }
  return users.map((u) => ({
    userId: String(u._id),
    name: u.name,
    email: u.email,
    shopName: shopByUser[String(u._id)] || '',
    lat: u.lastLocation?.lat,
    lng: u.lastLocation?.lng,
    accuracy: u.lastLocation?.accuracy,
    at: u.lastLocation?.at,
  }));
}

module.exports = {
  SEALS,
  getConfig,
  updateConfig,
  listNotices,
  createNotice,
  deleteNotice,
  buildRuntimeConfig,
  saveLocation,
  listLocations,
  bustRuntimeCache,
};
