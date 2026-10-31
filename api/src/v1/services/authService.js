const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Shop = require('../models/Shop');
const Membership = require('../models/Membership');
const Subscription = require('../models/Subscription');
const Sector = require('../models/Sector');
const { isPlatformAdminEmail } = require('../middleware/platformAdmin');
const { writeTokenVersion } = require('../lib/sessionVersion');

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 10);
const JWT_SECRET = () => process.env.JWT_SECRET || 'changeme';
const JWT_EXPIRES = () => process.env.JWT_EXPIRES_IN || process.env.JWT_EXPIRES || '480m';
const REFRESH_SECRET = () => process.env.REFRESH_SECRET || 'refreshchangeme';
const REFRESH_EXPIRES = () => process.env.REFRESH_EXPIRES || '7d';

/** Neutral defaults — each shop renames sectors; footwear seed stays CdT-specific. */
const DEFAULT_SECTORS = [
  { name: 'Recebido', slug: 'recebido', order: 1, color: '#2196F3', isTerminal: false },
  { name: 'Em produção', slug: 'em-producao', order: 2, color: '#FF9800', isTerminal: false },
  { name: 'Controle', slug: 'controle', order: 3, color: '#9C27B0', isTerminal: false },
  { name: 'Pronto para retirada', slug: 'pronto', order: 4, color: '#4CAF50', isTerminal: true },
];

function slugify(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 64);
}

async function hashPassword(plain) {
  return bcrypt.hash(String(plain), BCRYPT_ROUNDS);
}

async function verifyPassword(plain, hash) {
  if (!hash) return false;
  return bcrypt.compare(String(plain), hash);
}

function signAccessToken({ user, membership }) {
  const platformAdmin = isPlatformAdminEmail(user.email);
  return jwt.sign(
    {
      sub: String(user._id),
      email: user.email,
      role: membership?.role || (platformAdmin ? 'platform' : null),
      shopId: membership ? String(membership.shopId) : null,
      membershipId: membership ? String(membership._id) : null,
      platformAdmin: Boolean(platformAdmin),
      tv: Number(user.tokenVersion) || 0,
    },
    JWT_SECRET(),
    { expiresIn: JWT_EXPIRES() }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { sub: String(user._id), tv: Number(user.tokenVersion) || 0 },
    REFRESH_SECRET(),
    { expiresIn: REFRESH_EXPIRES() }
  );
}

function signupPlanCode(planCode) {
  const code = String(planCode || '').trim().toUpperCase().replace(/^WORQERA_/, '');
  if (code === 'BASIC') return 'WORQERA_BASIC';
  if (code === 'BUSINESS') return 'WORQERA_BUSINESS';
  return 'WORQERA_PRO';
}

async function allocateSlug(base) {
  const root = slugify(base).slice(0, 48) || 'oficina';
  for (let n = 0; n < 8; n += 1) {
    const slug = n === 0 ? root : `${root}-${n + 1}`;
    const taken = await Shop.findOne({ slug }).select('_id').lean();
    if (!taken) return slug;
  }
  return `${root}-${crypto.randomBytes(2).toString('hex')}`;
}

async function signup({ email, password, name, shopName, shopSlug, partnerCode, ref, planCode, kit }) {
  const { generatePartnerCode } = require('./shopService');
  const normalizedEmail = String(email).toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    const err = new Error('User already exists');
    err.status = 409;
    err.code = 'CONFLICT';
    err.title = 'Conflict';
    err.detail = 'Email already registered';
    throw err;
  }

  const slug = shopSlug
    ? slugify(shopSlug)
    : await allocateSlug(shopName || name);
  if (!slug) {
    const err = new Error('Invalid shop slug');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  if (shopSlug) {
    const slugTaken = await Shop.findOne({ slug }).select('_id').lean();
    if (slugTaken) {
      const err = new Error('Shop slug taken');
      err.status = 409;
      err.code = 'CONFLICT';
      err.detail = 'Shop slug already in use';
      throw err;
    }
  }

  const passwordHash = await hashPassword(password);
  const user = new User({
    email: normalizedEmail,
    passwordHash,
    name: name || normalizedEmail.split('@')[0],
    emailVerifiedAt: null,
    emailVerifyRequired: true,
  });
  const verification = issueEmailVerification(user);
  await user.save();

  const referredBy = String(partnerCode || ref || '')
    .trim()
    .toUpperCase() || null;

  const shop = await Shop.create({
    name: shopName || `${user.name}'s Shop`,
    slug,
    status: 'active',
    vertical: 'general',
    partnerCode: generatePartnerCode(),
    referredByPartnerCode: referredBy,
    branding: {
      displayName: shopName || user.name,
      emailFromName: shopName || user.name,
      legacyBrand: null,
      itemLabel: 'peça',
      itemLabelPlural: 'peças',
    },
  });

  const membership = await Membership.create({
    userId: user._id,
    shopId: shop._id,
    role: 'owner',
    sectorIds: [],
    active: true,
  });

  const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const subscription = await Subscription.create({
    shopId: shop._id,
    planCode: signupPlanCode(planCode),
    status: 'trialing',
    provider: 'Manual',
    trialEndsAt,
  });

  await Sector.insertMany(
    DEFAULT_SECTORS.map((s) => ({
      shopId: shop._id,
      ...s,
      active: true,
    }))
  );

  // Business type picked at signup: kanban setores, services and item noun for that kind of shop.
  if (kit) {
    const { applyStarterKit, STARTER_KITS } = require('./shopService');
    if (STARTER_KITS[String(kit).toLowerCase()]) {
      await applyStarterKit(shop._id, { kit }).catch((err) => console.warn('[signup] kit', err.message));
    }
  }

  await sendEmailVerificationMail(user.email, verification);

  // No session until e-mail confirmed
  return {
    requiresEmailVerification: true,
    ...devVerification(verification),
    user: { id: user._id, email: user.email, name: user.name },
    shop: { id: shop._id, name: shop.name, slug: shop.slug },
    membership: {
      id: membership._id,
      role: membership.role,
      shopId: membership.shopId,
    },
    subscription: {
      status: subscription.status,
      trialEndsAt: subscription.trialEndsAt,
      planCode: subscription.planCode,
    },
    message: 'Enviamos um código de confirmação para o seu e-mail. Digite o código para entrar.',
  };
}

const VERIFY_TTL_MS = 48 * 60 * 60 * 1000;
const VERIFY_RESEND_GAP_MS = 60 * 1000;
const VERIFY_MAX_ATTEMPTS = 5;

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function codeHash(user, code) {
  return sha256(`${user._id}:${String(code).trim()}`);
}

/** New link token + 6-digit code on the user doc (caller saves). */
function issueEmailVerification(user) {
  const token = crypto.randomBytes(32).toString('hex');
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  user.emailVerifyTokenHash = sha256(token);
  user.emailVerifyCodeHash = codeHash(user, code);
  user.emailVerifyExpires = new Date(Date.now() + VERIFY_TTL_MS);
  user.emailVerifyAttempts = 0;
  user.emailVerifySentAt = new Date();
  return { token, code };
}

function devVerification({ token, code }) {
  if (process.env.NODE_ENV === 'production') return {};
  return { devToken: token, devCode: code };
}

async function sendEmailVerificationMail(to, { token, code }) {
  const base = (process.env.PUBLIC_WEB_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');
  const url = `${base}/verify-email?token=${encodeURIComponent(token)}`;
  try {
    const { sendMail } = require('./mailer');
    await sendMail({
      to,
      subject: `${code} é o seu código Worqera`,
      text: `Seu código para ativar a conta Worqera: ${code}\n\nOu confirme pelo link:\n${url}\n\nVálido por 48 horas. Se não foi você, ignore este e-mail.`,
      html: `<p>Seu código para ativar a conta <strong>Worqera</strong>:</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:12px 0;color:#110f17">${code}</p>
        <p>Ou confirme direto pelo botão:</p>
        <p><a href="${url}" style="display:inline-block;background:#7d26de;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:600">Confirmar e-mail</a></p>
        <p style="font-size:13px;color:#64748b">Válido por 48 horas. Se não foi você, ignore este e-mail.</p>`,
    });
  } catch (err) {
    console.error('[auth] verify email failed', err.message);
  }
}

function needsEmailVerification(user) {
  if (!user) return false;
  if (user.emailVerifiedAt) return false;
  if (isPlatformAdminEmail(user.email)) return false;
  return Boolean(user.emailVerifyTokenHash);
}

function mustVerifyEmail(user) {
  return needsEmailVerification(user) && user.emailVerifyRequired === true;
}

function emailNotVerifiedError(email, extras = {}) {
  const err = new Error('Email not verified');
  err.status = 403;
  err.code = 'EMAIL_NOT_VERIFIED';
  err.title = 'Forbidden';
  err.detail = 'Confirme seu e-mail para entrar. Enviamos um código para a sua caixa de entrada.';
  err.extras = { email, ...extras };
  return err;
}

async function sessionFor(user) {
  const emailVerified = !needsEmailVerification(user);
  const memberships = await Membership.find({ userId: user._id, active: true }).lean();
  const primary = memberships[0] || null;
  const accessToken = signAccessToken({ user, membership: primary });
  const refreshToken = signRefreshToken(user);
  const primaryShop = primary ? await Shop.findById(primary.shopId).lean() : null;

  return {
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      emailVerified,
    },
    shop: primaryShop
      ? { id: primaryShop._id, name: primaryShop.name, slug: primaryShop.slug }
      : null,
    memberships: memberships.map((m) => ({
      id: m._id,
      shopId: m.shopId,
      role: m.role,
      sectorIds: m.sectorIds,
    })),
    platformAdmin: isPlatformAdminEmail(user.email),
    emailVerified,
    emailVerificationRequired: !emailVerified,
    token: accessToken,
    accessToken,
    refreshToken,
  };
}

async function login({ email, password }) {
  const user = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (!user) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    err.code = 'UNAUTHORIZED';
    err.detail = 'Invalid credentials';
    throw err;
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    err.code = 'UNAUTHORIZED';
    err.detail = 'Invalid credentials';
    throw err;
  }

  // New signups wait for the confirmation. Older accounts keep the soft warning in the UI.
  if (mustVerifyEmail(user)) {
    const expired = !user.emailVerifyExpires || user.emailVerifyExpires.getTime() < Date.now();
    let extras = {};
    if (expired) {
      const verification = issueEmailVerification(user);
      await user.save();
      await sendEmailVerificationMail(user.email, verification);
      extras = { resent: true, ...devVerification(verification) };
    }
    throw emailNotVerifiedError(user.email, extras);
  }

  return sessionFor(user);
}

async function refresh(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, REFRESH_SECRET());
  } catch {
    const err = new Error('Invalid refresh token');
    err.status = 401;
    err.code = 'UNAUTHORIZED';
    throw err;
  }

  const user = await User.findById(payload.sub);
  if (!user || mustVerifyEmail(user)) {
    const err = new Error('User not found');
    err.status = 401;
    err.code = 'UNAUTHORIZED';
    throw err;
  }
  const membership = await Membership.findOne({ userId: user._id, active: true });
  const accessToken = signAccessToken({ user, membership });
  const nextRefresh = signRefreshToken(user);
  return { token: accessToken, accessToken, refreshToken: nextRefresh };
}

/**
 * Always returns ok (anti-enumeration). In development, resetToken is returned
 * so local flows work without email. Production should wire SES later.
 */
async function requestPasswordReset(email) {
  const normalized = String(email || '')
    .toLowerCase()
    .trim();
  const user = normalized ? await User.findOne({ email: normalized }) : null;
  if (!user) {
    return { ok: true };
  }

  const raw = crypto.randomBytes(32).toString('hex');
  user.passwordResetTokenHash = crypto.createHash('sha256').update(raw).digest('hex');
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  const out = { ok: true };
  if (process.env.NODE_ENV !== 'production') {
    out.resetToken = raw;
    out.devHint = 'Use POST /auth/reset-password with this token (dev only)';
  }

  const base = (process.env.PUBLIC_WEB_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');
  const resetUrl = `${base}/reset-password?token=${encodeURIComponent(raw)}`;
  try {
    const { sendMail } = require('./mailer');
    await sendMail({
      to: user.email,
      subject: 'Redefinir senha',
      text: `Redefina sua senha: ${resetUrl}\n\nToken válido por 1 hora.`,
      html: `<p>Redefina sua senha:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Válido por 1 hora.</p>`,
    });
  } catch (err) {
    console.error('[auth] reset email failed', err.message);
  }
  return out;
}

async function resetPassword({ token, password }) {
  if (!token || !password || String(password).length < 6) {
    const err = new Error('token and password (min 6) required');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  const hash = crypto.createHash('sha256').update(String(token)).digest('hex');
  const user = await User.findOne({
    passwordResetTokenHash: hash,
    passwordResetExpires: { $gt: new Date() },
  });
  if (!user) {
    const err = new Error('Invalid or expired reset token');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  user.passwordHash = await hashPassword(password);
  user.passwordResetTokenHash = null;
  user.passwordResetExpires = null;
  await user.save();
  await revokeSession(user._id);
  return { ok: true, userId: user._id };
}

function verifyError(detail) {
  const err = new Error('Invalid or expired verification');
  err.status = 400;
  err.code = 'VALIDATION_ERROR';
  err.detail = detail;
  return err;
}

async function findUserForCode(email, code) {
  const normalized = String(email || '').toLowerCase().trim();
  const digits = String(code || '').replace(/\D/g, '');
  if (!normalized || digits.length !== 6) throw verifyError('Digite o código de 6 números do e-mail.');
  const user = await User.findOne({ email: normalized });
  if (!user || !user.emailVerifyCodeHash || !user.emailVerifyExpires || user.emailVerifyExpires.getTime() < Date.now()) {
    throw verifyError('Código expirado. Peça um novo código.');
  }
  if ((Number(user.emailVerifyAttempts) || 0) >= VERIFY_MAX_ATTEMPTS) {
    throw verifyError('Muitas tentativas. Peça um novo código.');
  }
  const expected = Buffer.from(user.emailVerifyCodeHash, 'hex');
  const given = Buffer.from(codeHash(user, digits), 'hex');
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) {
    user.emailVerifyAttempts = (Number(user.emailVerifyAttempts) || 0) + 1;
    await user.save();
    const left = VERIFY_MAX_ATTEMPTS - user.emailVerifyAttempts;
    throw verifyError(left > 0 ? `Código incorreto. Restam ${left} tentativas.` : 'Muitas tentativas. Peça um novo código.');
  }
  return user;
}

/** Confirms by link token or by e-mail + 6-digit code, then opens the session. */
async function verifyEmail({ token, email, code } = {}) {
  let user;
  if (token) {
    user = await User.findOne({
      emailVerifyTokenHash: sha256(token),
      emailVerifyExpires: { $gt: new Date() },
    });
    if (!user) throw verifyError('Link inválido ou expirado. Peça um novo e-mail de confirmação.');
  } else {
    user = await findUserForCode(email, code);
  }
  user.emailVerifiedAt = new Date();
  user.emailVerifyTokenHash = null;
  user.emailVerifyCodeHash = null;
  user.emailVerifyExpires = null;
  user.emailVerifyAttempts = 0;
  await user.save();
  return { ok: true, email: user.email, ...(await sessionFor(user)) };
}

async function resendEmailVerification(email) {
  const normalized = String(email || '')
    .toLowerCase()
    .trim();
  const out = { ok: true, retryIn: Math.round(VERIFY_RESEND_GAP_MS / 1000) };
  const user = normalized ? await User.findOne({ email: normalized }) : null;
  if (!user) return out;
  if (user.emailVerifiedAt) {
    out.alreadyVerified = true;
    return out;
  }
  const since = user.emailVerifySentAt ? Date.now() - user.emailVerifySentAt.getTime() : Infinity;
  if (since < VERIFY_RESEND_GAP_MS) {
    out.retryIn = Math.ceil((VERIFY_RESEND_GAP_MS - since) / 1000);
    out.throttled = true;
    return out;
  }
  const verification = issueEmailVerification(user);
  await user.save();
  await sendEmailVerificationMail(user.email, verification);
  return { ...out, ...devVerification(verification) };
}

async function me(userId) {
  const user = await User.findById(userId).lean();
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const memberships = await Membership.find({ userId, active: true }).lean();
  const shopIds = memberships.map((m) => m.shopId);
  const [shops, subscriptions] = await Promise.all([
    Shop.find({ _id: { $in: shopIds } }).lean(),
    Subscription.find({ shopId: { $in: shopIds } }).lean(),
  ]);

  const shopById = Object.fromEntries(shops.map((s) => [String(s._id), s]));
  const subByShop = Object.fromEntries(subscriptions.map((s) => [String(s.shopId), s]));

  return {
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      emailVerified: !needsEmailVerification(user),
    },
    platformAdmin: isPlatformAdminEmail(user.email),
    emailVerified: !needsEmailVerification(user),
    emailVerificationRequired: needsEmailVerification(user),
    memberships: memberships.map((m) => {
      const shop = shopById[String(m.shopId)];
      const sub = subByShop[String(m.shopId)];
      return {
        id: m._id,
        shopId: m.shopId,
        role: m.role,
        sectorIds: m.sectorIds,
        shop: shop
          ? {
              id: shop._id,
              name: shop.name,
              slug: shop.slug,
              status: shop.status,
              branding: shop.branding || {},
              partnerCode: shop.partnerCode || null,
            }
          : null,
        subscription: sub
          ? {
              status: sub.status,
              trialEndsAt: sub.trialEndsAt,
              planCode: sub.planCode,
              currentPeriodEnd: sub.currentPeriodEnd,
            }
          : null,
      };
    }),
  };
}

async function revokeSession(userId) {
  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { tokenVersion: 1 } },
    { new: true }
  );
  if (!user) return null;
  await writeTokenVersion(user._id, user.tokenVersion);
  return user.tokenVersion;
}

module.exports = {
  signup,
  login,
  refresh,
  me,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
  resendEmailVerification,
  hashPassword,
  verifyPassword,
  signAccessToken,
  revokeSession,
  slugify,
  DEFAULT_SECTORS,
};
