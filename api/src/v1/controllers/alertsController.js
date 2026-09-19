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

exports.inbox = wrap(async (req, res) => {
  const data = await alertsService.getOwnerInbox(req.shopId);
  res.status(200).json(data);
});

exports.feedback = wrap(async (req, res) => {
  const data = await alertsService.listFeedback(req.shopId, {
    period: req.query.period,
    page: req.query.page,
    limit: req.query.limit,
    score: req.query.score,
  });
  res.status(200).json(data);
});

exports.feedbackExportCsv = wrap(async (req, res) => {
  const result = await alertsService.exportFeedbackCsv(req.shopId, {
    period: req.query.period,
    score: req.query.score,
  });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
  res.status(200).send(result.csv);
});
