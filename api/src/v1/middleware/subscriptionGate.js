const Subscription = require('../models/Subscription');
const { sendError } = require('./errors');

const ACTIVE_STATUSES = new Set(['trialing', 'active']);

async function subscriptionGate(req, res, next) {
  try {
    const shopId = req.shopId || req.shop?._id;
    if (!shopId) {
      return sendError(res, 400, {
        title: 'Shop Required',
        detail: 'Shop context required',
        code: 'SHOP_REQUIRED',
      });
    }

    const sub = await Subscription.findOne({ shopId }).lean();
    if (!sub || !ACTIVE_STATUSES.has(sub.status)) {
      return sendError(res, 402, {
        title: 'Subscription Inactive',
        detail: 'Active or trialing subscription required',
        code: 'SUBSCRIPTION_INACTIVE',
      });
    }

    if (sub.status === 'trialing' && sub.trialEndsAt && new Date(sub.trialEndsAt) < new Date()) {
      await Subscription.updateOne({ _id: sub._id }, { $set: { status: 'expired' } });
      return sendError(res, 402, {
        title: 'Subscription Inactive',
        detail: 'Trial period has ended',
        code: 'SUBSCRIPTION_INACTIVE',
      });
    }

    req.subscription = sub;
    return next();
  } catch (err) {
    console.error('[subscriptionGate]', err);
    return sendError(res, 500, {
      title: 'Internal Server Error',
      detail: err.message,
      code: 'INTERNAL_ERROR',
    });
  }
}

module.exports = { subscriptionGate, ACTIVE_STATUSES };
