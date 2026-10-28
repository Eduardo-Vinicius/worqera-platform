/**
 * Repor estoque: products that take weeks to arrive (soles: 30–40 days).
 * "Hora de pedir" = available ≤ max(minQty, daily use × supplier lead time), with
 * no supplier order open. Daily use comes from the last 60 days of deliveries.
 */
const mongoose = require('mongoose');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const User = require('../models/User');
const { presentProduct, adjustProduct } = require('./productService');

const DAY = 24 * 60 * 60 * 1000;
const USE_WINDOW_DAYS = 60;

function fail(status, message, code = 'VALIDATION_ERROR') {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

async function actorName(userId) {
  if (!userId) return '';
  const user = await User.findById(userId).select('name email').lean();
  return user?.name || user?.email || '';
}

/** Units delivered per day over the window, per product. Null when there is no history. */
async function dailyUseByProduct(shopId, now = new Date()) {
  const since = new Date(now.getTime() - USE_WINDOW_DAYS * DAY);
  const rows = await StockMovement.aggregate([
    { $match: { shopId: new mongoose.Types.ObjectId(String(shopId)), type: 'commit', createdAt: { $gte: since } } },
    { $group: { _id: '$productId', units: { $sum: { $abs: '$quantity' } } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.units / USE_WINDOW_DAYS]));
}

/** Pure: where a product stands. Exported for tests. */
function restockState(product, dailyUse, now = new Date()) {
  const lead = Number(product.leadTimeDays) || 0;
  const minQty = Number(product.minQty) || 0;
  const available = Number(product.available) || 0;
  const use = dailyUse || 0;
  const reorderPoint = Math.max(minQty, Math.ceil(use * lead));
  const daysOfStock = use > 0 ? Math.max(0, Math.floor(available / use)) : null;
  const r = product.restock;
  if (r?.orderedAt) {
    const expected = r.expectedAt ? new Date(r.expectedAt) : null;
    const daysLeft = expected ? Math.ceil((expected.getTime() - now.getTime()) / DAY) : null;
    return {
      state: expected && expected < now ? 'late' : 'coming',
      reorderPoint,
      daysOfStock,
      daysLeft,
      dailyUse: use ? Math.round(use * 100) / 100 : null,
    };
  }
  const needs = available <= reorderPoint && (reorderPoint > 0 || available <= 0);
  return {
    state: needs ? 'order' : 'ok',
    reorderPoint,
    daysOfStock,
    daysLeft: null,
    dailyUse: use ? Math.round(use * 100) / 100 : null,
  };
}

async function restockReport(shopId, now = new Date()) {
  const [docs, use] = await Promise.all([
    Product.find({ shopId, active: true, trackStock: { $ne: false } }).sort({ name: 1 }).lean(),
    dailyUseByProduct(shopId, now),
  ]);
  const groups = { order: [], coming: [], late: [] };
  for (const doc of docs) {
    const product = presentProduct(doc);
    const info = restockState(product, use.get(String(doc._id)), now);
    if (info.state === 'ok') continue;
    groups[info.state].push({
      id: product.id,
      name: product.name,
      available: product.available,
      minQty: product.minQty,
      leadTimeDays: product.leadTimeDays,
      variants: product.variants.map((v) => ({ id: v.id, name: v.name, available: v.available })),
      restock: product.restock,
      ...info,
    });
  }
  groups.order.sort((a, b) => (a.daysOfStock ?? 9999) - (b.daysOfStock ?? 9999) || a.available - b.available);
  groups.late.sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));
  groups.coming.sort((a, b) => (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999));
  return { ...groups, counts: { order: groups.order.length, coming: groups.coming.length, late: groups.late.length } };
}

async function orderRestock(shopId, id, body = {}, userId) {
  const doc = await Product.findOne({ _id: id, shopId });
  if (!doc) throw fail(404, 'Produto não encontrado', 'NOT_FOUND');
  const qty = Math.floor(Number(body.qty) || 0);
  if (qty <= 0) throw fail(400, 'Quantos pediu ao fornecedor?');
  let variantId = null;
  if ((doc.variants || []).length) {
    const variant = doc.variants.find((v) => String(v._id) === String(body.variantId || ''));
    if (!variant) throw fail(400, 'Escolha a variação pedida');
    variantId = variant._id;
  }
  const now = new Date();
  const expected = body.expectedAt ? new Date(body.expectedAt) : null;
  const lead = Number(doc.leadTimeDays) || 0;
  doc.restock = {
    qty,
    variantId,
    orderedAt: now,
    expectedAt: expected && !Number.isNaN(expected.getTime()) ? expected : lead ? new Date(now.getTime() + lead * DAY) : null,
    note: String(body.note || '').trim().slice(0, 300),
    byName: await actorName(userId),
  };
  await doc.save();
  return presentProduct(doc.toObject());
}

async function restockArrived(shopId, id, body = {}, userId) {
  const doc = await Product.findOne({ _id: id, shopId }).lean();
  if (!doc) throw fail(404, 'Produto não encontrado', 'NOT_FOUND');
  if (!doc.restock?.orderedAt) throw fail(409, 'Nenhum pedido ao fornecedor aberto', 'CONFLICT');
  const qty = Math.floor(Number(body.qty ?? doc.restock.qty) || 0);
  if (qty <= 0) throw fail(400, 'Quantos chegaram?');
  await adjustProduct(
    shopId,
    id,
    {
      quantity: qty,
      reason: `Chegou do fornecedor${doc.restock.note ? ` · ${doc.restock.note}` : ''}`,
      variantId: doc.restock.variantId ? String(doc.restock.variantId) : undefined,
    },
    userId
  );
  const updated = await Product.findOneAndUpdate(
    { _id: id, shopId },
    { $set: { 'restock.qty': 0, 'restock.variantId': null, 'restock.orderedAt': null, 'restock.expectedAt': null, 'restock.note': '', 'restock.byName': '' } },
    { new: true }
  ).lean();
  return presentProduct(updated);
}

async function cancelRestock(shopId, id) {
  const updated = await Product.findOneAndUpdate(
    { _id: id, shopId },
    { $set: { 'restock.qty': 0, 'restock.variantId': null, 'restock.orderedAt': null, 'restock.expectedAt': null, 'restock.note': '', 'restock.byName': '' } },
    { new: true }
  ).lean();
  if (!updated) throw fail(404, 'Produto não encontrado', 'NOT_FOUND');
  return presentProduct(updated);
}

module.exports = { restockReport, restockState, orderRestock, restockArrived, cancelRestock, dailyUseByProduct };
