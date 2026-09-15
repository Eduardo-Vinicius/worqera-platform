const crypto = require('crypto');
const Invite = require('../models/Invite');
const User = require('../models/User');
const Membership = require('../models/Membership');
const Shop = require('../models/Shop');
const { hashPassword } = require('./authService');
const { sendMail } = require('./mailer');

function hashToken(raw) {
  return crypto.createHash('sha256').update(String(raw)).digest('hex');
}

async function createInvite(shopId, createdByUserId, { email, role, sectorIds, appBaseUrl }) {
  const normalizedEmail = String(email || '')
    .toLowerCase()
    .trim();
  if (!normalizedEmail) {
    const err = new Error('email required');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  const nextRole = String(role || 'atendimento').toLowerCase();
  if (!['admin', 'atendimento', 'sector'].includes(nextRole)) {
    const err = new Error('Invalid role');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  const sectors = Array.isArray(sectorIds) ? sectorIds : [];
  if (nextRole === 'sector' && !sectors.length) {
    const err = new Error('sectorIds required when role is sector');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const raw = crypto.randomBytes(24).toString('hex');
  const invite = await Invite.create({
    shopId,
    email: normalizedEmail,
    role: nextRole,
    sectorIds: nextRole === 'sector' ? sectors : [],
    tokenHash: hashToken(raw),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdByUserId,
  });

  const shop = await Shop.findById(shopId).lean();
  const base = (appBaseUrl || process.env.PUBLIC_WEB_URL || 'http://127.0.0.1:3000').replace(
    /\/+$/,
    ''
  );
  const url = `${base}/invite/${raw}`;

  const company = shop?.branding?.displayName || shop?.name || 'a oficina';
  await sendMail({
    to: normalizedEmail,
    shop,
    subject: 'Convite para a equipe',
    text: `Você foi convidado para ${company} no Worqera.\n\nAceite em: ${url}\n\nExpira em 7 dias.`,
    html: `<p>Você foi convidado para a equipe de <strong>${company}</strong>.</p><p><a href="${url}">Aceitar convite</a></p><p>Expira em 7 dias.</p>`,
  });

  const out = {
    id: invite._id,
    email: invite.email,
    role: invite.role,
    expiresAt: invite.expiresAt,
    url,
  };
  if (process.env.NODE_ENV !== 'production') {
    out.devToken = raw;
  }
  return out;
}

async function getInviteByToken(raw) {
  const invite = await Invite.findOne({
    tokenHash: hashToken(raw),
    acceptedAt: null,
    expiresAt: { $gt: new Date() },
  }).lean();
  if (!invite) {
    const err = new Error('Invite invalid or expired');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  const shop = await Shop.findById(invite.shopId).lean();
  return {
    email: invite.email,
    role: invite.role,
    shop: shop ? { id: shop._id, name: shop.name, slug: shop.slug } : null,
  };
}

async function acceptInvite(raw, { name, password }) {
  if (!password || String(password).length < 6) {
    const err = new Error('password min 6 required');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  const invite = await Invite.findOne({
    tokenHash: hashToken(raw),
    acceptedAt: null,
    expiresAt: { $gt: new Date() },
  });
  if (!invite) {
    const err = new Error('Invite invalid or expired');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  let user = await User.findOne({ email: invite.email });
  if (!user) {
    user = await User.create({
      email: invite.email,
      passwordHash: await hashPassword(password),
      name: name || invite.email.split('@')[0],
    });
  } else {
    user.passwordHash = await hashPassword(password);
    if (name) user.name = name;
    await user.save();
  }

  const existing = await Membership.findOne({ userId: user._id, shopId: invite.shopId });
  if (existing) {
    existing.role = invite.role;
    existing.sectorIds = invite.sectorIds;
    existing.active = true;
    await existing.save();
  } else {
    await Membership.create({
      userId: user._id,
      shopId: invite.shopId,
      role: invite.role,
      sectorIds: invite.sectorIds || [],
      active: true,
    });
  }

  invite.acceptedAt = new Date();
  await invite.save();

  const shop = await Shop.findById(invite.shopId).lean();
  return {
    ok: true,
    email: user.email,
    shop: shop ? { id: shop._id, name: shop.name, slug: shop.slug } : null,
  };
}

module.exports = { createInvite, getInviteByToken, acceptInvite };
