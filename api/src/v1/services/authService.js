const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Shop = require('../models/Shop');
const Membership = require('../models/Membership');
const Subscription = require('../models/Subscription');
const Sector = require('../models/Sector');
const { isPlatformAdminEmail } = require('../middleware/platformAdmin');

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 10);
const JWT_SECRET = () => process.env.JWT_SECRET || 'changeme';
const JWT_EXPIRES = () => process.env.JWT_EXPIRES_IN || process.env.JWT_EXPIRES || '480m';
const REFRESH_SECRET = () => process.env.REFRESH_SECRET || 'refreshchangeme';
const REFRESH_EXPIRES = () => process.env.REFRESH_EXPIRES || '7d';

const DEFAULT_SECTORS = [
  { name: 'Atendimento', slug: 'atendimento', order: 1, color: '#2196F3', isTerminal: false },
  { name: 'Sapataria', slug: 'sapataria', order: 2, color: '#FF9800', isTerminal: false },
  { name: 'Costura', slug: 'costura', order: 3, color: '#9C27B0', isTerminal: false },
  { name: 'Lavagem', slug: 'lavagem', order: 4, color: '#00BCD4', isTerminal: false },
  { name: 'Acabamento', slug: 'acabamento', order: 5, color: '#4CAF50', isTerminal: false },
  { name: 'Pintura', slug: 'pintura', order: 6, color: '#F44336', isTerminal: false },
  { name: 'Atendimento final', slug: 'atendimento-final', order: 7, color: '#4CAF50', isTerminal: true },
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
  return jwt.sign(
    {
      sub: String(user._id),
      email: user.email,
      role: membership?.role || null,
      shopId: membership ? String(membership.shopId) : null,
      membershipId: membership ? String(membership._id) : null,
    },
    JWT_SECRET(),
    { expiresIn: JWT_EXPIRES() }
  );
}

function signRefreshToken(user) {
  return jwt.sign({ sub: String(user._id) }, REFRESH_SECRET(), {
    expiresIn: REFRESH_EXPIRES(),
  });
}

async function signup({ email, password, name, shopName, shopSlug, partnerCode, ref }) {
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

  const slug = slugify(shopSlug || shopName || name);
  if (!slug) {
    const err = new Error('Invalid shop slug');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const slugTaken = await Shop.findOne({ slug });
  if (slugTaken) {
    const err = new Error('Shop slug taken');
    err.status = 409;
    err.code = 'CONFLICT';
    err.detail = 'Shop slug already in use';
    throw err;
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({
    email: normalizedEmail,
    passwordHash,
    name: name || normalizedEmail.split('@')[0],
  });

  const referredBy = String(partnerCode || ref || '')
    .trim()
    .toUpperCase() || null;

  const shop = await Shop.create({
    name: shopName || `${user.name}'s Shop`,
    slug,
    status: 'active',
    partnerCode: generatePartnerCode(),
    referredByPartnerCode: referredBy,
    branding: {
      displayName: shopName || user.name,
      emailFromName: shopName || user.name,
      legacyBrand: null,
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
    planCode: 'WORQERA_PRO',
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

  const accessToken = signAccessToken({ user, membership });
  const refreshToken = signRefreshToken(user);

  return {
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

  const memberships = await Membership.find({ userId: user._id, active: true }).lean();
  const primary = memberships[0] || null;
  const accessToken = signAccessToken({ user, membership: primary });
  const refreshToken = signRefreshToken(user);
  const primaryShop = primary ? await Shop.findById(primary.shopId).lean() : null;

  return {
    user: { id: user._id, email: user.email, name: user.name },
    shop: primaryShop
      ? { id: primaryShop._id, name: primaryShop.name, slug: primaryShop.slug }
      : null,
    memberships: memberships.map((m) => ({
      id: m._id,
      shopId: m.shopId,
      role: m.role,
      sectorIds: m.sectorIds,
    })),
    token: accessToken,
    accessToken,
    refreshToken,
  };
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
  if (!user) {
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
  return { ok: true };
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
    user: { id: user._id, email: user.email, name: user.name },
    platformAdmin: isPlatformAdminEmail(user.email),
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

module.exports = {
  signup,
  login,
  refresh,
  me,
  requestPasswordReset,
  resetPassword,
  hashPassword,
  verifyPassword,
  signAccessToken,
  slugify,
  DEFAULT_SECTORS,
};
