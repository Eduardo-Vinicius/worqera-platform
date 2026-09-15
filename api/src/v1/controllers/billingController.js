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
  const querySecret = req.query.webhookSecret || req.query.secret;
  const signature =
    req.headers['x-abacate-signature'] ||
    req.headers['x-worqera-signature'] ||
    req.headers['x-signature'];
  const rawBody =
    typeof req.rawBody === 'string'
      ? req.rawBody
      : Buffer.isBuffer(req.rawBody)
        ? req.rawBody.toString('utf8')
        : JSON.stringify(req.body || {});

  if (!billingService.authorizeWebhook({ querySecret, signatureHeader: signature, rawBody })) {
    return sendError(res, 401, {
      title: 'Unauthorized',
      detail: 'Invalid webhook signature or secret',
      code: 'UNAUTHORIZED',
    });
  }
  const result = await billingService.handleAbacateWebhook(req.body || {});
  res.status(200).json(result);
});
