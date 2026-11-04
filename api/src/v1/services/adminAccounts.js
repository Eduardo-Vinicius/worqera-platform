/** Platform admin actions on a login account. */
const mongoose = require('mongoose');
const { normalizeEmail } = require('../lib/email');

function fail(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

/**
 * Moves an account to a new login e-mail (the shop owner changed e-mail, a typo at signup…).
 * The data stays on the same account. Every session ends, the new e-mail is unverified and
 * gets a link to set a password.
 */
async function transferEmail(userId, newEmail, req) {
  const User = require('../models/User');
  if (!mongoose.isValidObjectId(userId)) throw fail(404, 'NOT_FOUND', 'Conta não encontrada');
  const email = normalizeEmail(newEmail);
  if (!email) throw fail(400, 'VALIDATION_ERROR', 'Informe o e-mail novo.');
  const user = await User.findById(userId);
  if (!user) throw fail(404, 'NOT_FOUND', 'Conta não encontrada');
  const previousEmail = user.email;
  if (previousEmail === email) throw fail(409, 'EMAIL_UNCHANGED', 'A conta já usa esse e-mail.');
  if (await User.exists({ email, _id: { $ne: user._id } })) throw fail(409, 'EMAIL_ALREADY_EXISTS', 'Esse e-mail já é de outra conta.');

  user.email = email;
  user.emailVerifiedAt = null;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  user.passwordResetTokenHash = null;
  user.passwordResetExpires = null;
  await user.save();

  require('../lib/securityLog').record(user._id, 'account_transferred', req, { byUserId: req?.auth?.userId ? String(req.auth.userId) : null });
  const { requestPasswordReset } = require('./authService');
  let passwordEmailSent = false;
  try {
    await requestPasswordReset(email);
    passwordEmailSent = true;
  } catch (err) {
    console.warn('[admin] password e-mail after transfer', err?.message || err);
  }
  return { accountId: String(user._id), previousEmail, newEmail: email, sessionsEnded: true, passwordEmailSent };
}

module.exports = { transferEmail };
