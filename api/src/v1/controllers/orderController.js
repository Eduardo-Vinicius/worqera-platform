const orderService = require('../services/orderService');
const { wrap } = require('./helpers');

exports.list = wrap(async (req, res) => {
  const orders = await orderService.listOrders(req.shopId, req.query);
  res.status(200).json({ orders });
});

exports.create = wrap(async (req, res) => {
  const order = await orderService.createOrder(req.shopId, req.auth.userId, req.body || {});
  res.status(201).json(order);
});

exports.get = wrap(async (req, res) => {
  const order = await orderService.getOrder(req.shopId, req.params.id);
  res.status(200).json(order);
});

exports.patch = wrap(async (req, res) => {
  const order = await orderService.patchOrder(
    req.shopId,
    req.params.id,
    req.auth.userId,
    req.body || {}
  );
  res.status(200).json(order);
});

exports.remove = wrap(async (req, res) => {
  const order = await orderService.deleteOrder(req.shopId, req.params.id);
  res.status(200).json(order);
});

exports.publicByCode = wrap(async (req, res) => {
  const order = await orderService.getPublicOrderByCode(req.params.code);
  res.status(200).json(order);
});
