const kanbanService = require('../services/kanbanService');
const { wrap } = require('./helpers');

exports.getBoard = wrap(async (req, res) => {
  const board = await kanbanService.getKanban(req.shopId, req.membership);
  res.status(200).json(board);
});

exports.moveOrder = wrap(async (req, res) => {
  const order = await kanbanService.moveOrder(
    req.shopId,
    req.params.orderId,
    req.membership,
    req.auth.userId,
    req.body || {}
  );
  res.status(200).json(order);
});
