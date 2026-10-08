const multer = require('multer');
const archiver = require('archiver');
const orderService = require('../services/orderService');
const pdfService = require('../services/pdfService');
const storageService = require('../services/storageService');
const { presentOrder } = require('../serializers');
const { wrap } = require('./helpers');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
});

exports.uploadPhotosMiddleware = (req, res, next) => {
  const handler = upload.fields([
    { name: 'photos', maxCount: 10 },
    { name: 'fotos', maxCount: 10 },
  ]);
  handler(req, res, (err) => {
    if (err) return next(err);
    const files = [...(req.files?.photos || []), ...(req.files?.fotos || [])];
    req.files = files;
    next();
  });
};

exports.list = wrap(async (req, res) => {
  const query = { ...req.query };
  if (req.membership?.role === 'sector') delete query.payment;
  const result = await orderService.listOrders(req.shopId, query);
  const data = result.data.map((order) => presentOrder(req, order));
  res.status(200).json({
    data,
    orders: data,
    nextToken: result.nextToken,
    count: result.count,
  });
});

exports.create = wrap(async (req, res) => {
  const order = await orderService.createOrder(req.shopId, req.auth.userId, req.body || {});
  const { buildOrderWhatsAppSuggest } = require('../services/whatsappSuggest');
  const whatsappSuggest = await buildOrderWhatsAppSuggest(req.shopId, order, {
    templateKey: 'created',
  }).catch(() => null);
  const emailNotify = order.emailNotify || null;
  res.status(201).json({
    ...presentOrder(req, order),
    whatsappSuggest: whatsappSuggest || undefined,
    emailNotify: emailNotify || undefined,
  });
});

exports.createDemo = wrap(async (req, res) => {
  const order = await orderService.createDemoOrder(req.shopId, req.auth.userId);
  res.status(201).json(presentOrder(req, order));
});

exports.exportCsv = wrap(async (req, res) => {
  const csv = await orderService.exportDeliveredOrdersCsv(req.shopId);
  const day = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="orders-delivered-${day}.csv"`);
  res.status(200).send(csv);
});

exports.get = wrap(async (req, res) => {
  const order = await orderService.getOrder(req.shopId, req.params.id);
  res.status(200).json(presentOrder(req, order));
});

exports.patch = wrap(async (req, res) => {
  const body = { ...(req.body || {}) };
  if (String(req.membership?.role || '').toLowerCase() === 'sector') {
    delete body.pricing;
    delete body.precoTotal;
    delete body.valorSinal;
    delete body.valorRestante;
    delete body.desconto;
    delete body.total;
    delete body.deposit;
    delete body.remaining;
    delete body.sendLaudo;
  }
  const order = await orderService.patchOrder(
    req.shopId,
    req.params.id,
    req.auth.userId,
    body
  );
  const emailNotify = order.emailNotify || null;
  const payload = presentOrder(req, order);
  if (emailNotify) payload.emailNotify = emailNotify;
  res.status(200).json(payload);
});

exports.patchItem = wrap(async (req, res) => {
  const order = await orderService.patchOrderItem(
    req.shopId,
    req.params.id,
    req.params.itemIndex,
    req.auth.userId,
    req.body || {}
  );
  res.status(200).json(presentOrder(req, order));
});

exports.addItem = wrap(async (req, res) => {
  const order = await orderService.addOrderItem(
    req.shopId,
    req.params.id,
    req.auth.userId,
    req.body || {}
  );
  res.status(201).json(presentOrder(req, order));
});

exports.deleteItem = wrap(async (req, res) => {
  const order = await orderService.deleteOrderItem(
    req.shopId,
    req.params.id,
    req.params.itemIndex,
    req.auth.userId
  );
  res.status(200).json(presentOrder(req, order));
});

exports.reopen = wrap(async (req, res) => {
  const order = await orderService.reopenOrder(
    req.shopId,
    req.params.id,
    req.auth.userId,
    req.body || {}
  );
  res.status(200).json(presentOrder(req, order));
});

exports.addComment = wrap(async (req, res) => {
  const order = await orderService.addOrderComment(
    req.shopId,
    req.params.id,
    req.auth.userId,
    req.body || {}
  );
  res.status(201).json(presentOrder(req, order));
});

exports.remove = wrap(async (req, res) => {
  const order = await orderService.deleteOrder(req.shopId, req.params.id, req.auth.userId);
  res.status(200).json(presentOrder(req, order));
});

exports.restore = wrap(async (req, res) => {
  const order = await orderService.restoreOrder(req.shopId, req.params.id, req.auth.userId);
  res.status(200).json(presentOrder(req, order));
});

exports.purge = wrap(async (req, res) => {
  const result = await orderService.purgeOrder(req.shopId, req.params.id);
  res.status(200).json(result);
});

exports.uploadPhotos = wrap(async (req, res) => {
  const order = await orderService.uploadItemPhotos(req.shopId, req.params.id, 0, req.files || []);
  res.status(200).json({
    success: true,
    order: presentOrder(req, order),
    photos: order.photos,
    urls: (order.photos || []).map((p) => p.url),
  });
});

exports.uploadItemPhotos = wrap(async (req, res) => {
  const order = await orderService.uploadItemPhotos(
    req.shopId,
    req.params.id,
    req.params.itemIndex,
    req.files || []
  );
  const serialized = presentOrder(req, order);
  const idx = Number(req.params.itemIndex);
  const itemPhotos = (order.items && order.items[idx] && order.items[idx].photos) || [];
  res.status(200).json({
    success: true,
    order: serialized,
    photos: itemPhotos,
    urls: itemPhotos.map((p) => (typeof p === 'string' ? p : p.url)).filter(Boolean),
  });
});

exports.deleteItemPhoto = wrap(async (req, res) => {
  const order = await orderService.deleteItemPhoto(
    req.shopId,
    req.params.id,
    req.params.itemIndex,
    req.params.photoIndex
  );
  const serialized = presentOrder(req, order);
  const idx = Number(req.params.itemIndex);
  const itemPhotos = (order.items && order.items[idx] && order.items[idx].photos) || [];
  res.status(200).json({
    success: true,
    order: serialized,
    photos: itemPhotos,
  });
});

exports.generatePdf = wrap(async (req, res) => {
  const result = await pdfService.generateOrderPdf(req.shopId, req.params.id);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
  if (result.url) res.setHeader('X-PDF-URL', result.url);
  if (result.key) res.setHeader('X-PDF-Key', result.key);
  res.status(200).send(result.buffer);
});

exports.listPdfs = wrap(async (req, res) => {
  await orderService.getOrder(req.shopId, req.params.id);
  const pdfs = await pdfService.listOrderPdfs(req.shopId, req.params.id);
  res.status(200).json({ pdfs, data: pdfs });
});

exports.notifyCreated = wrap(async (req, res) => {
  const result = await orderService.releaseCreatedEmail(req.shopId, req.params.id);
  res.status(200).json(result);
});

exports.resendEmail = wrap(async (req, res) => {
  const order = await orderService.getOrder(req.shopId, req.params.id);
  const Shop = require('../models/Shop');
  const shop = await Shop.findById(req.shopId).lean();
  const kind = String(req.body?.kind || 'created');
  const allowed = new Set(['created', 'moved', 'ready']);
  if (!allowed.has(kind)) {
    const err = new Error('Invalid email kind');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  const { enqueueNotifyOrderStatus } = require('../services/orderNotify');
  const emailNotify = await enqueueNotifyOrderStatus(shop, order, kind, {
    sectorName: undefined,
  });
  res.status(200).json({ ok: Boolean(emailNotify?.ok), emailNotify });
});

exports.zipPhotos = wrap(async (req, res) => {
  const order = await orderService.getOrder(req.shopId, req.params.id);
  const photos = Array.isArray(order.photos) ? order.photos : [];
  if (!photos.length) {
    const err = new Error('Order has no photos');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="pedido-${order.code}-fotos.zip"`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => {
    throw err;
  });
  archive.pipe(res);

  for (let i = 0; i < photos.length; i += 1) {
    const photo = photos[i];
    try {
      const { buffer } = await storageService.getBuffer(photo.key);
      const ext = (photo.key && photo.key.includes('.')) ? photo.key.slice(photo.key.lastIndexOf('.')) : '.jpg';
      archive.append(buffer, { name: `foto-${i + 1}${ext}` });
    } catch (_err) {
      // skip missing files
    }
  }

  await archive.finalize();
});

exports.publicByToken = wrap(async (req, res) => {
  const order = await orderService.getPublicOrderByToken(req.params.token);
  res.status(200).json(order);
});

exports.publicFeedbackByToken = wrap(async (req, res) => {
  const result = await orderService.submitPublicFeedbackByToken(req.params.token, {
    score: req.body?.score,
    comment: req.body?.comment,
    tags: req.body?.tags,
  });
  res.status(200).json(result);
});

exports.publicByCode = wrap(async (req, res) => {
  const shopSlug = req.params.shopSlug || req.query.shop || req.query.slug || null;
  const token = req.query.t || req.query.token || req.headers['x-public-token'] || null;
  const order = await orderService.getPublicOrderByCode(req.params.code, { shopSlug, token });
  res.status(200).json(order);
});

exports.publicFeedback = wrap(async (req, res) => {
  const shopSlug = req.params.shopSlug || req.body?.shopSlug || req.query.shop || null;
  const token = req.body?.t || req.body?.token || req.query.t || req.query.token || null;
  const result = await orderService.submitPublicFeedback(req.params.code, {
    shopSlug,
    token,
    score: req.body?.score,
    comment: req.body?.comment,
    tags: req.body?.tags,
  });
  res.status(200).json(result);
});
