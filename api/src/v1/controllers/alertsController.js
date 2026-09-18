const alertsService = require('../services/alertsService');
const { wrap } = require('./helpers');

exports.listDelays = wrap(async (req, res) => {
  const alerts = await alertsService.listDelayAlerts(req.shopId);
  res.status(200).json(alerts);
});

exports.sendDigest = wrap(async (req, res) => {
  const result = await alertsService.sendDelayDigest(req.shopId);
  res.status(200).json(result);
});

exports.sendWeeklyDigest = wrap(async (req, res) => {
  const result = await alertsService.sendWeeklyDigest(req.shopId);
  res.status(200).json(result);
});
