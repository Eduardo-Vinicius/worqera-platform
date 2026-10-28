const productService = require('../services/productService');
const { wrap } = require('./helpers');

exports.list = wrap(async (req, res) => {
  const products = await productService.listProducts(req.shopId);
  res.status(200).json({ products });
});

exports.get = wrap(async (req, res) => {
  const product = await productService.getProduct(req.shopId, req.params.id);
  res.status(200).json({ product });
});

exports.create = wrap(async (req, res) => {
  const product = await productService.createProduct(req.shopId, req.body || {});
  res.status(201).json({ product });
});

exports.patch = wrap(async (req, res) => {
  const product = await productService.patchProduct(req.shopId, req.params.id, req.body || {});
  res.status(200).json({ product });
});

exports.remove = wrap(async (req, res) => {
  const result = await productService.deleteProduct(req.shopId, req.params.id);
  res.status(200).json(result);
});

exports.adjust = wrap(async (req, res) => {
  const product = await productService.adjustProduct(
    req.shopId,
    req.params.id,
    req.body || {},
    req.auth?.userId
  );
  res.status(200).json({ product });
});

exports.movements = wrap(async (req, res) => {
  const movements = await productService.listMovements(
    req.shopId,
    req.params.id,
    req.query.limit
  );
  res.status(200).json({ movements });
});

exports.report = wrap(async (req, res) => {
  const csv = await productService.reportCsv(req.shopId);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="estoque.csv"');
  res.status(200).send(csv);
});

const restock = () => require('../services/restockService');

exports.restock = wrap(async (req, res) => {
  res.status(200).json(await restock().restockReport(req.shopId));
});

exports.restockOrder = wrap(async (req, res) => {
  const product = await restock().orderRestock(req.shopId, req.params.id, req.body || {}, req.auth?.userId);
  res.status(200).json({ product });
});

exports.restockArrived = wrap(async (req, res) => {
  const product = await restock().restockArrived(req.shopId, req.params.id, req.body || {}, req.auth?.userId);
  res.status(200).json({ product });
});

exports.restockCancel = wrap(async (req, res) => {
  const product = await restock().cancelRestock(req.shopId, req.params.id);
  res.status(200).json({ product });
});

exports.summary = wrap(async (req, res) => {
  const summary = await productService.financeSnapshot(req.shopId);
  res.status(200).json({ summary });
});
