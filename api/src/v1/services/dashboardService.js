const Order = require('../models/Order');
const Sector = require('../models/Sector');
const Client = require('../models/Client');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { serializeOrder } = require('../serializers');
const { effectiveItems, hydrateItemsIfEmpty } = require('./orderItems');
const { asId, ensureItemSectors, pairLabel } = require('./itemSectors');
const { isItemLate } = require('../lib/lateness');
const { countQueueFocus } = require('../lib/queueFocus');

/**
 * One kanban card per item. Sector is the item's column, not the order rollup.
 * Single-item orders keep the order code; multi-item orders use code-N.
 */
function sectorItemCards(order, terminalIds = new Set(), now = new Date()) {
  if (!order || order.deletedAt) return [];
  hydrateItemsIfEmpty(order);
  ensureItemSectors(order);
  const items = effectiveItems(order);
  const cards = [];
  items.forEach((item, index) => {
    const sectorId = asId(item.currentSectorId) || asId(order.currentSectorId);
    if (!sectorId) return;
    const itemId = item._id ? String(item._id) : `idx-${index}`;
    const code = String(order.code || '');
    const itemInTerminal = terminalIds.has(sectorId);
    cards.push({
      sectorId,
      id: `${order._id || order.id}:${itemId}`,
      code: items.length > 1 ? pairLabel(code, index + 1) : code,
      clientName: order.clientName || '',
      dueAt: order.dueAt || null,
      status: order.status || null,
      itemInTerminal,
      late: isItemLate(order, itemInTerminal, now),
      priority: order.priority ?? null,
      sectorHistory:
        Array.isArray(item.sectorHistory) && item.sectorHistory.length
          ? item.sectorHistory
          : order.sectorHistory || [],
      createdAt: order.createdAt || null,
      updatedAt: order.updatedAt || null,
    });
  });
  return cards;
}

async function getSummary(shopId) {
  const [sectors, orders, clientsCount, subscription] = await Promise.all([
    Sector.find({ shopId, active: true }).sort({ order: 1 }).lean(),
    Order.find({
      shopId,
      status: { $nin: ['cancelled', 'delivered'] },
    }).lean(),
    Client.countDocuments({ shopId }),
    Subscription.findOne({ shopId }).lean(),
  ]);

  const bySector = {};
  for (const s of sectors) {
    bySector[String(s._id)] = {
      sectorId: s._id,
      name: s.name,
      slug: s.slug,
      order: s.order,
      count: 0,
    };
  }

  const now = new Date();
  const terminalIds = new Set(sectors.filter((s) => s.isTerminal).map((s) => String(s._id)));
  const itemCards = [];
  for (const o of orders) {
    if (o.deletedAt) continue;
    for (const card of sectorItemCards(o, terminalIds, now)) {
      if (bySector[card.sectorId]) bySector[card.sectorId].count += 1;
      itemCards.push(card);
    }
  }
  const queue = countQueueFocus(itemCards, now);
  const overdue = queue.late;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const completedToday = await Order.countDocuments({
    shopId,
    status: 'delivered',
    deliveredAt: { $gte: startOfDay },
  });

  return {
    openOrders: orders.length,
    clientsCount,
    overdue,
    dueToday: queue.dueToday,
    dueTomorrow: queue.dueTomorrow,
    ready: queue.ready,
    completedToday,
    bySector: Object.values(bySector),
    subscription: subscription
      ? {
          status: subscription.status,
          trialEndsAt: subscription.trialEndsAt,
          planCode: subscription.planCode,
        }
      : null,
  };
}

async function getDashboard(shopId, auth = {}) {
  const summary = await getSummary(shopId);
  const [totalClients, activeOrders, pendingOrders, recentOrders, user] = await Promise.all([
    Client.countDocuments({ shopId }),
    Order.countDocuments({ shopId, status: { $in: ['open', 'in_progress', 'ready'] } }),
    Order.countDocuments({ shopId, status: 'open' }),
    Order.find({ shopId, status: { $nin: ['cancelled', 'delivered'] } })
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean(),
    auth.userId ? User.findById(auth.userId).lean() : null,
  ]);

  return {
    stats: {
      totalClients,
      activeOrders,
      pendingOrders,
      completedToday: summary.completedToday,
      overdue: summary.overdue,
      dueToday: summary.dueToday,
      dueTomorrow: summary.dueTomorrow,
      ready: summary.ready,
      openOrders: summary.openOrders,
    },
    recentOrders: recentOrders.map(serializeOrder),
    bySector: summary.bySector,
    subscription: summary.subscription,
    user: {
      name: user?.name || auth.email || 'User',
      role: auth.role || null,
      permissions: auth.role === 'owner' || auth.role === 'admin' ? ['*'] : [],
    },
  };
}

async function getSectorsStats(shopId, { includeOrders = false } = {}) {
  const [sectors, orders] = await Promise.all([
    Sector.find({ shopId, active: true }).sort({ order: 1 }).lean(),
    Order.find({
      shopId,
      status: { $nin: ['cancelled', 'delivered'] },
      deletedAt: null,
    }).lean(),
  ]);

  const buckets = new Map(sectors.map((s) => [String(s._id), []]));
  const terminalIds = new Set(sectors.filter((s) => s.isTerminal).map((s) => String(s._id)));
  const now = new Date();
  for (const order of orders) {
    for (const card of sectorItemCards(order, terminalIds, now)) {
      const list = buckets.get(card.sectorId);
      if (!list) continue;
      list.push(card);
    }
  }

  const bySector = sectors.map((s) => {
    const cards = buckets.get(String(s._id)) || [];
    const item = {
      sectorId: s._id,
      id: String(s._id),
      name: s.name,
      slug: s.slug,
      color: s.color,
      order: s.order,
      isTerminal: Boolean(s.isTerminal),
      count: cards.length,
    };
    if (includeOrders) item.orders = cards;
    return item;
  });

  return {
    sectors: bySector,
    data: bySector,
    totalOpen: orders.length,
  };
}

module.exports = {
  getSummary,
  getDashboard,
  getSectorsStats,
  getSetoresStats: getSectorsStats,
  sectorItemCards,
};
