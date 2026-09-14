const dashboardService = require('../services/dashboardService');
const { wrap } = require('./helpers');

exports.summary = wrap(async (req, res) => {
  const summary = await dashboardService.getSummary(req.shopId);
  res.status(200).json(summary);
});
