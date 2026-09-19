const Shop = require('../models/Shop');
const Subscription = require('../models/Subscription');
const Membership = require('../models/Membership');
const User = require('../models/User');

async function listShops({ q, status, limit = 50 } = {}) {
  const filter = {};
  if (status) filter.status = status;
  if (q) {
    filter.$or = [
      { name: new RegExp(String(q).trim(), 'i') },
      { slug: new RegExp(String(q).trim(), 'i') },
    ];
  }
  const shops = await Shop.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(Number(limit) || 50, 1), 200))
    .lean();

  const shopIds = shops.map((s) => s._id);
  const [subs, memberCounts, orderStats] = await Promise.all([
    Subscription.find({ shopId: { $in: shopIds } }).lean(),
    Membership.aggregate([
      { $match: { shopId: { $in: shopIds }, active: true } },
      { $group: { _id: '$shopId', count: { $sum: 1 } } },
    ]),
    (() => {
      try {
        const Order = require('../models/Order');
        return Order.aggregate([
          { $match: { shopId: { $in: shopIds } } },
          {
            $group: {
              _id: '$shopId',
              orderCount: { $sum: 1 },
              openCount: {
                $sum: {
                  $cond: [
                    { $in: ['$status', ['open', 'in_progress', 'ready']] },
                    1,
                    0,
                  ],
                },
              },
              lastOrderAt: { $max: '$createdAt' },
            },
          },
        ]);
      } catch (_err) {
        return Promise.resolve([]);
      }
    })(),
  ]);

  const subByShop = Object.fromEntries(subs.map((s) => [String(s.shopId), s]));
  const countByShop = Object.fromEntries(
    memberCounts.map((m) => [String(m._id), m.count])
  );
  const ordersByShop = Object.fromEntries(
    (orderStats || []).map((o) => [String(o._id), o])
  );

  const now = Date.now();
  return shops.map((shop) => {
    const sub = subByShop[String(shop._id)];
    const ord = ordersByShop[String(shop._id)];
    let trialDaysLeft = null;
    if (sub?.status === 'trialing' && sub?.trialEndsAt) {
      trialDaysLeft = Math.ceil((new Date(sub.trialEndsAt).getTime() - now) / 86400000);
    }
    return {
      id: shop._id,
      name: shop.name,
      slug: shop.slug,
      status: shop.status,
      createdAt: shop.createdAt,
      adminNote: shop.adminNote || '',
      memberCount: countByShop[String(shop._id)] || 0,
      orderCount: ord?.orderCount || 0,
      openCount: ord?.openCount || 0,
      lastOrderAt: ord?.lastOrderAt || null,
      trialDaysLeft,
      subscription: sub
        ? {
            status: sub.status,
            trialEndsAt: sub.trialEndsAt,
            planCode: sub.planCode,
            currentPeriodEnd: sub.currentPeriodEnd,
            provider: sub.provider,
          }
        : null,
    };
  });
}

async function patchShop(shopId, updates = {}) {
  const shop = await Shop.findById(shopId);
  if (!shop) {
    const err = new Error('Shop not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (updates.status != null) {
    if (!['active', 'suspended'].includes(updates.status)) {
      const err = new Error('Invalid shop status');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    shop.status = updates.status;
  }
  if (updates.adminNote != null) {
    shop.adminNote = String(updates.adminNote || '').slice(0, 2000);
  }
  await shop.save();

  let subscription = await Subscription.findOne({ shopId }).lean();

  if (updates.extendTrialDays != null) {
    const days = Math.min(Math.max(Number(updates.extendTrialDays) || 0, 1), 90);
    const base =
      subscription?.trialEndsAt && new Date(subscription.trialEndsAt) > new Date()
        ? new Date(subscription.trialEndsAt)
        : new Date();
    const trialEndsAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
    subscription = await Subscription.findOneAndUpdate(
      { shopId },
      {
        $set: {
          status: 'trialing',
          trialEndsAt,
          planCode: subscription?.planCode || 'WORQERA_PRO',
        },
      },
      { new: true, upsert: true }
    ).lean();
  }

  if (updates.subscriptionStatus != null) {
    const allowed = ['trialing', 'active', 'past_due', 'canceled', 'expired'];
    if (!allowed.includes(updates.subscriptionStatus)) {
      const err = new Error('Invalid subscription status');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    const $set = { status: updates.subscriptionStatus };
    if (updates.subscriptionStatus === 'active') {
      $set.trialEndsAt = null;
      $set.provider = 'Manual';
      if (!subscription?.currentPeriodEnd) {
        $set.currentPeriodEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      }
    }
    if (updates.planCode != null) {
      $set.planCode = String(updates.planCode).slice(0, 64);
    }
    subscription = await Subscription.findOneAndUpdate(
      { shopId },
      { $set },
      { new: true, upsert: true }
    ).lean();
  } else if (updates.planCode != null) {
    subscription = await Subscription.findOneAndUpdate(
      { shopId },
      { $set: { planCode: String(updates.planCode).slice(0, 64) } },
      { new: true, upsert: true }
    ).lean();
  }

  return {
    id: shop._id,
    name: shop.name,
    slug: shop.slug,
    status: shop.status,
    createdAt: shop.createdAt,
    subscription: subscription
      ? {
          status: subscription.status,
          trialEndsAt: subscription.trialEndsAt,
          planCode: subscription.planCode,
          currentPeriodEnd: subscription.currentPeriodEnd,
          provider: subscription.provider,
        }
      : null,
  };
}

async function getShopDetail(shopId) {
  const shop = await Shop.findById(shopId).lean();
  if (!shop) {
    const err = new Error('Shop not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  const [subscription, members] = await Promise.all([
    Subscription.findOne({ shopId }).lean(),
    Membership.find({ shopId }).lean(),
  ]);
  const users = await User.find({
    _id: { $in: members.map((m) => m.userId) },
  }).lean();
  const userById = Object.fromEntries(users.map((u) => [String(u._id), u]));

  return {
    id: shop._id,
    name: shop.name,
    slug: shop.slug,
    status: shop.status,
    createdAt: shop.createdAt,
    branding: shop.branding,
    subscription,
    members: members.map((m) => ({
      id: m._id,
      role: m.role,
      active: m.active,
      sectorIds: m.sectorIds,
      user: userById[String(m.userId)]
        ? {
            id: userById[String(m.userId)]._id,
            email: userById[String(m.userId)].email,
            name: userById[String(m.userId)].name,
          }
        : null,
    })),
  };
}

module.exports = { listShops, patchShop, getShopDetail };
