const shopService = require('../services/shopService');
const inviteService = require('../services/inviteService');
const { wrap } = require('./helpers');
const { sendError } = require('../middleware/errors');
const multer = require('multer');

const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
});

exports.uploadLogoMiddleware = (req, res, next) => {
  const handler = logoUpload.single('logo');
  handler(req, res, (err) => {
    if (err) return next(err);
    next();
  });
};

exports.getCurrent = wrap(async (req, res) => {
  let shop = await shopService.getCurrentShop(req.shopId);
  if (shop && !shop.partnerCode) {
    shop = await shopService.ensurePartnerCode(req.shopId);
  }
  res.status(200).json(shop);
});

exports.patchCurrent = wrap(async (req, res) => {
  const shop = await shopService.patchCurrentShop(req.shopId, req.body || {});
  res.status(200).json(shop);
});

exports.uploadLogo = wrap(async (req, res) => {
  const shop = await shopService.uploadShopLogo(req.shopId, req.file);
  res.status(200).json(shop);
});

exports.seedCatalog = wrap(async (req, res) => {
  const result = await shopService.seedDefaultCatalog(req.shopId);
  res.status(200).json(result);
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

exports.resetMemberPassword = wrap(async (req, res) => {
  const result = await shopService.resetMemberPassword(
    req.shopId,
    req.params.id,
    req.body?.password
  );
  res.status(200).json(result);
});

exports.createInvite = wrap(async (req, res) => {
  const invite = await inviteService.createInvite(req.shopId, req.auth.userId, {
    ...(req.body || {}),
    appBaseUrl: req.body?.appBaseUrl || process.env.PUBLIC_WEB_URL,
  });
  res.status(201).json(invite);
});

exports.getInvite = wrap(async (req, res) => {
  const invite = await inviteService.getInviteByToken(req.params.token);
  res.status(200).json(invite);
});

exports.acceptInvite = wrap(async (req, res) => {
  const result = await inviteService.acceptInvite(req.params.token, req.body || {});
  res.status(200).json(result);
});
