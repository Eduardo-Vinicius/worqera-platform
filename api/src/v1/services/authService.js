const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Shop = require('../models/Shop');
const Membership = require('../models/Membership');
const Subscription = require('../models/Subscription');
const Sector = require('../models/Sector');

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

async function signup({ email, password, name, shopName, shopSlug }) {
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

  const shop = await Shop.create({
    name: shopName || `${user.name}'s Shop`,
    slug,
    status: 'active',
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

  return {
    user: { id: user._id, email: user.email, name: user.name },
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
  return { token: accessToken, accessToken };
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
    memberships: memberships.map((m) => {
      const shop = shopById[String(m.shopId)];
      const sub = subByShop[String(m.shopId)];
      return {
        id: m._id,
        shopId: m.shopId,
        role: m.role,
        sectorIds: m.sectorIds,
        shop: shop
          ? { id: shop._id, name: shop.name, slug: shop.slug, status: shop.status }
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
  hashPassword,
  verifyPassword,
  signAccessToken,
  slugify,
  DEFAULT_SECTORS,
};
