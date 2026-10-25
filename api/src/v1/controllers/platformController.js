const platformService = require('../services/platformService');
const platformConsole = require('../services/platformConsoleService');
const { readOpsSnapshot } = require('../middleware/apiMetrics');
const { listRecentMailLogs } = require('../services/orderNotify');
const { wrap } = require('./helpers');

exports.listShops = wrap(async (req, res) => {
  const shops = await platformService.listShops({
    q: req.query.q,
    status: req.query.status,
    limit: req.query.limit,
  });
  res.status(200).json({ shops });
});

exports.getShop = wrap(async (req, res) => {
  const shop = await platformService.getShopDetail(req.params.id);
  res.status(200).json({ shop });
});

exports.patchShop = wrap(async (req, res) => {
  const shop = await platformService.patchShop(req.params.id, req.body || {});
  res.status(200).json({ shop });
});

function noticeIsLive(notice, now = new Date()) {
  if (!notice || notice.active === false) return false;
  if (notice.startsAt && new Date(notice.startsAt) > now) return false;
  if (notice.endsAt && new Date(notice.endsAt) < now) return false;
  return true;
}

exports.ops = wrap(async (_req, res) => {
  const { monthUsageByShop, aiConfigured, modelFor, quotaFor } = require('../services/aiService');
  const { platformOverview } = require('../services/whatsappCloud');
  const [ops, config, notices, shops, mail, aiRows, whatsapp] = await Promise.all([
    readOpsSnapshot(),
    platformConsole.getConfig(),
    platformConsole.listNotices(),
    platformService.listShops({ limit: 200 }),
    listRecentMailLogs(40),
    monthUsageByShop().catch(() => []),
    platformOverview().catch(() => ({ configured: false, shops: [] })),
  ]);
  const shopName = Object.fromEntries(shops.map((s) => [String(s.id), s.name]));
  const aiQuotas = await Promise.all(aiRows.map((r) => quotaFor(r._id).catch(() => null)));
  const disabled = [
    ...(config.features || [])
      .filter((f) => !f.enabled)
      .map((f) => ({ kind: 'feature', key: f.key, label: f.label })),
    ...(config.services || [])
      .filter((s) => !s.enabled)
      .map((s) => ({ kind: 'service', key: s.key, label: s.label })),
  ];
  res.status(200).json({
    ...ops,
    errors: (ops.errors || []).map((e) => ({
      ...e,
      shopName: e.shopId ? shopName[String(e.shopId)] || '' : '',
    })),
    mail: (mail || []).map((row) => ({
      ...row,
      shopName: row.shopId ? shopName[String(row.shopId)] || '' : '',
    })),
    shops: {
      total: shops.length,
      suspended: shops.filter((s) => s.status === 'suspended').length,
      trialing: shops.filter(
        (s) => s.status !== 'suspended' && s.subscription?.status === 'trialing'
      ).length,
      active: shops.filter(
        (s) => s.status !== 'suspended' && s.subscription?.status === 'active'
      ).length,
      openOrders: shops.reduce((n, s) => n + (Number(s.openCount) || 0), 0),
    },
    notices: notices.filter((n) => noticeIsLive(n)).slice(0, 8),
    disabled,
    ai: {
      configured: aiConfigured(),
      model: modelFor('fast'),
      deepModel: modelFor('deep'),
      totalUsd: Math.round(aiRows.reduce((sum, r) => sum + (r.costUsd || 0), 0) * 10000) / 10000,
      calls: aiRows.reduce((sum, r) => sum + (r.calls || 0), 0),
      shops: aiRows.map((r, i) => ({
        shopId: String(r._id),
        shopName: shopName[String(r._id)] || '',
        calls: r.calls,
        failed: r.failed,
        costUsd: Math.round((r.costUsd || 0) * 10000) / 10000,
        used: aiQuotas[i]?.used ?? 0,
        limit: aiQuotas[i]?.limit ?? 0,
        blocked: Boolean(aiQuotas[i]?.blocked),
      })),
    },
    whatsapp,
  });
});

exports.getConfig = wrap(async (_req, res) => {
  res.status(200).json(await platformConsole.getConfig());
});

exports.putConfig = wrap(async (req, res) => {
  res.status(200).json(await platformConsole.updateConfig(req.body || {}));
});

exports.listNotices = wrap(async (_req, res) => {
  res.status(200).json({ notices: await platformConsole.listNotices() });
});

exports.createNotice = wrap(async (req, res) => {
  const notice = await platformConsole.createNotice(req.body || {});
  res.status(201).json({ notice });
});

exports.deleteNotice = wrap(async (req, res) => {
  res.status(200).json(await platformConsole.deleteNotice(req.params.id));
});
