const shopService = require('../services/shopService');
const { wrap } = require('./helpers');
const { sendError } = require('../middleware/errors');

exports.getCurrent = wrap(async (req, res) => {
  const shop = await shopService.getCurrentShop(req.shopId);
  res.status(200).json(shop);
});

exports.patchCurrent = wrap(async (req, res) => {
  const shop = await shopService.patchCurrentShop(req.shopId, req.body || {});
  res.status(200).json(shop);
});

exports.listMembers = wrap(async (req, res) => {
  const members = await shopService.listMembers(req.shopId);
  res.status(200).json({ members });
});

exports.addMember = wrap(async (req, res) => {
  const member = await shopService.addMember(req.shopId, req.body || {});
  res.status(201).json(member);
});

exports.patchMember = wrap(async (req, res) => {
  if (!req.params.id) {
    return sendError(res, 400, { detail: 'Member id required', code: 'VALIDATION_ERROR' });
  }
  const member = await shopService.patchMember(req.shopId, req.params.id, req.body || {});
  res.status(200).json(member);
});
