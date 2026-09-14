const dashboardService = require('../services/dashboardService');
const { wrap } = require('./helpers');

exports.summary = wrap(async (req, res) => {
  const summary = await dashboardService.getSummary(req.shopId);
  res.status(200).json(summary);
});

exports.dashboard = wrap(async (req, res) => {
  const data = await dashboardService.getDashboard(req.shopId, {
    userId: req.auth?.userId,
    email: req.auth?.email,
    role: req.membership?.role || req.auth?.role,
  });
  res.status(200).json(data);
});

exports.setores = wrap(async (req, res) => {
  const includeOrders = req.query.includeOrders === 'true' || req.query.orders === '1';
  const data = await dashboardService.getSetoresStats(req.shopId, { includeOrders });
  res.status(200).json(data);
});
