const whatsappCloud = require('../services/whatsappCloud');
const { planHas } = require('../lib/planCap');
const { wrap } = require('./helpers');

function business(req) {
  return planHas(req.subscription, 'whatsapp');
}

function requireBusiness(req) {
  if (business(req)) return;
  const err = new Error('WhatsApp oficial faz parte do Business');
  err.status = 403;
  err.code = 'PLAN_REQUIRED';
  throw err;
}

exports.status = wrap(async (req, res) => {
  res.status(200).json(await whatsappCloud.statusFor(req.shopId, { business: business(req) }));
});

exports.connect = wrap(async (req, res) => {
  requireBusiness(req);
  res.status(200).json(await whatsappCloud.connectShop(req.shopId, req.body || {}));
});

exports.update = wrap(async (req, res) => {
  requireBusiness(req);
  res.status(200).json(await whatsappCloud.updateSettings(req.shopId, req.body || {}));
});

exports.disconnect = wrap(async (req, res) => {
  res.status(200).json(await whatsappCloud.disconnect(req.shopId));
});

exports.quoteFollowUp = wrap(async (req, res) => {
  requireBusiness(req);
  res.status(200).json(await whatsappCloud.sendQuoteFollowUp(req.shopId, req.params.id, req.auth?.userId));
});

/** GET /webhooks/whatsapp — Meta subscription check. */
exports.webhookVerify = (req, res) => {
  const { verifyToken } = whatsappCloud.metaEnv();
  if (
    req.query['hub.mode'] === 'subscribe' &&
    verifyToken &&
    req.query['hub.verify_token'] === verifyToken
  ) {
    return res.status(200).send(String(req.query['hub.challenge'] || ''));
  }
  return res.status(403).send('forbidden');
};

/** POST /webhooks/whatsapp — statuses, replies and account events. Always 200 fast. */
exports.webhookReceive = async (req, res) => {
  const raw = typeof req.rawBody === 'string' ? req.rawBody : JSON.stringify(req.body || {});
  if (!whatsappCloud.verifySignature(raw, req.get('x-hub-signature-256'))) {
    return res.status(401).send('bad signature');
  }
  res.status(200).send('ok');
  whatsappCloud.handleWebhook(req.body).catch((err) => {
    console.warn('[whatsapp] webhook failed', err?.message || err);
  });
  return undefined;
};

exports.platformUpdate = wrap(async (req, res) => {
  res.status(200).json(await whatsappCloud.platformUpdate(req.params.id, req.body || {}));
});
