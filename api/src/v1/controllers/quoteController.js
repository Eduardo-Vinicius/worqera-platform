const quoteService = require('../services/quoteService');
const { wrap } = require('./helpers');
const { planHas } = require('../lib/planCap');

async function channels(req) {
  const business = planHas(req.subscription, 'ai');
  const whatsappOfficial =
    business && (await require('../services/whatsappCloud').officialReady(req.shopId).catch(() => false));
  return { ai: business, whatsappOfficial };
}

exports.list = wrap(async (req, res) => {
  const [result, ch] = await Promise.all([
    quoteService.listQuotes(req.shopId, req.query || {}),
    channels(req),
  ]);
  res.status(200).json({ ...result, channels: ch });
});

exports.get = wrap(async (req, res) => {
  const [quote, ch] = await Promise.all([quoteService.getQuote(req.shopId, req.params.id), channels(req)]);
  res.status(200).json({ quote, channels: ch });
});

exports.create = wrap(async (req, res) => {
  const quote = await quoteService.createQuote(req.shopId, req.auth?.userId, req.body || {});
  res.status(201).json({ quote });
});

exports.patch = wrap(async (req, res) => {
  const result = await quoteService.patchQuote(req.shopId, req.params.id, req.auth?.userId, req.body || {});
  res.status(200).json(result);
});

exports.activity = wrap(async (req, res) => {
  const quote = await quoteService.addActivity(req.shopId, req.params.id, req.auth?.userId, req.body || {});
  res.status(201).json({ quote });
});

exports.suggest = wrap(async (req, res) => {
  const result = await quoteService.suggestMessages(req.shopId, req.params.id, {
    aiAllowed: planHas(req.subscription, 'ai'),
  });
  const aiQuota = await require('./aiController').quotaOf(req);
  res.status(200).json({ ...result, aiQuota });
});

exports.win = wrap(async (req, res) => {
  const result = await quoteService.winQuote(req.shopId, req.params.id, req.auth?.userId, req.body || {});
  res.status(200).json(result);
});

exports.recovered = wrap(async (req, res) => {
  const role = String(req.membership?.role || '').toLowerCase();
  const report = await quoteService.recoveredReport(req.shopId, {
    days: req.query.days,
    showsTotals: role === 'owner' || role === 'admin',
  });
  res.status(200).json(report);
});

exports.remove = wrap(async (req, res) => {
  const result = await quoteService.deleteQuote(req.shopId, req.params.id);
  res.status(200).json(result);
});

exports.refuseOrder = wrap(async (req, res) => {
  const result = await quoteService.refuseOrderQuote(
    req.shopId,
    req.params.id,
    req.auth?.userId,
    req.body || {}
  );
  res.status(200).json(result);
});
