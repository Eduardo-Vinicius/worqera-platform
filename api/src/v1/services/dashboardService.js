const Order = require('../models/Order');
const Sector = require('../models/Sector');
const Client = require('../models/Client');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { serializeOrder } = require('../serializers');

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

  let overdue = 0;
  const now = new Date();
  for (const o of orders) {
    const key = o.currentSectorId ? String(o.currentSectorId) : null;
    if (key && bySector[key]) bySector[key].count += 1;
    if (o.dueAt && new Date(o.dueAt) < now) overdue += 1;
  }

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
    Order.find({ shopId }).sort({ createdAt: -1 }).limit(10).lean(),
    auth.userId ? User.findById(auth.userId).lean() : null,
  ]);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const completedToday = await Order.countDocuments({
    shopId,
    status: 'delivered',
    $or: [{ deliveredAt: { $gte: startOfDay } }, { updatedAt: { $gte: startOfDay } }],
  });

  return {
    stats: {
      totalClients,
      activeOrders,
      pendingOrders,
      completedToday,
      overdue: summary.overdue,
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

async function getSetoresStats(shopId, { includeOrders = false } = {}) {
  const [sectors, orders] = await Promise.all([
    Sector.find({ shopId, active: true }).sort({ order: 1 }).lean(),
    Order.find({ shopId, status: { $nin: ['cancelled', 'delivered'] } }).lean(),
  ]);

  const bySector = sectors.map((s) => {
    const sectorOrders = orders.filter(
      (o) => o.currentSectorId && String(o.currentSectorId) === String(s._id)
    );
    const item = {
      sectorId: s._id,
      id: String(s._id),
      name: s.name,
      slug: s.slug,
      color: s.color,
      order: s.order,
      count: sectorOrders.length,
    };
    if (includeOrders) {
      item.orders = sectorOrders.map(serializeOrder);
    }
    return item;
  });

  return {
    setores: bySector,
    data: bySector,
    totalOpen: orders.length,
  };
}

module.exports = { getSummary, getDashboard, getSetoresStats };
