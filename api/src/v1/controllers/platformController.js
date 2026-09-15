const platformService = require('../services/platformService');
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
