const crypto = require('crypto');
const Shop = require('../models/Shop');
const Membership = require('../models/Membership');
const User = require('../models/User');
const { hashPassword } = require('./authService');

function slugify(input) {
  return String(input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function generatePartnerCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

function normalizeHexColor(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const m = raw.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!m) {
    const err = new Error('Cor inválida (use #RGB ou #RRGGBB)');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return `#${h.toUpperCase()}`;
}

async function getCurrentShop(shopId) {
  return Shop.findById(shopId).lean();
}

async function ensurePartnerCode(shopId) {
  const shop = await Shop.findById(shopId);
  if (!shop) return null;
  if (shop.partnerCode) return shop.toObject();
  for (let i = 0; i < 5; i += 1) {
    const code = generatePartnerCode();
    try {
      shop.partnerCode = code;
      await shop.save();
      return shop.toObject();
    } catch (err) {
      if (err?.code !== 11000) throw err;
    }
  }
  return shop.toObject();
}

async function regeneratePartnerCode(shopId) {
  const shop = await Shop.findById(shopId);
  if (!shop) {
    const err = new Error('Shop not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  for (let i = 0; i < 5; i += 1) {
    shop.partnerCode = generatePartnerCode();
    try {
      await shop.save();
      return shop.toObject();
    } catch (err) {
      if (err?.code !== 11000) throw err;
    }
  }
  const err = new Error('Could not allocate partner code');
  err.status = 500;
  throw err;
}

async function patchCurrentShop(shopId, updates) {
  const shop = await Shop.findById(shopId);
  if (!shop) {
    const err = new Error('Shop not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (updates.name != null) shop.name = String(updates.name).trim();
  if (updates.timezone != null) shop.timezone = updates.timezone;

  if (updates.slug != null) {
    const next = slugify(updates.slug);
    if (!next || next.length < 2) {
      const err = new Error('slug inválido (mín. 2 caracteres)');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    if (next !== shop.slug) {
      const clash = await Shop.findOne({ slug: next, _id: { $ne: shopId } }).lean();
      if (clash) {
        const err = new Error('slug já em uso');
        err.status = 409;
        err.code = 'CONFLICT';
        throw err;
      }
      shop.slug = next;
    }
  }

  if (updates.vertical != null) {
    const allowed = new Set(['general', 'footwear', 'laundry', 'repair', 'custom']);
    const v = String(updates.vertical || '').toLowerCase();
    if (allowed.has(v)) shop.vertical = v;
  }

  if (updates.branding != null && typeof updates.branding === 'object') {
    const b = updates.branding;
    shop.branding = shop.branding || {};
    if (b.displayName != null) shop.branding.displayName = b.displayName;
    if (b.emailFromName != null) shop.branding.emailFromName = b.emailFromName;
    if (b.legacyBrand != null) shop.branding.legacyBrand = b.legacyBrand;
    if (b.phone != null) shop.branding.phone = b.phone;
    if (b.address != null) shop.branding.address = b.address;
    if (b.logoUrl != null) shop.branding.logoUrl = String(b.logoUrl || '').trim();
    if (b.primaryColor != null) shop.branding.primaryColor = normalizeHexColor(b.primaryColor);
    if (b.accentColor != null) shop.branding.accentColor = normalizeHexColor(b.accentColor);
    if (b.itemLabel != null) shop.branding.itemLabel = String(b.itemLabel || '').trim().slice(0, 40);
    if (b.itemLabelPlural != null) {
      shop.branding.itemLabelPlural = String(b.itemLabelPlural || '').trim().slice(0, 40);
    }
  }

  if (updates.tvSettings != null && typeof updates.tvSettings === 'object') {
    shop.tvSettings = shop.tvSettings || {};
    if (updates.tvSettings.client) {
      shop.tvSettings.client = {
        ...(shop.tvSettings.client?.toObject?.() || shop.tvSettings.client || {}),
        ...updates.tvSettings.client,
      };
    }
    if (updates.tvSettings.floor) {
      shop.tvSettings.floor = {
        ...(shop.tvSettings.floor?.toObject?.() || shop.tvSettings.floor || {}),
        ...updates.tvSettings.floor,
      };
    }
  }

  if (updates.notifications != null && typeof updates.notifications === 'object') {
    shop.notifications = shop.notifications || {};
    if (updates.notifications.whatsapp) {
      const w = updates.notifications.whatsapp;
      shop.notifications.whatsapp = shop.notifications.whatsapp || {};
      if (w.enabled != null) shop.notifications.whatsapp.enabled = Boolean(w.enabled);
      if (w.shopPhoneE164 != null) shop.notifications.whatsapp.shopPhoneE164 = w.shopPhoneE164;
      if (w.templates && typeof w.templates === 'object') {
        shop.notifications.whatsapp.templates = {
          ...(shop.notifications.whatsapp.templates?.toObject?.() ||
            shop.notifications.whatsapp.templates ||
            {}),
          ...w.templates,
        };
      }
    }
    if (updates.notifications.email) {
      const e = updates.notifications.email;
      shop.notifications.email = shop.notifications.email || {};
      if (e.enabled != null) shop.notifications.email.enabled = Boolean(e.enabled);
    }
  }

  if (updates.onboardingComplete === true) {
    shop.onboarding = shop.onboarding || {};
    shop.onboarding.completedAt = new Date();
  }
  if (updates.onboarding && typeof updates.onboarding === 'object') {
    if (updates.onboarding.completedAt != null) {
      shop.onboarding.completedAt = updates.onboarding.completedAt;
    }
  }

  if (updates.regeneratePartnerCode === true) {
    await shop.save();
    return regeneratePartnerCode(shopId);
  }

  await shop.save();
  if (!shop.partnerCode) {
    return ensurePartnerCode(shopId);
  }
  return shop.toObject();
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

  const allowedRoles = ['admin', 'atendimento', 'sector'];
  const nextRole = String(role || 'atendimento').toLowerCase();
  if (!allowedRoles.includes(nextRole)) {
    const err = new Error('Invalid role (use admin, atendimento, or sector)');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const sectors = Array.isArray(sectorIds) ? sectorIds : [];
  if (nextRole === 'sector' && sectors.length === 0) {
    const err = new Error('sectorIds required when role is sector');
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
    role: nextRole,
    sectorIds: nextRole === 'sector' ? sectors : [],
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

  if (membership.role === 'owner' && updates.role != null && updates.role !== 'owner') {
    const err = new Error('Cannot change owner role');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  if (updates.role != null) {
    const nextRole = String(updates.role).toLowerCase();
    if (!['admin', 'atendimento', 'sector', 'owner'].includes(nextRole)) {
      const err = new Error('Invalid role');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    if (nextRole === 'owner' && membership.role !== 'owner') {
      const err = new Error('Cannot promote to owner via this endpoint');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    membership.role = nextRole;
  }
  if (updates.sectorIds != null) membership.sectorIds = updates.sectorIds;
  if (updates.active != null) {
    if (membership.role === 'owner' && updates.active === false) {
      const err = new Error('Cannot deactivate owner');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    membership.active = updates.active;
  }

  if (membership.role === 'sector' && !(membership.sectorIds || []).length) {
    const err = new Error('sectorIds required when role is sector');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  await membership.save();
  return membership.toObject();
}

async function resetMemberPassword(shopId, membershipId, password) {
  if (!password || String(password).length < 6) {
    const err = new Error('password min 6 required');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  const membership = await Membership.findOne({ _id: membershipId, shopId });
  if (!membership) {
    const err = new Error('Membership not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  const user = await User.findById(membership.userId);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  user.passwordHash = await hashPassword(password);
  user.passwordResetTokenHash = null;
  user.passwordResetExpires = null;
  await user.save();
  return { ok: true, userId: user._id, email: user.email };
}

async function seedDefaultCatalog(shopId) {
  const ServiceCatalog = require('../models/ServiceCatalog');
  const DEFAULT_SERVICES = [
    { name: 'Limpeza Simples', defaultPrice: 30, sortOrder: 1 },
    { name: 'Limpeza Completa', defaultPrice: 50, sortOrder: 2 },
    { name: 'Restauração', defaultPrice: 80, sortOrder: 3 },
    { name: 'Reparo', defaultPrice: 40, sortOrder: 4 },
    { name: 'Customização', defaultPrice: 120, sortOrder: 5 },
    { name: 'Pintura', defaultPrice: 60, sortOrder: 6 },
    { name: 'Troca de Sola', defaultPrice: 70, sortOrder: 7 },
    { name: 'Costura', defaultPrice: 35, sortOrder: 8 },
  ];
  const count = await ServiceCatalog.countDocuments({ shopId });
  if (count > 0) return { ok: true, seeded: 0, existing: count };
  await ServiceCatalog.insertMany(
    DEFAULT_SERVICES.map((s) => ({
      shopId,
      name: s.name,
      defaultPrice: s.defaultPrice,
      sortOrder: s.sortOrder,
      active: true,
      sectorPathHint: [],
    }))
  );
  return { ok: true, seeded: DEFAULT_SERVICES.length, existing: 0 };
}

const STARTER_KITS = {
  general: {
    vertical: 'general',
    itemLabel: 'peça',
    itemLabelPlural: 'peças',
    sectors: [
      { name: 'Recebido', slug: 'recebido', order: 1, color: '#2196F3', isTerminal: false },
      { name: 'Em produção', slug: 'em-producao', order: 2, color: '#FF9800', isTerminal: false },
      { name: 'Controle', slug: 'controle', order: 3, color: '#9C27B0', isTerminal: false },
      { name: 'Pronto para retirada', slug: 'pronto', order: 4, color: '#4CAF50', isTerminal: true },
    ],
    services: [
      { name: 'Serviço padrão', defaultPrice: 50, sortOrder: 1 },
      { name: 'Serviço expresso', defaultPrice: 80, sortOrder: 2 },
      { name: 'Revisão', defaultPrice: 30, sortOrder: 3 },
    ],
  },
  footwear: {
    vertical: 'footwear',
    itemLabel: 'tênis',
    itemLabelPlural: 'tênis',
    sectors: [
      { name: 'Atendimento', slug: 'atendimento', order: 1, color: '#2196F3', isTerminal: false },
      { name: 'Sapataria', slug: 'sapataria', order: 2, color: '#FF9800', isTerminal: false },
      { name: 'Lavagem', slug: 'lavagem', order: 3, color: '#00BCD4', isTerminal: false },
      { name: 'Acabamento', slug: 'acabamento', order: 4, color: '#9C27B0', isTerminal: false },
      { name: 'Pronto', slug: 'pronto', order: 5, color: '#4CAF50', isTerminal: true },
    ],
    services: [
      { name: 'Limpeza Simples', defaultPrice: 30, sortOrder: 1 },
      { name: 'Limpeza Completa', defaultPrice: 50, sortOrder: 2 },
      { name: 'Restauração', defaultPrice: 80, sortOrder: 3 },
      { name: 'Troca de Sola', defaultPrice: 70, sortOrder: 4 },
      { name: 'Costura', defaultPrice: 35, sortOrder: 5 },
    ],
  },
  laundry: {
    vertical: 'laundry',
    itemLabel: 'roupa',
    itemLabelPlural: 'roupas',
    sectors: [
      { name: 'Recepção', slug: 'recepcao', order: 1, color: '#2196F3', isTerminal: false },
      { name: 'Lavagem', slug: 'lavagem', order: 2, color: '#00BCD4', isTerminal: false },
      { name: 'Secagem', slug: 'secagem', order: 3, color: '#FF9800', isTerminal: false },
      { name: 'Passadoria', slug: 'passadoria', order: 4, color: '#9C27B0', isTerminal: false },
      { name: 'Pronto', slug: 'pronto', order: 5, color: '#4CAF50', isTerminal: true },
    ],
    services: [
      { name: 'Lavagem simples', defaultPrice: 25, sortOrder: 1 },
      { name: 'Lavagem + passar', defaultPrice: 40, sortOrder: 2 },
      { name: 'Delicados', defaultPrice: 55, sortOrder: 3 },
    ],
  },
  repair: {
    vertical: 'repair',
    itemLabel: 'equipamento',
    itemLabelPlural: 'equipamentos',
    sectors: [
      { name: 'Diagnóstico', slug: 'diagnostico', order: 1, color: '#2196F3', isTerminal: false },
      { name: 'Aguardando peça', slug: 'peca', order: 2, color: '#FF9800', isTerminal: false },
      { name: 'Reparo', slug: 'reparo', order: 3, color: '#9C27B0', isTerminal: false },
      { name: 'Teste', slug: 'teste', order: 4, color: '#00BCD4', isTerminal: false },
      { name: 'Pronto', slug: 'pronto', order: 5, color: '#4CAF50', isTerminal: true },
    ],
    services: [
      { name: 'Diagnóstico', defaultPrice: 40, sortOrder: 1 },
      { name: 'Reparo básico', defaultPrice: 90, sortOrder: 2 },
      { name: 'Reparo completo', defaultPrice: 180, sortOrder: 3 },
    ],
  },
};

/**
 * Apply a vertical starter kit: sets vertical/itemLabel, replaces sector columns
 * (old ones deactivated), and seeds missing services by name.
 * Shop can always rename/delete afterward — kit is a starting point only.
 */
async function applyStarterKit(shopId, { kit } = {}) {
  const Sector = require('../models/Sector');
  const ServiceCatalog = require('../models/ServiceCatalog');
  const key = String(kit || 'general').toLowerCase();
  const pack = STARTER_KITS[key];
  if (!pack) {
    const err = new Error('kit inválido');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    err.detail = `Use: ${Object.keys(STARTER_KITS).join(', ')}`;
    throw err;
  }

  const shop = await Shop.findById(shopId);
  if (!shop) {
    const err = new Error('Shop not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  shop.vertical = pack.vertical;
  shop.branding = shop.branding || {};
  shop.branding.itemLabel = pack.itemLabel;
  shop.branding.itemLabelPlural = pack.itemLabelPlural;
  await shop.save();

  await Sector.updateMany({ shopId, active: true }, { $set: { active: false } });
  const createdSectors = await Sector.insertMany(
    pack.sectors.map((s) => ({
      shopId,
      name: s.name,
      slug: s.slug,
      order: s.order,
      color: s.color,
      isTerminal: Boolean(s.isTerminal),
      notifyEmailOnEnter: Boolean(s.isTerminal),
      active: true,
    }))
  );

  let servicesAdded = 0;
  for (const svc of pack.services) {
    const exists = await ServiceCatalog.findOne({
      shopId,
      name: svc.name,
      active: { $ne: false },
    }).lean();
    if (exists) continue;
    await ServiceCatalog.create({
      shopId,
      name: svc.name,
      defaultPrice: svc.defaultPrice,
      sortOrder: svc.sortOrder,
      active: true,
      sectorPathHint: [],
    });
    servicesAdded += 1;
  }

  return {
    ok: true,
    kit: key,
    vertical: pack.vertical,
    sectorsCreated: createdSectors.length,
    servicesAdded,
    itemLabel: pack.itemLabel,
  };
}

async function uploadShopLogo(shopId, file) {
  const storageService = require('./storageService');
  if (!file || !file.buffer) {
    const err = new Error('arquivo de logo obrigatório');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const mime = String(file.mimetype || '').toLowerCase();
  if (!allowed.includes(mime)) {
    const err = new Error('logo deve ser jpeg, png, webp ou gif');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  const shop = await Shop.findById(shopId);
  if (!shop) {
    const err = new Error('Shop not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  const extMap = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  const ext = extMap[mime] || 'png';
  const prefix = storageService.brandingPrefix(shopId);
  await storageService.deletePrefix(prefix).catch(() => 0);
  const key = `${prefix}logo.${ext}`;
  const stored = await storageService.putBuffer(key, file.buffer, mime);
  shop.branding = shop.branding || {};
  shop.branding.logoUrl = stored.url;
  await shop.save();
  return shop.toObject();
}

module.exports = {
  getCurrentShop,
  patchCurrentShop,
  ensurePartnerCode,
  regeneratePartnerCode,
  generatePartnerCode,
  slugify,
  seedDefaultCatalog,
  applyStarterKit,
  STARTER_KITS,
  listMembers,
  addMember,
  patchMember,
  resetMemberPassword,
  uploadShopLogo,
};
