const Subscription = require('../models/Subscription');
const Membership = require('../models/Membership');
const { BASIC_USER_CAP, basicUserCapReached } = require('../lib/planCap');

/**
 * Blocks one more active account on Basic (owner included). Accounts that already
 * exist are never switched off: the cap only stops new ones and reactivations.
 */
async function assertBasicUserCap(shopId) {
  const sub = await Subscription.findOne({ shopId }).select('planCode').lean();
  if (!sub?.planCode) return;
  const active = await Membership.countDocuments({ shopId, active: true });
  if (!basicUserCapReached(sub.planCode, active)) return;
  const err = new Error(
    `O plano Basic tem até ${BASIC_USER_CAP} usuários. Suba para o Pro para ter usuários ilimitados.`
  );
  err.status = 402;
  err.code = 'BASIC_USER_CAP';
  err.title = 'Payment Required';
  throw err;
}

module.exports = { assertBasicUserCap };
