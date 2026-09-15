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
  const [subs, memberCounts] = await Promise.all([
    Subscription.find({ shopId: { $in: shopIds } }).lean(),
    Membership.aggregate([
      { $match: { shopId: { $in: shopIds }, active: true } },
      { $group: { _id: '$shopId', count: { $sum: 1 } } },
    ]),
  ]);

  const subByShop = Object.fromEntries(subs.map((s) => [String(s.shopId), s]));
  const countByShop = Object.fromEntries(
    memberCounts.map((m) => [String(m._id), m.count])
  );

  return shops.map((shop) => ({
    id: shop._id,
    name: shop.name,
    slug: shop.slug,
    status: shop.status,
    createdAt: shop.createdAt,
    memberCount: countByShop[String(shop._id)] || 0,
    subscription: subByShop[String(shop._id)]
      ? {
          status: subByShop[String(shop._id)].status,
          trialEndsAt: subByShop[String(shop._id)].trialEndsAt,
          planCode: subByShop[String(shop._id)].planCode,
          currentPeriodEnd: subByShop[String(shop._id)].currentPeriodEnd,
          provider: subByShop[String(shop._id)].provider,
        }
      : null,
  }));
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
    subscription = await Subscription.findOneAndUpdate(
      { shopId },
      { $set: { status: updates.subscriptionStatus } },
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
