/**
 * Prateleira: ready orders the customer has not picked up yet, with the
 * money waiting on them and a ready-made WhatsApp reminder.
 */
const Order = require('../models/Order');
const Shop = require('../models/Shop');
const { buildWaMeUrl } = require('./whatsappSuggest');
const { buildPublicOrderUrl, ensureOrderPublicToken } = require('../utils/publicOrderToken');

const DAY_MS = 24 * 60 * 60 * 1000;
const STALE_DAYS = 3;

function money(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function formatMoney(value) {
  return money(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function lastEnteredAt(history) {
  const list = Array.isArray(history) ? history : [];
  const last = list[list.length - 1];
  const at = last?.enteredAt ? new Date(last.enteredAt) : null;
  return at && !Number.isNaN(at.getTime()) ? at : null;
}

/** The order is ready once its last item reached the final sector. */
function readySince(order) {
  const dates = [lastEnteredAt(order.sectorHistory)];
  for (const item of order.items || []) dates.push(lastEnteredAt(item.sectorHistory));
  const valid = dates.filter(Boolean);
  if (!valid.length) return order.updatedAt ? new Date(order.updatedAt) : new Date();
  return new Date(Math.max(...valid.map((d) => d.getTime())));
}

/** Money still due at pickup. No deposit and no balance recorded means nothing was paid yet. */
function toCollect(order) {
  const total = money(order.pricing?.total);
  const deposit = money(order.pricing?.deposit);
  const remaining = money(order.pricing?.remaining);
  if (remaining > 0) return remaining;
  if (deposit > 0) return 0;
  return total;
}

function firstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || '';
}

function reminderText({ order, shopName, since, due, link }) {
  const hi = firstName(order.clientName) ? `Oi, ${firstName(order.clientName)}!` : 'Oi!';
  const date = since.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' });
  const balance = due > 0 ? ` O saldo para retirada é ${formatMoney(due)}.` : '';
  const track = link ? ` Detalhes: ${link}` : '';
  if (Number(order.shelfReminder?.count) > 0) {
    return `${hi} Passando para lembrar: o pedido #${order.code} segue pronto aqui na ${shopName}, esperando por você desde ${date}.${balance} Qual o melhor dia para buscar?${track}`;
  }
  return `${hi} Seu pedido #${order.code} está pronto aqui na ${shopName} desde ${date}.${balance} Pode passar quando quiser.${track}`;
}

async function listShelf(shopId, { now = new Date() } = {}) {
  const [shop, orders] = await Promise.all([
    Shop.findById(shopId).select('name slug branding').lean(),
    Order.find({ shopId, status: 'ready', deletedAt: null })
      .select('code clientName clientPhone pricing sectorHistory items.sectorHistory updatedAt publicToken shelfReminder')
      .lean(),
  ]);
  const shopName = shop?.branding?.displayName || shop?.name || 'loja';
  const webBase = String(process.env.PUBLIC_WEB_URL || process.env.WORQERA_PublicWebUrl || 'https://worqera.com').replace(/\/+$/, '');

  const items = [];
  for (const order of orders) {
    if (!order.publicToken) await ensureOrderPublicToken(order);
    const since = readySince(order);
    const days = Math.max(0, Math.floor((now.getTime() - since.getTime()) / DAY_MS));
    const due = toCollect(order);
    const link = buildPublicOrderUrl(webBase, shop?.slug, order.code, order.publicToken);
    const text = reminderText({ order, shopName, since, due, link });
    items.push({
      id: String(order._id),
      code: order.code,
      clientName: order.clientName || '',
      clientPhone: order.clientPhone || '',
      readySince: since,
      days,
      stale: days >= STALE_DAYS,
      toCollect: due,
      total: money(order.pricing?.total),
      reminders: Number(order.shelfReminder?.count) || 0,
      lastReminderAt: order.shelfReminder?.lastAt || null,
      whatsapp: order.clientPhone ? { text, url: buildWaMeUrl(order.clientPhone, text) } : null,
    });
  }
  items.sort((a, b) => b.days - a.days || b.toCollect - a.toCollect);

  const stale = items.filter((it) => it.stale);
  return {
    staleDays: STALE_DAYS,
    summary: {
      count: items.length,
      toCollect: money(items.reduce((sum, it) => sum + it.toCollect, 0)),
      staleCount: stale.length,
      staleToCollect: money(stale.reduce((sum, it) => sum + it.toCollect, 0)),
      oldestDays: items[0]?.days || 0,
    },
    items,
  };
}

async function markReminded(shopId, orderId) {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, shopId, status: 'ready', deletedAt: null },
    { $inc: { 'shelfReminder.count': 1 }, $set: { 'shelfReminder.lastAt': new Date() } },
    { new: true }
  )
    .select('shelfReminder')
    .lean();
  if (!order) {
    const err = new Error('Pedido não está pronto na prateleira');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  return { ok: true, reminders: order.shelfReminder.count, lastReminderAt: order.shelfReminder.lastAt };
}

module.exports = { listShelf, markReminded, readySince, toCollect, STALE_DAYS };
