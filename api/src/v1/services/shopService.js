const Shop = require('../models/Shop');
const Membership = require('../models/Membership');
const User = require('../models/User');
const { hashPassword } = require('./authService');

async function getCurrentShop(shopId) {
  return Shop.findById(shopId).lean();
}

async function patchCurrentShop(shopId, updates) {
  const allowed = {};
  if (updates.name != null) allowed.name = updates.name;
  if (updates.timezone != null) allowed.timezone = updates.timezone;
  if (updates.branding != null) {
    allowed.branding = {
      displayName: updates.branding.displayName,
      emailFromName: updates.branding.emailFromName,
      legacyBrand: updates.branding.legacyBrand,
    };
  }
  return Shop.findByIdAndUpdate(shopId, { $set: allowed }, { new: true }).lean();
}

async function listMembers(shopId) {
  const memberships = await Membership.find({ shopId }).lean();
  const userIds = memberships.map((m) => m.userId);
  const users = await User.find({ _id: { $in: userIds } }).lean();
  const userById = Object.fromEntries(users.map((u) => [String(u._id), u]));

  return memberships.map((m) => {
    const u = userById[String(m.userId)];
    return {
      id: m._id,
      userId: m.userId,
      role: m.role,
      sectorIds: m.sectorIds,
      active: m.active,
      user: u ? { id: u._id, email: u.email, name: u.name } : null,
    };
  });
}

async function addMember(shopId, { email, password, name, role, sectorIds }) {
  if (!email || !password) {
    const err = new Error('email and password required');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  let user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    user = await User.create({
      email: normalizedEmail,
      passwordHash: await hashPassword(password),
      name: name || normalizedEmail.split('@')[0],
    });
  }

  const existing = await Membership.findOne({ userId: user._id, shopId });
  if (existing) {
    const err = new Error('Membership already exists');
    err.status = 409;
    err.code = 'CONFLICT';
    throw err;
  }

  const membership = await Membership.create({
    userId: user._id,
    shopId,
    role: role || 'atendimento',
    sectorIds: sectorIds || [],
    active: true,
  });

  return {
    id: membership._id,
    userId: user._id,
    role: membership.role,
    sectorIds: membership.sectorIds,
    active: membership.active,
    user: { id: user._id, email: user.email, name: user.name },
  };
}

async function patchMember(shopId, membershipId, updates) {
  const membership = await Membership.findOne({ _id: membershipId, shopId });
  if (!membership) {
    const err = new Error('Membership not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (updates.role != null) membership.role = updates.role;
  if (updates.sectorIds != null) membership.sectorIds = updates.sectorIds;
  if (updates.active != null) membership.active = updates.active;
  await membership.save();
  return membership.toObject();
}

module.exports = {
  getCurrentShop,
  patchCurrentShop,
  listMembers,
  addMember,
  patchMember,
};
