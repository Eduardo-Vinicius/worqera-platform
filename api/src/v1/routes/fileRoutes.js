const express = require('express');
const fileController = require('../controllers/fileController');
const storageService = require('../services/storageService');
const { auth } = require('../middleware/auth');
const { shopContext } = require('../middleware/shopContext');
const { subscriptionGate } = require('../middleware/subscriptionGate');

const router = express.Router();
const guard = [auth, shopContext, subscriptionGate];

function fileKeyFromReq(req) {
  return String(req.params[0] || req.path || '').replace(/^\/+/, '');
}

/** Allow <img> loads via HMAC query (?exp=&sig=) without Bearer header. */
function optionalSignedFileAccess(req, res, next) {
  const key = fileKeyFromReq(req);
  if (key && storageService.verifyFileAccess(key, req.query.exp, req.query.sig)) {
    req.signedFileAccess = true;
    return next();
  }
  return next();
}

function requireAuthUnlessSigned(req, res, next) {
  if (req.signedFileAccess) return next();
  return auth(req, res, next);
}

function shopGateUnlessSigned(req, res, next) {
  if (req.signedFileAccess) return next();
  return shopContext(req, res, (err) => {
    if (err) return next(err);
    return subscriptionGate(req, res, next);
  });
}

// GET /api/v1/files/shops/.../foto-1.jpg
router.get(
  '/*',
  optionalSignedFileAccess,
  requireAuthUnlessSigned,
  shopGateUnlessSigned,
  fileController.getFile
);

module.exports = router;
