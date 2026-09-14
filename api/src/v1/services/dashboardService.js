const Order = require('../models/Order');
const Sector = require('../models/Sector');
const Client = require('../models/Client');
const Subscription = require('../models/Subscription');

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

  return {
    openOrders: orders.length,
    clientsCount,
    overdue,
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

module.exports = { getSummary };
