/**
 * Log of every e-mail the API tried to send (order, account, invite, billing, alerts).
 * Read by the platform admin (`GET /platform/emails`). Rows expire after 30 days.
 */
const mongoose = require('mongoose');

const KINDS = {
  created: { label: 'Pedido criado', group: 'orders' },
  ready: { label: 'Pedido pronto', group: 'orders' },
  verify_email: { label: 'Código de acesso', group: 'account' },
  password_reset: { label: 'Redefinir senha', group: 'account' },
  invite: { label: 'Convite da equipe', group: 'account' },
  billing_active: { label: 'Assinatura ativa', group: 'billing' },
  late_alerts: { label: 'Pedidos em atraso', group: 'alerts' },
  weekly_digest: { label: 'Resumo da semana', group: 'alerts' },
};

const GROUPS = {
  orders: ['created', 'ready'],
  account: ['verify_email', 'password_reset', 'invite'],
  billing: ['billing_active'],
  alerts: ['late_alerts', 'weekly_digest'],
};

/** Pure: mailer result → what the log stores. A console "send" (SMTP off) is not a real delivery. */
function outcome(result = {}) {
  const preview = result.provider === 'console';
  return {
    ok: result.ok === true && !preview,
    skipped: Boolean(result.skipped) || preview,
    reason: preview ? 'smtp-off' : String(result.reason || ''),
    error: String(result.error || ''),
    provider: String(result.provider || ''),
  };
}

function statusOf(row) {
  if (row.ok) return 'sent';
  if (row.skipped) return 'skipped';
  return 'failed';
}

async function record(entry) {
  try {
    const PlatformMailLog = require('../models/PlatformMailLog');
    await PlatformMailLog.create({
      at: new Date(),
      shopId: entry.shopId ? String(entry.shopId) : null,
      kind: String(entry.kind || ''),
      code: String(entry.code || ''),
      to: String(entry.to || '').slice(0, 200),
      subject: String(entry.subject || '').slice(0, 200),
      ok: entry.ok === true,
      skipped: Boolean(entry.skipped),
      reason: String(entry.reason || '').slice(0, 80),
      error: String(entry.error || '').slice(0, 300),
      provider: String(entry.provider || '').slice(0, 40),
    });
  } catch (err) {
    console.warn('[mail] log', err?.message || err);
  }
}

const STATUS_FILTER = {
  sent: { ok: true },
  failed: { ok: { $ne: true }, skipped: { $ne: true } },
  skipped: { ok: { $ne: true }, skipped: true },
};

async function list({ days = 7, group = 'all', status = 'all', q = '', page = 1 } = {}) {
  const PlatformMailLog = require('../models/PlatformMailLog');
  const Shop = require('../models/Shop');
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const base = { at: { $gte: since } };
  if (GROUPS[group]) base.kind = { $in: GROUPS[group] };
  const term = String(q || '').trim();
  if (term) {
    const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    base.$or = [{ to: rx }, { code: rx }, { subject: rx }];
  }
  const filter = STATUS_FILTER[status] ? { ...base, ...STATUS_FILTER[status] } : base;
  const size = 50;
  const current = Math.max(1, Number(page) || 1);

  const [rows, total, counts] = await Promise.all([
    PlatformMailLog.find(filter).sort({ at: -1 }).skip((current - 1) * size).limit(size).lean(),
    PlatformMailLog.countDocuments(filter),
    PlatformMailLog.aggregate([
      { $match: base },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          sent: { $sum: { $cond: ['$ok', 1, 0] } },
          skipped: { $sum: { $cond: [{ $and: [{ $ne: ['$ok', true] }, '$skipped'] }, 1, 0] } },
        },
      },
    ]),
  ]);
  const ids = [...new Set(rows.map((r) => r.shopId).filter((id) => id && mongoose.isValidObjectId(id)))];
  const shops = ids.length ? await Shop.find({ _id: { $in: ids } }).select('name branding.displayName').lean() : [];
  const shopName = new Map(shops.map((s) => [String(s._id), s.branding?.displayName || s.name]));
  const c = counts[0] || { total: 0, sent: 0, skipped: 0 };

  return {
    days,
    total,
    page: current,
    counts: { total: c.total, sent: c.sent, skipped: c.skipped, failed: c.total - c.sent - c.skipped },
    emails: rows.map((r) => ({
      id: String(r._id),
      at: r.at,
      kind: r.kind || '',
      kindLabel: KINDS[r.kind]?.label || r.kind || 'E-mail',
      group: KINDS[r.kind]?.group || 'other',
      to: r.to || '',
      subject: r.subject || '',
      code: r.code || '',
      shopId: r.shopId || null,
      shopName: r.shopId ? shopName.get(r.shopId) || null : null,
      status: statusOf(r),
      reason: r.reason || '',
      error: r.error || '',
      provider: r.provider || '',
    })),
  };
}

/** Last laudo/ready e-mail of one order, for the order detail ("Laudo enviado às…" / "falhou"). */
async function lastForOrder(shopId, code) {
  if (!code) return null;
  const PlatformMailLog = require('../models/PlatformMailLog');
  const row = await PlatformMailLog.findOne({ shopId: String(shopId), code: String(code), kind: { $in: GROUPS.orders } })
    .sort({ at: -1 })
    .lean();
  if (!row) return null;
  return {
    at: row.at,
    kind: row.kind,
    kindLabel: KINDS[row.kind]?.label || row.kind,
    to: row.to || '',
    status: statusOf(row),
    reason: row.reason || '',
    error: row.error || '',
  };
}

module.exports = { KINDS, GROUPS, outcome, statusOf, record, list, lastForOrder };
