const billingService = require('../services/billingService');
const { wrap } = require('./helpers');
const { sendError } = require('../middleware/errors');

exports.getSubscription = wrap(async (req, res) => {
  const subscription = await billingService.getSubscription(req.shopId);
  res.status(200).json({
    subscription,
    enforced: process.env.NODE_ENV === 'production',
  });
});

exports.listProducts = wrap(async (_req, res) => {
  res.status(200).json({ products: billingService.listProducts() });
});

exports.createCheckoutSession = wrap(async (req, res) => {
  const User = require('../models/User');
  const owner = req.auth?.userId ? await User.findById(req.auth.userId).select('email').lean() : null;
  const session = await billingService.createCheckoutSession(req.shopId, req.body || {}, { ownerEmail: owner?.email });
  res.status(201).json(session);
});

exports.cancelSubscription = wrap(async (req, res) => {
  res.status(200).json({ subscription: await billingService.cancelSubscription(req.shopId) });
});

exports.asaasWebhook = wrap(async (req, res) => {
  if (!billingService.authorizeAsaasWebhook(req.headers['asaas-access-token'])) {
    return sendError(res, 401, { title: 'Unauthorized', detail: 'Invalid webhook token', code: 'UNAUTHORIZED' });
  }
  res.status(200).json(await billingService.handleAsaasWebhook(req.body || {}));
});

exports.completeCheckoutDev = wrap(async (req, res) => {
  const subscription = await billingService.completeCheckoutDev(req.shopId, req.body || {});
  res.status(200).json({ subscription });
});
