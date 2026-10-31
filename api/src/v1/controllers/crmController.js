const crm = require('../services/crmService');
const { wrap } = require('./helpers');
const { seesMoney } = require('./clientController');

exports.summary = wrap(async (req, res) => {
  const days = [30, 60, 90, 180, 365].includes(Number(req.query.days)) ? Number(req.query.days) : 90;
  res.status(200).json(await crm.crmSummary(req.shopId, { inactiveDays: days, showMoney: seesMoney(req) }));
});

exports.list = wrap(async (req, res) => {
  res.status(200).json(
    await crm.crmList(req.shopId, {
      segment: req.query.segment,
      days: req.query.days,
      range: req.query.range,
      q: req.query.q,
      limit: req.query.limit,
      showMoney: seesMoney(req),
    })
  );
});

exports.insight = wrap(async (req, res) => {
  const { aiAllowed, quotaOf } = require('./aiController');
  const refresh = req.query.refresh === '1' || req.query.refresh === 'true';
  const insight = await crm.crmInsight(req.shopId, { aiAllowed: aiAllowed(req), refresh, showMoney: seesMoney(req) });
  res.status(200).json({ insight, business: aiAllowed(req), aiQuota: seesMoney(req) ? await quotaOf(req) : null });
});
