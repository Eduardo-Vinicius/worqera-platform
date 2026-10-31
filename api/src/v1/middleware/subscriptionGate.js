const Subscription = require('../models/Subscription');
const { sendError } = require('./errors');

const ACTIVE_STATUSES = new Set(['trialing', 'active']);
const GRACE_MS = 5 * 24 * 60 * 60 * 1000;

/** Active, trial in time, a missed payment inside the 5-day grace, or canceled with paid days left. */
function canUse(sub, now = new Date()) {
  if (!sub) return false;
  const t = now.getTime();
  const at = (d) => (d ? new Date(d).getTime() : 0);
  if (sub.status === 'active') return true;
  if (sub.status === 'trialing') {
    if (!sub.trialEndsAt || at(sub.trialEndsAt) > t) return true;
    return Boolean(sub.providerSubscriptionId) && at(sub.trialEndsAt) + GRACE_MS > t;
  }
  if (sub.status === 'past_due') return at(sub.currentPeriodEnd) + GRACE_MS > t;
  if (sub.status === 'canceled') return at(sub.currentPeriodEnd) > t;
  return false;
}

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

    if (req.membership?.platformVisit) {
      req.subscription = sub || { status: 'active', planCode: 'visit', platformVisit: true };
      return next();
    }

    // Local and any non-production run stay open so the app can be tried
    // without a paid or trialing plan. Production still requires one.
    if (process.env.NODE_ENV !== 'production') {
      req.subscription = sub || { status: 'active', planCode: 'dev', devBypass: true };
      return next();
    }

    if (!canUse(sub)) {
      if (sub && sub.status === 'trialing') {
        await Subscription.updateOne({ _id: sub._id }, { $set: { status: 'expired' } });
      }
      return sendError(res, 402, {
        title: 'Subscription Inactive',
        detail: sub?.status === 'trialing' ? 'Trial period has ended' : 'Active or trialing subscription required',
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

module.exports = { subscriptionGate, canUse, ACTIVE_STATUSES };
