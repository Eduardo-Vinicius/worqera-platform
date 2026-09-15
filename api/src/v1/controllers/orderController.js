const multer = require('multer');
const archiver = require('archiver');
const orderService = require('../services/orderService');
const pdfService = require('../services/pdfService');
const storageService = require('../services/storageService');
const { serializeOrder } = require('../serializers');
const { wrap } = require('./helpers');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
});

exports.uploadPhotosMiddleware = (req, res, next) => {
  const handler = upload.fields([
    { name: 'photos', maxCount: 8 },
    { name: 'fotos', maxCount: 8 },
  ]);
  handler(req, res, (err) => {
    if (err) return next(err);
    const files = [...(req.files?.photos || []), ...(req.files?.fotos || [])];
    req.files = files;
    next();
  });
};

exports.list = wrap(async (req, res) => {
  const result = await orderService.listOrders(req.shopId, req.query);
  const data = result.data.map(serializeOrder);
  res.status(200).json({
    data,
    orders: data,
    nextToken: result.nextToken,
    count: result.count,
  });
});

exports.create = wrap(async (req, res) => {
  const order = await orderService.createOrder(req.shopId, req.auth.userId, req.body || {});
  res.status(201).json(serializeOrder(order));
});

exports.get = wrap(async (req, res) => {
  const order = await orderService.getOrder(req.shopId, req.params.id);
  res.status(200).json(serializeOrder(order));
});

exports.patch = wrap(async (req, res) => {
  const order = await orderService.patchOrder(
    req.shopId,
    req.params.id,
    req.auth.userId,
    req.body || {}
  );
  res.status(200).json(serializeOrder(order));
});

exports.reopen = wrap(async (req, res) => {
  const order = await orderService.reopenOrder(
    req.shopId,
    req.params.id,
    req.auth.userId,
    req.body || {}
  );
  res.status(200).json(serializeOrder(order));
});

exports.addComment = wrap(async (req, res) => {
  const order = await orderService.addOrderComment(
    req.shopId,
    req.params.id,
    req.auth.userId,
    req.body || {}
  );
  res.status(201).json(serializeOrder(order));
});

exports.remove = wrap(async (req, res) => {
  const order = await orderService.deleteOrder(req.shopId, req.params.id);
  res.status(200).json(serializeOrder(order));
});

exports.uploadPhotos = wrap(async (req, res) => {
  const order = await orderService.uploadItemPhotos(req.shopId, req.params.id, 0, req.files || []);
  res.status(200).json({
    success: true,
    order: serializeOrder(order),
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
  const serialized = serializeOrder(order);
  const idx = Number(req.params.itemIndex);
  const itemPhotos = (order.items && order.items[idx] && order.items[idx].photos) || [];
  res.status(200).json({
    success: true,
    order: serialized,
    photos: itemPhotos,
    urls: itemPhotos.map((p) => (typeof p === 'string' ? p : p.url)).filter(Boolean),
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

exports.publicByCode = wrap(async (req, res) => {
  const shopSlug = req.params.shopSlug || req.query.shop || req.query.slug || null;
  const order = await orderService.getPublicOrderByCode(req.params.code, { shopSlug });
  res.status(200).json(order);
});
