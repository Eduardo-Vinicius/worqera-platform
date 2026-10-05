const platformService = require('../services/platformService');
const platformConsole = require('../services/platformConsoleService');
const { readOpsSnapshot } = require('../middleware/apiMetrics');
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

exports.ops = wrap(async (_req, res) => {
  const [ops, locations] = await Promise.all([
    readOpsSnapshot(),
    platformConsole.listLocations(),
  ]);
  res.status(200).json({ ...ops, locations });
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
