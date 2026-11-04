/**
 * Audit trail of platform admin actions. Written after the request succeeded
 * (`middleware/platformAudit`), read by `/admin/auditoria`.
 */
const mongoose = require('mongoose');

const ACTIONS = {
  'shop.update': 'Loja alterada',
  'shop.whatsapp': 'WhatsApp da loja',
  'shop.ai': 'Cota de IA da loja',
  'config.update': 'Parâmetros',
  'notice.create': 'Aviso publicado',
  'notice.delete': 'Aviso removido',
  'account.transfer_email': 'E-mail da conta transferido',
};

const STATUS_LABEL = { trialing: 'em teste', active: 'ativa', past_due: 'em atraso', canceled: 'cancelada', expired: 'teste encerrado' };
const PLAN_LABEL = { WORQERA_BASIC: 'Basic', WORQERA_PRO: 'Pro', WORQERA_BUSINESS: 'Business' };

/** Pure: what a `PATCH /platform/shops/:id` body did, in one line. */
function shopPatchSummary(body = {}) {
  const parts = [];
  if (body.status === 'suspended') parts.push('suspendeu a loja');
  if (body.status === 'active') parts.push('reativou a loja');
  if (body.extendTrialDays != null) parts.push(`estendeu o teste em ${Number(body.extendTrialDays) || 0} dias`);
  if (body.subscriptionStatus != null) parts.push(`assinatura → ${STATUS_LABEL[body.subscriptionStatus] || body.subscriptionStatus}`);
  if (body.planCode != null) parts.push(`plano → ${PLAN_LABEL[body.planCode] || body.planCode}`);
  if (body.seal != null) parts.push(body.seal ? `selo → ${body.seal}` : 'tirou o selo');
  if (body.adminNote != null) parts.push('atualizou a nota interna');
  if (!parts.length) return 'Alterou a loja';
  const text = parts.join(', ');
  return text[0].toUpperCase() + text.slice(1);
}

async function targetName(targetType, targetId) {
  if (!targetId || !mongoose.isValidObjectId(targetId)) return '';
  if (targetType === 'shop') {
    const shop = await require('../models/Shop').findById(targetId).select('name branding.displayName').lean();
    return shop?.branding?.displayName || shop?.name || '';
  }
  if (targetType === 'account') {
    const user = await require('../models/User').findById(targetId).select('email').lean();
    return user?.email || '';
  }
  return '';
}

async function record(req, { action, targetType = '', targetId = null, summary = '', changes = null, name = '' }) {
  try {
    const PlatformAudit = require('../models/PlatformAudit');
    const actorUserId = req.auth?.userId ? String(req.auth.userId) : null;
    const actor = actorUserId && mongoose.isValidObjectId(actorUserId)
      ? await require('../models/User').findById(actorUserId).select('email').lean()
      : null;
    await PlatformAudit.create({
      at: new Date(),
      actorUserId,
      actorEmail: actor?.email || '',
      action,
      targetType,
      targetId: targetId ? String(targetId) : null,
      targetName: name || (await targetName(targetType, targetId)),
      summary: String(summary || ACTIONS[action] || action).slice(0, 300),
      changes,
      ip: String(req.headers?.['x-forwarded-for'] || req.ip || '').split(',')[0].trim().slice(0, 60),
    });
  } catch (err) {
    console.warn('[audit]', err?.message || err);
  }
}

async function list({ action = '', targetType = '', targetId = '', q = '', page = 1 } = {}) {
  const PlatformAudit = require('../models/PlatformAudit');
  const filter = {};
  if (action && ACTIONS[action]) filter.action = action;
  if (targetType) filter.targetType = String(targetType);
  if (targetId) filter.targetId = String(targetId);
  const term = String(q || '').trim();
  if (term) {
    const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ actorEmail: rx }, { targetName: rx }, { summary: rx }];
  }
  const size = 50;
  const current = Math.max(1, Number(page) || 1);
  const [rows, total, byAction] = await Promise.all([
    PlatformAudit.find(filter).sort({ at: -1 }).skip((current - 1) * size).limit(size).lean(),
    PlatformAudit.countDocuments(filter),
    PlatformAudit.aggregate([{ $group: { _id: '$action', count: { $sum: 1 } } }]),
  ]);
  return {
    total,
    page: current,
    actions: Object.entries(ACTIONS).map(([key, label]) => ({ key, label, count: byAction.find((a) => a._id === key)?.count || 0 })),
    items: rows.map((r) => ({
      id: String(r._id),
      at: r.at,
      actorEmail: r.actorEmail,
      action: r.action,
      actionLabel: ACTIONS[r.action] || r.action,
      targetType: r.targetType,
      targetId: r.targetId,
      targetName: r.targetName,
      summary: r.summary,
      changes: r.changes,
    })),
  };
}

module.exports = { ACTIONS, shopPatchSummary, record, list };
