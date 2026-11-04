/**
 * Account deletion from inside the app (App Store 5.1.1(v), Play data deletion).
 * Personal data on the login goes away; shop records (orders, clients) stay with the shop.
 * A shop whose only owner leaves is suspended and its subscription canceled.
 */
const crypto = require('crypto');

function fail(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  err.detail = message;
  return err;
}

async function deleteAccount(userId, { confirm } = {}, req) {
  const User = require('../models/User');
  const Membership = require('../models/Membership');
  const Shop = require('../models/Shop');
  const Subscription = require('../models/Subscription');
  if (String(confirm || '').trim().toUpperCase() !== 'EXCLUIR') {
    throw fail(400, 'CONFIRMATION_REQUIRED', 'Digite EXCLUIR para confirmar.');
  }
  const user = await User.findById(userId);
  if (!user || user.deletedAt) throw fail(404, 'NOT_FOUND', 'Conta não encontrada.');

  const memberships = await Membership.find({ userId: user._id, active: true }).lean();
  const suspendedShops = [];
  for (const m of memberships.filter((x) => x.role === 'owner')) {
    const otherOwners = await Membership.countDocuments({ shopId: m.shopId, role: 'owner', active: true, userId: { $ne: user._id } });
    if (otherOwners) continue;
    const sub = await Subscription.findOne({ shopId: m.shopId }).lean();
    if (sub && ['active', 'past_due', 'trialing'].includes(sub.status)) {
      try {
        await require('./billingService').cancelSubscription(m.shopId);
      } catch (err) {
        console.warn('[account] cancel subscription', err?.message || err);
        await Subscription.updateOne({ shopId: m.shopId }, { $set: { status: 'canceled' } });
      }
    }
    await Shop.updateOne(
      { _id: m.shopId },
      { $set: { status: 'suspended', adminNote: `Conta do dono excluída pelo app em ${new Date().toLocaleDateString('pt-BR')}.` } }
    );
    suspendedShops.push(String(m.shopId));
  }
  await Membership.updateMany({ userId: user._id }, { $set: { active: false } });

  const previousEmail = user.email;
  user.email = `excluida+${user._id}@deleted.worqera.app`;
  user.name = 'Conta excluída';
  user.passwordHash = crypto.randomBytes(32).toString('hex');
  user.appleSub = null;
  user.emailVerifiedAt = null;
  user.emailVerifyTokenHash = null;
  user.emailVerifyCodeHash = null;
  user.passwordResetTokenHash = null;
  user.passwordResetExpires = null;
  user.lastLocation = undefined;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  user.deletedAt = new Date();
  await user.save();

  require('../lib/securityLog').record(user._id, 'account_deleted', req);
  console.info('[account] deleted', { userId: String(user._id), suspendedShops: suspendedShops.length, previousDomain: previousEmail.split('@')[1] });
  return { ok: true, suspendedShops: suspendedShops.length };
}

module.exports = { deleteAccount };
