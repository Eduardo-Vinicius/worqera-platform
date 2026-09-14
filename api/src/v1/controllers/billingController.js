const billingService = require('../services/billingService');
const { wrap } = require('./helpers');
const { sendError } = require('../middleware/errors');

exports.getSubscription = wrap(async (req, res) => {
  const subscription = await billingService.getSubscription(req.shopId);
  res.status(200).json({ subscription });
});

exports.listProducts = wrap(async (_req, res) => {
  res.status(200).json({ products: billingService.listProducts() });
});

exports.createCheckoutSession = wrap(async (req, res) => {
  const session = await billingService.createCheckoutSession(req.shopId, req.body || {});
  res.status(201).json(session);
});

exports.completeCheckoutDev = wrap(async (req, res) => {
  const subscription = await billingService.completeCheckoutDev(req.shopId, req.body || {});
  res.status(200).json({ subscription });
});

exports.abacateWebhook = wrap(async (req, res) => {
  const secret = req.query.webhookSecret || req.query.secret;
  if (!billingService.verifyWebhookSecret(secret)) {
    return sendError(res, 401, {
      title: 'Unauthorized',
      detail: 'Invalid webhook secret',
      code: 'UNAUTHORIZED',
    });
  }
  const result = await billingService.handleAbacateWebhook(req.body || {});
  res.status(200).json(result);
});
