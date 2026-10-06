/**
 * Token opaco do link do cliente. A URL nova é /p/o/{token}
 * e não leva slug nem código do pedido.
 */
const crypto = require('crypto');

function newPublicToken() {
  return crypto.randomBytes(9).toString('base64url');
}

function buildPublicOrderPath(_shopSlug, _code, token) {
  const t = String(token || '').trim();
  if (!t) return '';
  return `/p/o/${encodeURIComponent(t)}`;
}

function buildPublicOrderUrl(webBase, shopSlug, code, token) {
  const web = String(webBase || '').replace(/\/+$/, '');
  const path = buildPublicOrderPath(shopSlug, code, token);
  if (!web || !path) return web || '';
  return `${web}${path}`;
}

/** Persist token on order doc if missing (lazy backfill for legacy rows). */
async function ensureOrderPublicToken(orderDoc) {
  if (!orderDoc) return null;
  if (orderDoc.publicToken) return orderDoc.publicToken;
  const Order = require('../models/Order');
  const token = newPublicToken();
  const id = orderDoc._id || orderDoc.id;
  if (id) {
    await Order.updateOne({ _id: id, publicToken: null }, { $set: { publicToken: token } });
  }
  orderDoc.publicToken = token;
  return token;
}

module.exports = {
  newPublicToken,
  buildPublicOrderPath,
  buildPublicOrderUrl,
  ensureOrderPublicToken,
};
